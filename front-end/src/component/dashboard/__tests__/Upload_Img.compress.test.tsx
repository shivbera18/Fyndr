import { render, screen, fireEvent } from "@testing-library/react";
import axios from "axios";
import { API_URL } from "../../../utils/api";
import Upload_Img from "../Upload_Img";
import * as UploadModule from "../Upload_Img";

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
});
