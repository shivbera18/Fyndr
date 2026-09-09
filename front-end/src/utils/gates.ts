// Guest gating helpers shared by the camera flow and the standalone reel page.
// Single source so paywall edits can't fix one path and silently break the other.
export interface GatePaywall {
  enabled: boolean;
  stage: "download" | "batch_download" | "watermark_removal" | "entry";
  freePhotoLimit: number;
}

export const leadKey = (id: string | null): string => (id ? `fy-lead-${id}` : "");

export const gateOn = (id: string | null): boolean =>
  !!id &&
  sessionStorage.getItem(`fy-require-lead-${id}`) === "1" &&
  sessionStorage.getItem(leadKey(id)) !== "1";

export const isAlbumUnlocked = (id: string | null): boolean => {
  if (!id) return false;
  return sessionStorage.getItem(`fy-unlocked-album-${id}`) === "1";
};

export const isPhotoUnlocked = (id: string | null, filename: string): boolean => {
  if (!id) return false;
  if (isAlbumUnlocked(id)) return true;
  try {
    const stored = sessionStorage.getItem(`fy-unlocked-photos-${id}`);
    if (!stored) return false;
    const list: unknown = JSON.parse(stored);
    return Array.isArray(list) && list.includes(filename);
  } catch {
    return false;
  }
};

export const getDownloadCount = (id: string | null): number => {
  if (!id) return 0;
  return Number(sessionStorage.getItem(`fy-dl-count-${id}`) || "0");
};

export const incrementDownloadCount = (id: string | null): void => {
  if (!id) return;
  const current = getDownloadCount(id);
  sessionStorage.setItem(`fy-dl-count-${id}`, String(current + 1));
};

// A photo may appear in an exported reel iff it could be downloaded right now.
export const isPhotoEligible = (
  id: string | null,
  paywall: GatePaywall | null,
  filename: string
): boolean => {
  if (paywall?.enabled) {
    if (paywall.stage === "download" || paywall.stage === "watermark_removal") {
      if (!isPhotoUnlocked(id, filename)) return false;
    }
    if (paywall.stage === "batch_download" && !isAlbumUnlocked(id)) {
      if (getDownloadCount(id) >= paywall.freePhotoLimit && !isPhotoUnlocked(id, filename))
        return false;
    }
    if (paywall.stage === "entry" && !isAlbumUnlocked(id)) return false;
  }
  if (gateOn(id)) return false;
  return true;
};
