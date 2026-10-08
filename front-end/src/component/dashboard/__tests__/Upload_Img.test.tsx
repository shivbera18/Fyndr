import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { API_URL } from "../../../utils/api";
import Upload_Img, { MAX_PREVIEWS, UPLOAD_BATCH_SIZE, UPLOAD_BATCH_BYTE_BUDGET, UPLOAD_MAX_ATTEMPTS, buildByteBudgetedBatches, overallUploadPct } from "../Upload_Img";
import { __resetUploadSessionForTests } from "../../../utils/uploadSession";
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
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Uploading \(25%\)/i })).toBeInTheDocument();
    });

    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 4 photos/i)).toBeInTheDocument();
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
    fireEvent.change(input, { target: { files: createDummyFiles(4) } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 4 photos/i }));
    // Bytes fully reported but server not yet answered: bar must sit at 99, never 100.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Uploading \(99%\)/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Successfully uploaded/i)).not.toBeInTheDocument();
    resolvePost({ status: 200, data: [] });
    expect(await screen.findByText(/Successfully uploaded 4 photos/i)).toBeInTheDocument();
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
    // ponytail: sha256=null forces multer fallback; fail the LARGER batch so
    // the surviving batch (10) uploads first regardless of pool order.
    mockedAxios.post.mockImplementation((url: string, body?: unknown) => {
      if (url === `${API_URL}/photo/stage`) {
        return Promise.resolve({ status: 200, data: { via: "local", photo: null, key: null, uploadUrl: null } });
      }
      const files = body instanceof FormData ? body.getAll("name") : [];
      if (files.length > 10) return Promise.reject(axiosError);
      return Promise.resolve({ status: 200, data: [] });
    });
    mockedAxios.isAxiosError.mockImplementation((err: unknown): boolean => err === axiosError);
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;

    // 25 files => Batch 1 (15), Batch 2 (10)
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

  test("upload survives unmount/remount and completes without cancel", async () => {
    // ponytail: Promise.withResolvers needs TS 5.2+ lib; repo pins TS 4.9.5 — revisit on TS upgrade.
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
    expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();
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
      expect(multer.length).toBe(2);
    });
    expect(await screen.findByText(/Successfully uploaded 5 photos/i)).toBeInTheDocument();
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
  });

  test("overallUploadPct caps at 99 even when every batch is complete", () => {
    expect(overallUploadPct([15, 15, 5], 35)).toBe(99);
    expect(overallUploadPct([15], 15)).toBe(99);
    expect(overallUploadPct([0, 0], 35)).toBe(0);
    expect(overallUploadPct([], 0)).toBe(0);
  });
});
