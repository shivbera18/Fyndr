import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import Upload_Img, { MAX_PREVIEWS, UPLOAD_BATCH_SIZE } from "../Upload_Img";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Upload_Img component memory safety and batching", () => {
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

    mockedAxios.isCancel = jest.fn().mockReturnValue(false) as unknown as typeof axios.isCancel;
    mockedAxios.isAxiosError = jest.fn().mockReturnValue(false) as unknown as typeof axios.isAxiosError;
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
    const axiosError = {
      isAxiosError: true,
      response: { data: { message: "Network connection dropped" } },
    };
    mockedAxios.post
      .mockResolvedValueOnce({ status: 200, data: [] })
      .mockRejectedValueOnce(axiosError);
    mockedAxios.isAxiosError = jest.fn((err: unknown): err is typeof axiosError => err === axiosError) as unknown as typeof axios.isAxiosError;
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
});
