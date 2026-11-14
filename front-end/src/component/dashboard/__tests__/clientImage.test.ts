import { JPEG_QUALITY, MAX_DECODE_PIXELS, PASSTHROUGH_BYTES, prepareUploadImage } from "../../../utils/clientImage";

function source(width = 2048, height = 2048, type = "image/jpeg", header?: Uint8Array): File {
  const bytes = header ?? new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255,
    3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0,
  ]);
  const file = new File([bytes], "photo.jpg", { type });
  // jsdom lacks Blob.arrayBuffer; avoid allocating multi-megabyte fixture buffers.
  Object.defineProperty(file, "size", { value: PASSTHROUGH_BYTES + 1 });
  jest.spyOn(file, "slice").mockReturnValue({ arrayBuffer: async () => bytes.buffer } as Blob);
  return file;
}

describe("prepareUploadImage", () => {
  let createBitmap: jest.Mock;
  let bitmap: { width: number; height: number; close: jest.Mock };

  beforeEach(() => {
    bitmap = { width: 2048, height: 2048, close: jest.fn() };
    createBitmap = jest.fn().mockResolvedValue(bitmap);
    Object.defineProperty(globalThis, "createImageBitmap", {
      value: createBitmap,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  });

  test("recompresses a bounded JPEG without resizing and frees both surfaces", async () => {
    const jpeg = new Blob(["encoded"], { type: "image/jpeg" });
    const drawImage = jest.fn();
    const toBlob = jest.fn((callback: (blob: Blob | null) => void) => {
      expect(bitmap.close).toHaveBeenCalledTimes(1);
      callback(jpeg);
    });
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob };
    jest.spyOn(document, "createElement").mockReturnValueOnce(canvas as unknown as HTMLElement);
    const file = source();

    const result = await prepareUploadImage(file);

    expect(result).toEqual({ blob: jpeg, compressed: true, width: 2048, height: 2048 });
    expect(result.width * result.height).toBe(MAX_DECODE_PIXELS);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", JPEG_QUALITY);
    expect(file.slice).toHaveBeenCalledWith(0, 64 * 1024);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    expect(canvas).toMatchObject({ width: 0, height: 0 });
  });

  test.each([[12000, 8000], [2049, 2048], [8193, 1], [0, 2048]])(
    "uploads %ix%i JPEG unchanged without allocating a bitmap or canvas",
    async (width, height) => {
      const file = source(width, height);
      const createElement = jest.spyOn(document, "createElement");

      expect(await prepareUploadImage(file)).toEqual({ blob: file, compressed: false, width: 0, height: 0 });
      expect(createBitmap).not.toHaveBeenCalled();
      expect(createElement).not.toHaveBeenCalled();
    },
  );

  test.each(["image/png", "image/webp", "image/heic", ""])(
    "uploads %s unchanged without reading or decoding",
    async (type) => {
      const file = source(2048, 2048, type);
      expect((await prepareUploadImage(file)).blob).toBe(file);
      expect(file.slice).not.toHaveBeenCalled();
      expect(createBitmap).not.toHaveBeenCalled();
    },
  );

  test("passes through files at the 8MiB threshold without decoding", async () => {
    const file = new File(["small"], "small.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: PASSTHROUGH_BYTES });
    expect((await prepareUploadImage(file)).blob).toBe(file);
    expect(createBitmap).not.toHaveBeenCalled();
  });

  test.each([
    new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]), // Metadata extends beyond inspected header.
    new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 0]), // Invalid zero-length segment.
    new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xff]), // Truncated marker fill bytes.
    new Uint8Array([0, 0, 0, 0]), // Not a JPEG despite the MIME type.
  ])("passes through unknown or malformed dimensions without decoding (%#)", async (header) => {
    const file = source(2048, 2048, "image/jpeg", header);
    expect((await prepareUploadImage(file)).blob).toBe(file);
    expect(createBitmap).not.toHaveBeenCalled();
  });

  test("skips metadata and marker padding before a progressive JPEG frame", async () => {
    const header = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0, 4, 0, 0,
      0xff, 0xff, 0xc2, 0, 17, 8, 0x20, 0, 0x30, 0,
      3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0,
    ]);
    const file = source(12000, 8000, "image/jpeg", header);
    expect((await prepareUploadImage(file)).blob).toBe(file);
    expect(createBitmap).not.toHaveBeenCalled();
  });

  test("falls back unchanged when header reading is unavailable", async () => {
    const file = source();
    (file.slice as jest.Mock).mockReturnValue({});
    expect((await prepareUploadImage(file)).blob).toBe(file);
    expect(createBitmap).not.toHaveBeenCalled();
  });

  test("retains EXIF-oriented dimensions without resizing", async () => {
    const file = source(2048, 1024);
    bitmap.width = 1024;
    bitmap.height = 2048;
    const jpeg = new Blob(["encoded"], { type: "image/jpeg" });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: jest.fn() }),
      toBlob: (callback: (blob: Blob | null) => void) => callback(jpeg),
    };
    jest.spyOn(document, "createElement").mockReturnValueOnce(canvas as unknown as HTMLElement);
    expect(await prepareUploadImage(file)).toEqual({ blob: jpeg, compressed: true, width: 1024, height: 2048 });
    expect(canvas).toMatchObject({ width: 0, height: 0 });
  });

  test("closes an unexpectedly large decoder result without creating a canvas", async () => {
    bitmap.width = 12000;
    bitmap.height = 8000;
    const file = source();
    const createElement = jest.spyOn(document, "createElement");
    expect((await prepareUploadImage(file)).blob).toBe(file);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    expect(createElement).not.toHaveBeenCalled();
  });

  test.each(["context", "draw", "encode", "null", "larger"])(
    "preserves original bytes and releases resources on %s failure",
    async (failure) => {
      const file = source();
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => failure === "context" ? null : {
          drawImage: () => { if (failure === "draw") throw new Error("draw failed"); },
        },
        toBlob: (callback: (blob: Blob | null) => void) => {
          if (failure === "encode") throw new Error("encode failed");
          callback(failure === "null" ? null : file);
        },
      };
      jest.spyOn(document, "createElement").mockReturnValueOnce(canvas as unknown as HTMLElement);

      expect(await prepareUploadImage(file)).toEqual({ blob: file, compressed: false, width: 0, height: 0 });
      expect(bitmap.close).toHaveBeenCalledTimes(1);
      expect(canvas).toMatchObject({ width: 0, height: 0 });
    },
  );

  test("preserves the original when the decoder rejects", async () => {
    const file = source();
    createBitmap.mockRejectedValue(new Error("unsupported"));
    expect((await prepareUploadImage(file)).blob).toBe(file);
  });
});
