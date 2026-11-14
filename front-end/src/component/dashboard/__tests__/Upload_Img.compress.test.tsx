import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import { API_URL } from "../../../utils/api";
import Upload_Img from "../Upload_Img";
import * as UploadModule from "../Upload_Img";
import { __resetUploadSessionForTests, getSnapshot } from "../../../utils/uploadSession";

jest.mock("../../../utils/clientImage", () => ({
  prepareUploadImage: jest.fn(async () => ({
    blob: new Blob([new Uint8Array(100)], { type: "image/jpeg" }),
    compressed: true,
    width: 100,
    height: 100,
  })),
}));
import * as clientImage from "../../../utils/clientImage";

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

describe("Upload_Img compression wiring", () => {
  jest.setTimeout(25000);

  beforeEach(() => {
    jest.clearAllMocks();
    __resetUploadSessionForTests();
    jest.spyOn(UploadModule.fileHasher, "sha256Hex").mockResolvedValue("cd".repeat(32));
    (clientImage.prepareUploadImage as jest.Mock).mockResolvedValue({
      blob: new Blob([new Uint8Array(100)], { type: "image/jpeg" }),
      compressed: true,
      width: 100,
      height: 100,
    });
    window.URL.createObjectURL = jest.fn(() => "blob:mock");
    window.URL.revokeObjectURL = jest.fn();
    mockedAxios.isCancel.mockReturnValue(false);
    mockedAxios.put.mockResolvedValue({ status: 200, data: {} });
    mockedAxios.post.mockImplementation((url: string) => {
      if (String(url).endsWith("/photo/stage")) {
        return Promise.resolve({
          status: 200,
          data: { via: "r2", key: "evt/k", uploadUrl: "https://g3.test/k?sig=1", photo: { _id: "pid-k" } },
        });
      }
      if (String(url).endsWith("/photo/complete")) {
        return Promise.resolve({ status: 200, data: { ok: true } });
      }
      return Promise.resolve({ status: 200, data: [] });
    });
    localStorage.setItem("user", JSON.stringify({ _id: "usr_1" }));
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("stage sends compressed size and PUT uses image/jpeg with original filename", async () => {
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["original-bytes"], "orig.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 1 photo/i }));

    expect(await screen.findByText(/Successfully uploaded 1 photo/i)).toBeInTheDocument();

    const stageCall = mockedAxios.post.mock.calls.find(([u]) => String(u).endsWith("/photo/stage"));
    expect(stageCall).toBeDefined();
    expect(stageCall?.[1]).toMatchObject({ filename: "orig.png", size: 100, contentType: "image/jpeg" });
    expect(mockedAxios.put).toHaveBeenCalledTimes(1);
    expect(mockedAxios.put.mock.calls[0]?.[1]).toBeInstanceOf(Blob);
    expect(mockedAxios.put.mock.calls[0]?.[2]).toMatchObject({ headers: { "Content-Type": "image/jpeg" } });
  });

  test("original-quality flag skips compression and sends original type", async () => {
    localStorage.setItem("fyndr:upload:original-quality", "1");
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["original-bytes"], "orig.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: /Upload 1 photo/i }));

    expect(await screen.findByText(/Successfully uploaded 1 photo/i)).toBeInTheDocument();

    expect(clientImage.prepareUploadImage as jest.Mock).not.toHaveBeenCalled();
    const stageCall = mockedAxios.post.mock.calls.find(([u]) => String(u).endsWith("/photo/stage"));
    expect(stageCall?.[1]).toMatchObject({ filename: "orig.png", contentType: "image/png" });
    expect(mockedAxios.put.mock.calls[0]?.[2]).toMatchObject({ headers: { "Content-Type": "image/png" } });
  });
  test("pause during preparation blocks both staging and fallback until resume", async () => {
    // TS 4.9/browser targets do not provide Promise.withResolvers.
    let finishPreparation!: (value: clientImage.PreparedImage) => void;
    (clientImage.prepareUploadImage as jest.Mock).mockImplementationOnce(() => new Promise(resolve => {
      finishPreparation = resolve;
    }));
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    fireEvent.change(container.querySelector("input[type='file']")!, {
      target: { files: [new File(["one"], "one.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upload 1 photo/i }));
    await waitFor(() => expect(clientImage.prepareUploadImage).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await act(async () => {
      finishPreparation({ blob: new Blob(["one"]), compressed: false, width: 0, height: 0 });
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockedAxios.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(await screen.findByText(/Successfully uploaded 1 photo/i)).toBeInTheDocument();
  });

  test("does not prepare the next photo while the current transfer is active", async () => {
    let finishPut!: (value: unknown) => void;
    mockedAxios.put.mockImplementationOnce(() => new Promise(resolve => { finishPut = resolve; }));
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    fireEvent.change(container.querySelector("input[type='file']")!, {
      target: { files: ["one", "two"].map(name => new File([name], `${name}.jpg`, { type: "image/jpeg" })) },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upload 2 photos/i }));
    await waitFor(() => expect(mockedAxios.put).toHaveBeenCalledTimes(1));
    expect(clientImage.prepareUploadImage).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await act(async () => {
      finishPut({ status: 200 });
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    expect(getSnapshot().uploadedCount).toBe(1);
    expect(getSnapshot().totalFiles).toBe(2);
    expect(clientImage.prepareUploadImage).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Paused \(1 of 2,/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(await screen.findByText(/Successfully uploaded 2 photos/i)).toBeInTheDocument();
  });
  test("finishes the final in-flight photo even when scheduling is paused", async () => {
    let finishPut!: (value: unknown) => void;
    mockedAxios.put.mockImplementationOnce(() => new Promise(resolve => { finishPut = resolve; }));
    const { container } = render(<Upload_Img event_id="evt_test_1" />);
    fireEvent.change(container.querySelector("input[type='file']")!, {
      target: { files: [new File(["one"], "one.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upload 1 photo/i }));
    await waitFor(() => expect(mockedAxios.put).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await act(async () => { finishPut({ status: 200 }); });
    expect(await screen.findByText(/Successfully uploaded 1 photo/i)).toBeInTheDocument();
  });
});
