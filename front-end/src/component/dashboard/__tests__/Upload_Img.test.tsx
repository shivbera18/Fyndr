import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import Upload_Img, { MAX_PREVIEWS, UPLOAD_BATCH_SIZE, UPLOAD_BATCH_BYTE_BUDGET, UPLOAD_MAX_ATTEMPTS, buildByteBudgetedBatches } from "../Upload_Img";

jest.mock("axios", () => {
  return {
    __esModule: true,
    default: {
      post: jest.fn(),
      isCancel: jest.fn(() => false),
      isAxiosError: jest.fn((err: unknown): boolean => Boolean(err && typeof err === "object" && "isAxiosError" in err)),
    },
    post: jest.fn(),
    isCancel: jest.fn(() => false),
    isAxiosError: jest.fn((err: unknown): boolean => Boolean(err && typeof err === "object" && "isAxiosError" in err)),
  };
});
const mockedAxios = axios as unknown as { post: jest.Mock; isCancel: jest.Mock; isAxiosError: jest.Mock };
describe("Upload_Img component memory safety and batching", () => {
  jest.setTimeout(25000);
  let createdUrls: string[] = [];
  let revokedUrls: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    createdUrls = [];
    revokedUrls = [];

    window.URL.createObjectURL = jest.fn((file: File) => {
      const url = `blob:mock-preview-${file.name}-${Math.random()}`;
      createdUrls.push(url);
      return url;
    });

    window.URL.revokeObjectURL = jest.fn((url: string) => {
      revokedUrls.push(url);
    });
    mockedAxios.isCancel.mockReturnValue(false);
    mockedAxios.isAxiosError.mockImplementation((err: unknown): boolean => Boolean(err && typeof err === "object" && "isAxiosError" in err));
    localStorage.setItem("user", JSON.stringify({ _id: "usr_photographer_123" }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  const createDummyFiles = (count: number): File[] => {
    return Array.from({ length: count }, (_, i) => {
      return new File([`content-${i}`], `photo-${i + 1}.jpg`, { type: "image/jpeg" });
    });
  };

  test("renders upload dropzone with memory-safe description", () => {
    render(<Upload_Img event_id="evt_test_1" />);
    expect(screen.getByText("Upload event photos")).toBeInTheDocument();
    expect(screen.getByText(/Batched memory-safe uploads for large albums/i)).toBeInTheDocument();
  });

  const createSizedFiles = (sizes: number[]): File[] => {
    return sizes.map((size, i) => {
      const file = new File(["x"], `sized-${i + 1}.jpg`, { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: size, configurable: true });
      return file;
    });
  };
  test("surfaces the first per-file error when the server returns a 422 array", async () => {
    const arrayError = [{ file: "a.jpg", error: "ML inference timed out", status: "failed" }];
    mockedAxios.post.mockRejectedValueOnce(
      Object.assign(new Error("Request failed with status code 422"), {
        isAxiosError: true,
        code: "ERR_BAD_REQUEST",
        response: { status: 422, data: arrayError },
      })
    );

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(3) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 3 photos/i }));

    expect(await screen.findByText(/Upload failed: ML inference timed out/i)).toBeInTheDocument();
  });

  test("ignores file drops while an upload is in flight", async () => {
    let resolvePost: (value: unknown) => void = () => {};
    mockedAxios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(5) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 5 photos/i }));

    await screen.findByRole("button", { name: /Cancel upload/i });
    const label = container.querySelector("label[for='album-file-input']") as HTMLElement;
    expect(label.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(/drop is paused/i)).toBeInTheDocument();
    resolvePost({ status: 200, data: [] });
  });

  test("clamps active object URL previews to MAX_PREVIEWS when many files are selected", () => {
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    // Simulate selecting 30 photos (more than MAX_PREVIEWS = 12)
    const files = createDummyFiles(30);
    fireEvent.change(input, { target: { files } });

    expect(screen.getByText(/30 photos queued/i)).toBeInTheDocument();
    // Verify only MAX_PREVIEWS (12) object URLs were created
    expect(createdUrls.length).toBe(MAX_PREVIEWS);
    // Verify remaining count indicator
    expect(screen.getByText(`+${30 - MAX_PREVIEWS}`)).toBeInTheDocument();
    expect(screen.getByText(/RAM protected/i)).toBeInTheDocument();
  });

  test("revokes object URL when a file is removed", () => {
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(5);
    fireEvent.change(input, { target: { files } });

    expect(createdUrls.length).toBe(5);
    expect(screen.getByText(/5 photos queued/i)).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: `Remove ${files[0].name}` });
    fireEvent.click(removeBtn);

    expect(screen.getByText(/4 photos queued/i)).toBeInTheDocument();
    expect(revokedUrls.length).toBe(1);
  });

  test("clearAll revokes all created preview URLs and empties queue", () => {
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(10);
    fireEvent.change(input, { target: { files } });

    expect(createdUrls.length).toBe(10);

    const clearBtn = screen.getByRole("button", { name: "Clear all" });
    fireEvent.click(clearBtn);

    expect(screen.queryByText(/photos queued/i)).not.toBeInTheDocument();
    expect(revokedUrls.length).toBe(10);
  });

  test("uploads in safe batches of UPLOAD_BATCH_SIZE (15) and notifies refresh", async () => {
    const dRefMock = jest.fn();
    mockedAxios.post.mockResolvedValue({ status: 200, data: [] });

    const { container } = render(<Upload_Img event_id="evt_test_1" d_ref={dRefMock} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    // 35 files => 3 batches (15, 15, 5)
    const files = createDummyFiles(35);
    fireEvent.change(input, { target: { files } });

    const uploadBtn = screen.getByRole("button", { name: /Upload 35 photos/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(Math.ceil(35 / UPLOAD_BATCH_SIZE));
    });

    expect(await screen.findByText(/Successfully uploaded 35 photos/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(dRefMock).toHaveBeenCalled();
    });
  });

  test("handles partial batch failure gracefully and preserves remaining files for retry", async () => {
    // ponytail: realistic fatal shape — HTTP 422 with response (no retry), not a response-less network drop.
    const axiosError = Object.assign(new Error("Request failed with status code 422"), {
      isAxiosError: true,
      code: "ERR_BAD_REQUEST",
      response: { status: 422, data: { message: "All files in batch failed validation" } },
    });
    mockedAxios.post
      .mockResolvedValueOnce({ status: 200, data: [] })
      .mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError.mockImplementation((err: unknown): boolean => err === axiosError);
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    // 25 files => Batch 1 (15), Batch 2 (10)
    const files = createDummyFiles(25);
    fireEvent.change(input, { target: { files } });

    const uploadBtn = screen.getByRole("button", { name: /Upload 25 photos/i });
    fireEvent.click(uploadBtn);

    expect(await screen.findByText(/Uploaded 15 of 25 photos\. Batch failed/i)).toBeInTheDocument();
    // 10 remaining files stay queued for retry
    expect(screen.getByText(/10 photos queued/i)).toBeInTheDocument();
  });
  test("supports cancelling an upload in progress", async () => {
    // Delay the post request to keep upload in progress
    let resolvePost: (value: unknown) => void = () => {};
    mockedAxios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(20);
    fireEvent.change(input, { target: { files } });

    const uploadBtn = screen.getByRole("button", { name: /Upload 20 photos/i });
    fireEvent.click(uploadBtn);

    const cancelBtn = await screen.findByRole("button", { name: /Cancel upload/i });
    fireEvent.click(cancelBtn);

    expect(await screen.findByText(/Upload cancelled/i)).toBeInTheDocument();
    expect(screen.queryByText(/AI indexing started/i)).not.toBeInTheDocument();
    resolvePost({ status: 200, data: [] });
  });

  test("treats HTTP 207 Multi-Status as a batch failure", async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 207, data: [{ error: "dedupe duplicate" }] });

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(15);
    fireEvent.change(input, { target: { files } });

    const uploadBtn = screen.getByRole("button", { name: /Upload 15 photos/i });
    fireEvent.click(uploadBtn);

    expect(await screen.findByText(/Some photos in this batch failed to process/i)).toBeInTheDocument();
  });

  test("splits DSLR-size photos by byte budget, not just count", () => {
    const elevenMB = 11.5 * 1024 * 1024;
    const files = createSizedFiles(Array.from({ length: 15 }, () => elevenMB));
    const items = files.map((file, i) => ({ file, preview: "", id: `byte-${i}` }));
    const batches = buildByteBudgetedBatches(items);
    // 15 x 11.5MB = ~172MB must NOT ship as one POST under the 75MB budget
    expect(batches.length).toBeGreaterThan(1);
    batches.forEach((b) => {
      expect(b.length).toBeLessThanOrEqual(UPLOAD_BATCH_SIZE);
      const bytes = b.reduce((sum, it) => sum + it.file.size, 0);
      expect(bytes).toBeLessThanOrEqual(UPLOAD_BATCH_BYTE_BUDGET);
    });
    const total = batches.flat().length;
    expect(total).toBe(15);
  });

  test("retries a transient network blip within the same batch and then succeeds", async () => {
    const blip = Object.assign(new Error("Network Error"), {
      isAxiosError: true,
      code: "ERR_NETWORK",
    });
    mockedAxios.post.mockRejectedValueOnce(blip);
    mockedAxios.post.mockResolvedValue({ status: 200, data: [] });

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(5);
    fireEvent.change(input, { target: { files } });

    fireEvent.click(screen.getByRole("button", { name: /Upload 5 photos/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/Successfully uploaded 5 photos/i)).toBeInTheDocument();
  });

  test("gives up after max attempts on a persistently failing batch", async () => {
    const down = Object.assign(new Error("Network Error"), {
      isAxiosError: true,
      code: "ERR_NETWORK",
    });
    mockedAxios.post.mockRejectedValue(down);
    mockedAxios.isAxiosError.mockImplementation((err: unknown): boolean => err === down);

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(5);
    fireEvent.change(input, { target: { files } });

    fireEvent.click(screen.getByRole("button", { name: /Upload 5 photos/i }));

    // First retry delay is 0ms but wall-clock sleeps still apply; allow real backoff to elapse.
    expect(await screen.findByText(/Upload failed: Network Error/i, {}, { timeout: 15000 })).toBeInTheDocument();
    expect(mockedAxios.post).toHaveBeenCalledTimes(UPLOAD_MAX_ATTEMPTS);
  });
});
