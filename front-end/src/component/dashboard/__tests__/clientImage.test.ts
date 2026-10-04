import { prepareUploadImage } from "../../../utils/clientImage";

describe("prepareUploadImage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  });

  test("recompresses a 12000x8000 PNG to JPEG capped at 8192 long edge", async () => {
    const jpeg = new Blob([new Uint8Array(100)], { type: "image/jpeg" });
    const fakeBitmap = { width: 12000, height: 8000, close: jest.fn() };
    Object.defineProperty(globalThis, "createImageBitmap", {
      value: jest.fn().mockResolvedValue(fakeBitmap),
      configurable: true,
      writable: true,
    });
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: jest.fn(), fillRect: jest.fn() }),
      toBlob: (cb: (b: Blob | null) => void) => {
        cb(jpeg);
      },
    };
    jest
      .spyOn(document, "createElement")
      .mockReturnValueOnce(fakeCanvas as unknown as HTMLElement);

    const source = new File([new Uint8Array(12_000_000)], "big.png", { type: "image/png" });
    const result = await prepareUploadImage(source);

    expect(result.compressed).toBe(true);
    expect(result.blob.type).toBe("image/jpeg");
    expect(result.blob.size).toBeLessThan(source.size);
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(8192);
    expect(result.width).toBe(8192);
    expect(result.height).toBe(5461);
  });

  test("passes through files already under 8MB without decoding", async () => {
    const createBitmap = jest.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      value: createBitmap,
      configurable: true,
      writable: true,
    });
    const small = new File([new Uint8Array(5_000_000)], "small.jpg", { type: "image/jpeg" });

    const result = await prepareUploadImage(small);

    expect(result.compressed).toBe(false);
    expect(result.blob).toBe(small);
    expect(createBitmap).not.toHaveBeenCalled();
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
