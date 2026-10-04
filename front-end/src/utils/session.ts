// Single owner for sign-out cleanup: every logout path must route through
// signOut() so a new login never inherits the previous identity's state.
// Clears: auth (user/token), ALL session-scoped guest/paywall caches,
// per-user local prefs + drafts, analytics session id, and cached photo
// bytes (SW image cache is per-event content). App shell + reel music
// caches are identical for all users — kept.
export async function signOut(): Promise<void> {
  try {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("fyndr_session_id");
    localStorage.removeItem("fyndr:upload:original-quality");
    // Reel drafts are keyed per event; drop any this browser holds.
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("fyndr:reel:draft:")) drop.push(k);
    }
    drop.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Private mode — best effort.
  }
  await purgeEphemeralCaches();
}

// Ephemeral per-session caches (guest flags, matched lists, cached photo
// bytes). Called on Drive disconnect/reconnect where the auth identity is
// unchanged, so localStorage (user, prefs, drafts) is intentionally kept.
export async function purgeEphemeralCaches(): Promise<void> {
  try {
    sessionStorage.clear();
  } catch {
    // Private mode — best effort.
  }
  try {
    if (typeof caches !== "undefined") await caches.delete("fyndr-images-v1");
  } catch {
    // Cache API unavailable — nothing cached.
  }
}
