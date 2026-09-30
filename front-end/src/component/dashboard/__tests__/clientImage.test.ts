import { prepareUploadImage } from "../../../utils/clientImage";

describe("prepareUploadImage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  });

  test("recompresses a 4000x3000 PNG to JPEG capped at 2560 long edge", async () => {
    const jpeg = new Blob([new Uint8Array(100)], { type: "image/jpeg" });
    const fakeBitmap = { width: 4000, height: 3000, close: jest.fn() };
    Object.defineProperty(globalThis, "createImageBitmap", {
      value: jest.fn().mockResolvedValue(fakeBitmap),
      configurable: true,
      writable: true,
    });
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: jest.fn() }),
      toBlob: (cb: (b: Blob | null) => void) => {
        cb(jpeg);
      },
    };
    jest
      .spyOn(document, "createElement")
      .mockReturnValueOnce(fakeCanvas as unknown as HTMLElement);

    const source = new File([new Uint8Array(200_000)], "big.png", { type: "image/png" });
    const result = await prepareUploadImage(source);

    expect(result.compressed).toBe(true);
    expect(result.blob.type).toBe("image/jpeg");
    expect(result.blob.size).toBeLessThan(source.size);
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(2560);
    expect(result.width).toBe(2560);
    expect(result.height).toBe(1920);
  });

  test("returns an undecodable HEIC file untouched", async () => {
    const createBitmap = jest.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      value: createBitmap,
      configurable: true,
      writable: true,
    });
    const heic = new File(["x"], "photo.heic", { type: "image/heic" });

    const result = await prepareUploadImage(heic);

    expect(result.compressed).toBe(false);
    expect(result.blob).toBe(heic);
    expect(createBitmap).not.toHaveBeenCalled();
  });
});
