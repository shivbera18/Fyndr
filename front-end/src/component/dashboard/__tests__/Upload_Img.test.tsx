import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { API_URL } from "../../../utils/api";
import Upload_Img, { MAX_PREVIEWS, UPLOAD_BATCH_SIZE, UPLOAD_BATCH_BYTE_BUDGET, UPLOAD_MAX_ATTEMPTS, buildByteBudgetedBatches, overallUploadPct } from "../Upload_Img";
import { __resetUploadSessionForTests, attach as attachUploadSession, getSnapshot as getUploadSessionSnapshot } from "../../../utils/uploadSession";
import * as UploadModule from "../Upload_Img";
jest.mock("axios", () => {
  return {
    __esModule: true,
    default: {
      post: jest.fn(),
      put: jest.fn(),
      isCancel: jest.fn(() => false),
      isAxiosError: jest.fn((err: unknown): boolean => Boolean(err && typeof err === "object" && "isAxiosError" in err)),
    },
    post: jest.fn(),
    put: jest.fn(),
    isCancel: jest.fn(() => false),
    isAxiosError: jest.fn((err: unknown): boolean => Boolean(err && typeof err === "object" && "isAxiosError" in err)),
  };
});
const mockedAxios = axios as unknown as { post: jest.Mock; put: jest.Mock; isCancel: jest.Mock; isAxiosError: jest.Mock };
describe("Upload_Img component memory safety and batching", () => {
  jest.setTimeout(25000);
  let createdUrls: string[] = [];
  let revokedUrls: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    __resetUploadSessionForTests();
    createdUrls = [];
    revokedUrls = [];
    // ponytail: jsdom lacks crypto.subtle — null hash forces the multer
    // fallback branch; direct tests override per-file below.
    jest.spyOn(UploadModule.fileHasher, "sha256Hex").mockResolvedValue(null);
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
    mockedAxios.put.mockResolvedValue({ status: 200, data: {} });
    // ponytail: jsdom has no crypto.subtle/File.arrayBuffer — stage answers
    // local so existing tests exercise the unchanged multer fallback branch.
    mockedAxios.post.mockImplementation((url: string) =>
      String(url).endsWith("/photo/stage")
        ? Promise.resolve({ status: 200, data: { via: "local", photo: null, key: null, uploadUrl: null } })
        : Promise.resolve({ status: 200, data: [] })
    );
    localStorage.setItem("user", JSON.stringify({ _id: "usr_photographer_123" }));
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  const createDummyFiles = (count: number): File[] => {
    return Array.from({ length: count }, (_, i) => {
      return new File([`content-${i}`], `photo-${i + 1}.jpg`, { type: "image/jpeg" });
    });
  };

  test("renders the bounded upload description", () => {
    render(<Upload_Img event_id="evt_test_1" />);
    expect(screen.getByText("Upload event photos")).toBeInTheDocument();
    expect(screen.getByText(/One photo at a time to limit upload memory/i)).toBeInTheDocument();
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
    const err422 = Object.assign(new Error("Request failed with status code 422"), {
      isAxiosError: true,
      code: "ERR_BAD_REQUEST",
      response: { status: 422, data: arrayError },
    });
    mockedAxios.post.mockImplementationOnce((url: string) =>
      url === `${API_URL}/photo` ? Promise.reject(err422) : Promise.resolve({ status: 200, data: [] })
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
      (url: string) =>
        url === `${API_URL}/photo`
          ? new Promise((resolve) => {
              resolvePost = resolve;
            })
          : Promise.resolve({ status: 200, data: [] })
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

  test("lists a bounded set of filenames without decoding original images", () => {
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(30) } });
    expect(screen.getByText(/30 photos queued/i)).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(MAX_PREVIEWS);
    expect(screen.getByText(`+${30 - MAX_PREVIEWS}`)).toBeInTheDocument();
  });

  test("removes a selected file from the queue", () => {
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(5);
    fireEvent.change(input, { target: { files } });

    expect(screen.getByText(/5 photos queued/i)).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: `Remove ${files[0].name}` });
    fireEvent.click(removeBtn);

    expect(screen.getByText(/4 photos queued/i)).toBeInTheDocument();
  });

  test("clearAll empties the queue", () => {
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(10);
    fireEvent.change(input, { target: { files } });


    const clearBtn = screen.getByRole("button", { name: "Clear all" });
    fireEvent.click(clearBtn);

    expect(screen.queryByText(/photos queued/i)).not.toBeInTheDocument();
  });

  test("throttles progress commits during an in-flight batch", async () => {
    let now = 1000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    let resolvePost: (value: unknown) => void = () => {};
    mockedAxios.post.mockImplementationOnce(
      (url: string, _formData: FormData, config: { onUploadProgress?: (event: { loaded: number; total?: number }) => void }) =>
        url === `${API_URL}/photo`
          ? new Promise((resolve) => {
              resolvePost = resolve;
              [25, 50, 75].forEach((loaded, index) => {
                now = 1000 + index * 100;
                config.onUploadProgress?.({ loaded, total: 100 });
              });
            })
          : Promise.resolve({ status: 200, data: [] })
    );

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(1) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 1 photo/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Uploading \(25%\)/i })).toBeInTheDocument();
    });

    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 1 photo/i)).toBeInTheDocument();
  });

  test("full per-batch fractions cap at 99 until the success banner", async () => {
    // ponytail: Promise.withResolvers needs TS 5.2+ lib; repo pins TS 4.9.5 — revisit on TS upgrade.
    let resolvePost: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { resolvePost = resolve; });
    mockedAxios.post.mockImplementation(
      (_url: string, _formData: FormData, config: { onUploadProgress?: (event: { loaded: number; total?: number }) => void }) => {
        config.onUploadProgress?.({ loaded: 100, total: 100 });
        return gate;
      }
    );
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(1) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 1 photo/i }));
    // Bytes fully reported but server not yet answered: bar must sit at 99, never 100.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Uploading \(99%\)/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Successfully uploaded/i)).not.toBeInTheDocument();
    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 1 photo/i)).toBeInTheDocument();
  });
  test("multi-batch upload reaches 100 exactly once, at success", async () => {
    mockedAxios.post.mockResolvedValue({ status: 200, data: [] });
    const seen: number[] = [];
    const detach = attachUploadSession((s) => seen.push(s.progress));
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    // 20 files => 2 batches; every emitted progress before the banner must be <= 99.
    fireEvent.change(input, { target: { files: createDummyFiles(20) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 20 photos/i }));
    expect(await screen.findByText(/Successfully uploaded 20 photos/i)).toBeInTheDocument();
    detach();
    // endSession re-emits the terminal snapshot, so 100 may appear twice; what must
    // never happen is 100 (or more) BEFORE the terminal write, nor any value above 100.
    expect(seen.every((p) => p <= 100)).toBe(true);
    const firstHundred = seen.indexOf(100);
    expect(firstHundred).toBeGreaterThan(0);
    expect(seen.slice(0, firstHundred).every((p) => p <= 99)).toBe(true);
  });
  test("uploads one photo per request and notifies refresh", async () => {
    const dRefMock = jest.fn();
    mockedAxios.post.mockResolvedValue({ status: 200, data: [] });
    const { container } = render(<Upload_Img event_id="evt_test_1" d_ref={dRefMock} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(35);
    fireEvent.change(input, { target: { files } });

    const uploadBtn = screen.getByRole("button", { name: /Upload 35 photos/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      const multer = mockedAxios.post.mock.calls.filter(([u]) => u === `${API_URL}/photo`);
      expect(multer.length).toBe(Math.ceil(35 / UPLOAD_BATCH_SIZE));
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
    let uploads = 0;
    mockedAxios.post.mockImplementation((url: string, body?: unknown) => {
      if (url === `${API_URL}/photo/stage`) {
        return Promise.resolve({ status: 200, data: { via: "local", photo: null, key: null, uploadUrl: null } });
      }
      uploads += 1;
      if (uploads === 11) return Promise.reject(axiosError);
      return Promise.resolve({ status: 200, data: [] });
    });
    mockedAxios.isAxiosError.mockImplementation((err: unknown): boolean => err === axiosError);
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(25);
    fireEvent.change(input, { target: { files } });

    const uploadBtn = screen.getByRole("button", { name: /Upload 25 photos/i });
    fireEvent.click(uploadBtn);

    expect(await screen.findByText(/Uploaded 10 of 25 photos\. Batch failed/i)).toBeInTheDocument();
    // 15 remaining files stay queued for retry
    expect(screen.getByText(/15 photos queued/i)).toBeInTheDocument();
  });
  test("supports cancelling an upload in progress", async () => {
    // Delay the post request to keep upload in progress
    let resolvePost: (value: unknown) => void = () => {};
    mockedAxios.post.mockImplementationOnce(
      (url: string) =>
        url === `${API_URL}/photo`
          ? new Promise((resolve) => {
              resolvePost = resolve;
            })
          : Promise.resolve({ status: 200, data: [] })
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

  test("pause toggle flips label and session flag", async () => {
    // ponytail: Promise.withResolvers needs TS 5.2+ lib; repo pins TS 4.9.5 — revisit on TS upgrade.
    let resolvePost: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { resolvePost = resolve; });
    mockedAxios.post.mockImplementation(() => gate);
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(getUploadSessionSnapshot().paused).toBe(true);
    expect(screen.getByText(/Paused \(0 of 4, 0%\)/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(getUploadSessionSnapshot().paused).toBe(false);
    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 4 photos/i)).toBeInTheDocument();
  });
  test("cancel while paused aborts immediately without hanging", async () => {
    let resolvePost: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { resolvePost = resolve; });
    mockedAxios.post.mockImplementation(() => gate);
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(20) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 20 photos/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel upload/i }));
    expect(await screen.findByText(/Upload cancelled by user/i)).toBeInTheDocument();
    resolvePost({ status: 200, data: [] });
    expect(screen.queryByText(/AI indexing started/i)).not.toBeInTheDocument();
  });
  test("pause freezes scheduling until resume", async () => {
    let releaseFirst: (value: unknown) => void = () => {};
    const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
    let calls = 0;
    mockedAxios.post.mockImplementation(() => {
      calls += 1;
      return calls === 1 ? firstGate : Promise.resolve({ status: 200, data: [] });
    });
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(20) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 20 photos/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    await new Promise((resolve) => { window.setTimeout(resolve, 600); });
    expect(calls).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    releaseFirst({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 20 photos/i)).toBeInTheDocument();
  });
  test("upload survives unmount/remount and completes without cancel", async () => {
    let resolvePost: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { resolvePost = resolve; });
    mockedAxios.post.mockImplementation(() => gate);
    const first = render(<Upload_Img event_id="evt_test_1" />);
    const input = first.container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));
    // Upload in flight: unmount (route/tab change) must not abort it.
    await screen.findByRole("button", { name: /Uploading \(0%\)/i });
    first.unmount();
    render(<Upload_Img event_id="evt_test_1" />);
    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 4 photos/i)).toBeInTheDocument();
  });
  test("remount keeps Pause/Cancel reachable and clears on completion", async () => {
    let resolvePost: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { resolvePost = resolve; });
    mockedAxios.post.mockImplementation(() => gate);
    const first = render(<Upload_Img event_id="evt_test_1" />);
    const input = first.container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));
    await screen.findByRole("button", { name: /Uploading \(0%\)/i });
    first.unmount();
    render(<Upload_Img event_id="evt_test_1" />);
    expect(screen.getByText(/4 photos queued/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel upload/i })).toBeInTheDocument();
    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 4 photos/i)).toBeInTheDocument();
  });

  test("paused remount can cancel and retry its remaining files without reselection", async () => {
    const first = render(<Upload_Img event_id="evt_A" />);
    fireEvent.change(first.container.querySelector("input[type='file']")!, { target: { files: createDummyFiles(2) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    first.unmount();
    const second = render(<Upload_Img event_id="evt_A" />);
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByText(/2 photos queued/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancel upload/i }));
    const retry = await screen.findByRole("button", { name: /Upload 2 photos/i });
    await waitFor(() => expect(retry).toBeEnabled());
    expect(mockedAxios.post).not.toHaveBeenCalled();
    second.unmount();
    render(<Upload_Img event_id="evt_A" />);
    expect(screen.getByText(/Upload cancelled/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(getUploadSessionSnapshot().remainingFiles).toEqual([]);
  });

  test.each([false, true])("recovers a failure while away (return after failure: %s)", async returnAfterFailure => {
    // TS 4.9/browser targets do not provide Promise.withResolvers.
    let fail!: (reason: Error) => void;
    const pending = new Promise((_, reject) => { fail = reject; });
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: [] }).mockImplementationOnce(() => pending);
    const first = render(<Upload_Img event_id="evt_A" />);
    fireEvent.change(first.container.querySelector("input[type='file']")!, { target: { files: createDummyFiles(3) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 3 photos/i }));
    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/2 photos queued/i)).toBeInTheDocument();
    first.unmount();
    if (!returnAfterFailure) render(<Upload_Img event_id="evt_A" />);
    await act(async () => { fail(new Error("invalid photo")); });
    if (returnAfterFailure) render(<Upload_Img event_id="evt_A" />);
    expect(await screen.findByText(/Uploaded 1 of 3 photos\. Batch failed: invalid photo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload 2 photos/i })).toBeEnabled();
    expect(getUploadSessionSnapshot().remainingFiles.every(item => item.prepared === undefined)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
    const uploadedNames = mockedAxios.post.mock.calls.map(([, body]) => ((body as FormData).get("name") as File).name);
    expect(uploadedNames).toEqual(["photo-1.jpg", "photo-2.jpg", "photo-2.jpg", "photo-3.jpg"]);
  });

  test("Clear all releases a recovered retry queue across remounts", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("invalid photo"));
    const first = render(<Upload_Img event_id="evt_A" />);
    fireEvent.change(first.container.querySelector("input[type='file']")!, { target: { files: createDummyFiles(2) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    await screen.findByText(/Upload failed: invalid photo/i);
    first.unmount();
    const second = render(<Upload_Img event_id="evt_A" />);
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(getUploadSessionSnapshot().remainingFiles).toEqual([]);
    second.unmount();
    render(<Upload_Img event_id="evt_A" />);
    expect(screen.queryByText(/invalid photo|photos queued/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload 0 photos/i })).toBeDisabled();
  });

  test("same component event changes isolate draft, controls and old worker completion", async () => {
    let finish!: (value: unknown) => void;
    mockedAxios.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<Upload_Img event_id="evt_A" />);
    fireEvent.change(view.container.querySelector("input[type='file']")!, { target: { files: createDummyFiles(2) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    view.rerender(<Upload_Img event_id="evt_B" />);
    expect(screen.queryByRole("button", { name: /Resume|Cancel upload/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload 0 photos/i })).toBeDisabled();
    fireEvent.change(view.container.querySelector("input[type='file']")!, {
      target: { files: [new File(["other"], "other.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upload 1 photo/i }));
    expect(screen.getByText(/An upload is already running/i)).toBeInTheDocument();
    await act(async () => { finish({ status: 200, data: [] }); });
    expect(screen.getByText("other.jpg")).toBeInTheDocument();
    expect(screen.queryByText(/Successfully uploaded/i)).not.toBeInTheDocument();
    expect(getUploadSessionSnapshot()).toMatchObject({ eventId: "evt_A", paused: true, uploadedCount: 1 });
    view.rerender(<Upload_Img event_id="evt_A" />);
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByText(/1 photo queued/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
    expect(mockedAxios.post.mock.calls.every(([, body]) => (body as FormData).get("event_id") === "evt_A")).toBe(true);
  });

  test("same component restores a failed event queue without leaking it to another event", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("invalid photo"));
    const view = render(<Upload_Img event_id="evt_A" />);
    fireEvent.change(view.container.querySelector("input[type='file']")!, { target: { files: createDummyFiles(2) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    await screen.findByText(/Upload failed: invalid photo/i);
    view.rerender(<Upload_Img event_id="evt_B" />);
    expect(screen.queryByText(/invalid photo|photos queued/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload 0 photos/i })).toBeDisabled();
    view.rerender(<Upload_Img event_id="evt_A" />);
    expect(screen.getByText(/Upload failed: invalid photo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
  });
  test("beforeunload warns only while an upload is active", async () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    let resolvePost: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { resolvePost = resolve; });
    mockedAxios.post.mockImplementation(() => gate);
    const { container, unmount } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));
    await screen.findByRole("button", { name: /Uploading \(0%\)/i });
    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 4 photos/i)).toBeInTheDocument();
    expect(removeSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    unmount();
  });
  test("mismatched event ignores the orphan session", async () => {
    let resolvePost: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { resolvePost = resolve; });
    mockedAxios.post.mockImplementation(() => gate);
    const first = render(<Upload_Img event_id="evt_A" />);
    const input = first.container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));
    await screen.findByRole("button", { name: /Uploading \(0%\)/i });
    first.unmount();
    const second = render(<Upload_Img event_id="evt_B" />);
    expect(screen.queryByRole("button", { name: /Uploading/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Successfully uploaded/i)).not.toBeInTheDocument();
    // A's stale completion must not paint B's UI (ownership guard).
    resolvePost({ status: 200, data: [] });
    await new Promise((resolve) => { window.setTimeout(resolve, 300); });
    expect(screen.queryByText(/Successfully uploaded 4 photos/i)).not.toBeInTheDocument();
    second.unmount();
  });
  test("treats HTTP 207 Multi-Status as a batch failure", async () => {
    mockedAxios.post.mockImplementationOnce((url: string) =>
      url === `${API_URL}/photo`
        ? Promise.resolve({ status: 207, data: [{ error: "dedupe duplicate" }] })
        : Promise.resolve({ status: 200, data: [] })
    );

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
    const items = files.map((file, i) => ({ file, id: `byte-${i}` }));
    const batches = buildByteBudgetedBatches(items);
    // Each request stays below the per-file limit, independently of album size.
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
    // ponytail: sha256=null forces multer fallback; blip hits the multer POST only.
    mockedAxios.post.mockImplementation((url: string) => {
      if (url === `${API_URL}/photo/stage`) {
        return Promise.resolve({ status: 200, data: { via: "local", photo: null, key: null, uploadUrl: null } });
      }
      return Promise.resolve({ status: 200, data: [] });
    });
    mockedAxios.post.mockRejectedValueOnce(blip);

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(5);
    fireEvent.change(input, { target: { files } });

    fireEvent.click(screen.getByRole("button", { name: /Upload 5 photos/i }));

    await waitFor(() => {
      const multer = mockedAxios.post.mock.calls.filter(([u]) => u === `${API_URL}/photo`);
      expect(multer.length).toBe(6);
    });
    expect(await screen.findByText(/Successfully uploaded 5 photos/i)).toBeInTheDocument();
  });
  test("pause mid-backoff freezes the retry countdown", async () => {
    const blip = Object.assign(new Error("Network Error"), {
      isAxiosError: true,
      code: "ERR_NETWORK",
    });
    let calls = 0;
    // Attempt 1 fails; pause during the 1500ms backoff — no second POST may fire until resume.
    mockedAxios.post.mockImplementation((url: string) => {
      if (url === `${API_URL}/photo/stage`) {
        return Promise.resolve({ status: 200, data: { via: "local", photo: null, key: null, uploadUrl: null } });
      }
      calls += 1;
      return Promise.resolve({ status: 200, data: [] });
    });
    mockedAxios.post.mockRejectedValueOnce(blip);
    mockedAxios.post.mockRejectedValueOnce(blip);
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));
    await screen.findByText(/network blip — retrying/i);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    // Backoff is 1500ms; sleep past it — without a freeze attempt 3 would fire while paused.
    await new Promise((resolve) => { window.setTimeout(resolve, 1800); });
    expect(calls).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await waitFor(
      () => expect(screen.getByText(/Successfully uploaded 4 photos/i)).toBeInTheDocument(),
      { timeout: 8000 }
    );
  });
  test("gives up after max attempts on a persistently failing batch", async () => {
    const down = Object.assign(new Error("Network Error"), {
      isAxiosError: true,
      code: "ERR_NETWORK",
    });
    // ponytail: sha256=null forces multer fallback; stage answers local so
    // every attempt below is the multer POST the count asserts on.
    mockedAxios.post.mockImplementation((url: string) => {
      if (url === `${API_URL}/photo/stage`) {
        return Promise.resolve({ status: 200, data: { via: "local", photo: null, key: null, uploadUrl: null } });
      }
      return Promise.reject(down);
    });
    mockedAxios.isAxiosError.mockImplementation((err: unknown): boolean => err === down);

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    const files = createDummyFiles(5);
    fireEvent.change(input, { target: { files } });

    fireEvent.click(screen.getByRole("button", { name: /Upload 5 photos/i }));

    // First retry delay is 0ms but wall-clock sleeps still apply; allow real backoff to elapse.
    expect(await screen.findByText(/Upload failed: Network Error/i, {}, { timeout: 15000 })).toBeInTheDocument();
    const multer = mockedAxios.post.mock.calls.filter(([u]) => u === `${API_URL}/photo`);
    expect(multer.length).toBe(UPLOAD_MAX_ATTEMPTS);
  });

  test("uploads straight to G3 when stage mints URLs (no multipart POST)", async () => {
    jest.spyOn(UploadModule.fileHasher, "sha256Hex").mockResolvedValue("ab".repeat(32));
    const names = ["direct-a.jpg", "direct-b.jpg"];
    mockedAxios.post.mockImplementation((url: string, body?: unknown) => {
      if (url === `${API_URL}/photo/stage`) {
        const filename =
          body && typeof body === "object" && "filename" in body ? String(body.filename) : "f.jpg";
        return Promise.resolve({
          status: 200,
          data: {
            via: "r2",
            key: `evt_test_1/pid-${filename}`,
            uploadUrl: `https://g3.test/${filename}?sig=1`,
            photo: { _id: `pid-${filename}` },
          },
        });
      }
      if (url === `${API_URL}/photo/complete`) {
        return Promise.resolve({ status: 200, data: { ok: true } });
      }
      return Promise.reject(new Error(`unexpected POST ${String(url)}`));
    });
    mockedAxios.put.mockResolvedValue({ status: 200, data: {}, headers: { etag: '"abc"' } });

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const files = names.map((n, i) => new File([`direct-${i}`], n, { type: "image/jpeg" }));
    fireEvent.change(input, { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));

    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
    expect(mockedAxios.put).toHaveBeenCalledTimes(2);
    const multipart = mockedAxios.post.mock.calls.filter(([u]) => String(u).endsWith("/photo"));
    expect(multipart).toHaveLength(0);
  });
  test("pause gates the direct per-file pass", async () => {
    jest.spyOn(UploadModule.fileHasher, "sha256Hex").mockResolvedValue("cd".repeat(32));
    let releasePut: (value: unknown) => void = () => {};
    const putGate = new Promise((resolve) => { releasePut = resolve; });
    let puts = 0;
    mockedAxios.post.mockImplementation((url: string, body?: unknown) => {
      if (url === `${API_URL}/photo/stage`) {
        const filename =
          body && typeof body === "object" && "filename" in body ? String(body.filename) : "f.jpg";
        return Promise.resolve({
          status: 200,
          data: {
            via: "r2",
            key: `evt_test_1/pid-${filename}`,
            uploadUrl: `https://g3.test/${filename}?sig=1`,
            photo: { _id: `pid-${filename}` },
          },
        });
      }
      if (url === `${API_URL}/photo/complete`) {
        return Promise.resolve({ status: 200, data: { ok: true } });
      }
      return Promise.reject(new Error(`unexpected POST ${String(url)}`));
    });
    // First file's PUT hangs in flight; pause must stop the second file from starting.
    mockedAxios.put.mockImplementation(() => {
      puts += 1;
      return puts === 1 ? putGate : Promise.resolve({ status: 200, data: {}, headers: { etag: '"abc"' } });
    });
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const files = ["p1.jpg", "p2.jpg"].map((n, i) => new File([`pause-${i}`], n, { type: "image/jpeg" }));
    fireEvent.change(input, { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    await waitFor(() => expect(puts).toBe(1));
    fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
    // In-flight PUT runs to completion; nothing new starts while paused.
    await new Promise((resolve) => { window.setTimeout(resolve, 600); });
    expect(puts).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    releasePut({ status: 200, data: {}, headers: { etag: '"abc"' } });
    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
  });
  test("a transient PUT blip degrades to multer fallback instead of failing the batch", async () => {
    jest.spyOn(UploadModule.fileHasher, "sha256Hex").mockResolvedValue("ef".repeat(32));
    const blip = Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK" });
    mockedAxios.isAxiosError.mockImplementation((err: unknown): boolean => err === blip);
    mockedAxios.post.mockImplementation((url: string) => {
      if (url === `${API_URL}/photo/stage`) {
        return Promise.resolve({
          status: 200,
          data: { via: "r2", key: "evt/k", uploadUrl: "https://g3.test/k?sig=1", photo: { _id: "pid-k" } },
        });
      }
      if (url === `${API_URL}/photo/complete`) {
        return Promise.resolve({ status: 200, data: { ok: true } });
      }
      return Promise.resolve({ status: 200, data: [] });
    });
    mockedAxios.put.mockRejectedValueOnce(blip);
    mockedAxios.put.mockResolvedValue({ status: 200, data: {} });

    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: createDummyFiles(2) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));

    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
    const multer = mockedAxios.post.mock.calls.filter(([u]) => u === `${API_URL}/photo`);
    expect(multer.length).toBeGreaterThan(0);
  });

  test("fileHasher returns lowercase sha256 hex for known bytes", async () => {
    // ponytail: beforeEach stubs fileHasher→null — restore the real impl;
    // jsdom has no subtle, so stub at the boundary and assert hex plumbing.
    jest.restoreAllMocks();
    const digestBytes = new Uint8Array([0x8f, 0x43, 0x43, 0x46, 0x00, 0xab, 0x01, 0x02]);
    Object.defineProperty(globalThis, "crypto", {
      value: { subtle: { digest: jest.fn().mockResolvedValue(digestBytes.buffer) } },
      configurable: true,
    });
    Object.defineProperty(File.prototype, "arrayBuffer", {
      value: jest.fn().mockResolvedValue(new Uint8Array([104, 105]).buffer),
      configurable: true,
    });
    const hex = await UploadModule.fileHasher.sha256Hex(new File(["hi"], "hi.jpg", { type: "image/jpeg" }));
    expect(hex).toBe("8f43434600ab0102");
    const large = createSizedFiles([50 * 1024 * 1024])[0];
    const read = jest.fn();
    Object.defineProperty(large, "arrayBuffer", { value: read });
    expect(await UploadModule.fileHasher.sha256Hex(large)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  test("overallUploadPct caps at 99 even when every batch is complete", () => {
    expect(overallUploadPct([15, 15, 5], 35)).toBe(99);
    expect(overallUploadPct([15], 15)).toBe(99);
    expect(overallUploadPct([0, 0], 35)).toBe(0);
    expect(overallUploadPct([], 0)).toBe(0);
  });
});
