import {
  gateOn,
  getDownloadCount,
  incrementDownloadCount,
  isAlbumUnlocked,
  isPhotoEligible,
  isPhotoUnlocked,
} from "../../../utils/gates";

beforeEach(() => sessionStorage.clear());
afterEach(() => sessionStorage.clear());

test("lead gate blocks until the lead flag is set", () => {
  sessionStorage.setItem("fy-require-lead-e1", "1");
  expect(gateOn("e1")).toBe(true);
  expect(isPhotoEligible("e1", null, "a.jpg")).toBe(false);
  sessionStorage.setItem("fy-lead-e1", "1");
  expect(gateOn("e1")).toBe(false);
  expect(isPhotoEligible("e1", null, "a.jpg")).toBe(true);
});

test("download-stage paywall needs a per-photo unlock", () => {
  const pw = { enabled: true, stage: "download" as const, freePhotoLimit: 2 };
  expect(isPhotoEligible("e1", pw, "a.jpg")).toBe(false);
  sessionStorage.setItem("fy-unlocked-photos-e1", JSON.stringify(["a.jpg"]));
  expect(isPhotoUnlocked("e1", "a.jpg")).toBe(true);
  expect(isPhotoEligible("e1", pw, "a.jpg")).toBe(true);
  expect(isPhotoEligible("e1", pw, "b.jpg")).toBe(false);
});

test("album unlock opens every stage", () => {
  sessionStorage.setItem("fy-unlocked-album-e1", "1");
  expect(isAlbumUnlocked("e1")).toBe(true);
  expect(isPhotoEligible("e1", { enabled: true, stage: "entry", freePhotoLimit: 0 }, "a.jpg")).toBe(
    true
  );
});

test("batch stage honors the free-photo limit counter", () => {
  const pw = { enabled: true, stage: "batch_download" as const, freePhotoLimit: 1 };
  expect(isPhotoEligible("e1", pw, "a.jpg")).toBe(true);
  incrementDownloadCount("e1");
  expect(getDownloadCount("e1")).toBe(1);
  expect(isPhotoEligible("e1", pw, "a.jpg")).toBe(false);
});
