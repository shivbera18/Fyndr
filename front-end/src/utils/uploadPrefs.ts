// ponytail: local-only photographer pref — no server schema, no migration.
// Compressed-by-default; opt out for full-res archival uploads.
export const ORIGINAL_QUALITY_KEY = "fyndr:upload:original-quality";

export function isOriginalQuality(): boolean {
  try {
    return localStorage.getItem(ORIGINAL_QUALITY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOriginalQuality(on: boolean): void {
  try {
    if (on) localStorage.setItem(ORIGINAL_QUALITY_KEY, "1");
    else localStorage.removeItem(ORIGINAL_QUALITY_KEY);
  } catch {
    // ponytail: private-mode storage throws — stay compressed, never break upload.
  }
}
