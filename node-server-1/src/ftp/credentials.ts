import crypto from "crypto";

// Camera-to-cloud FTP credential helpers (pure — no DB, no fs).
// Username shape: evt_<8 hex>[_b-e]  (per event, up to 5 shooter logins a-e).

const USER_RE = /^evt_[0-9a-f]{8}(_[b-e])?$/;
const TAG_RE = /^[a-e]$/;
const PASS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
// ponytail: ambiguous glyphs (0/O/1/l) dropped — photographers type these into cameras.

export function isValidUsername(u: unknown): u is string {
  return typeof u === "string" && USER_RE.test(u);
}

export function isValidTag(t: unknown): t is string {
  return typeof t === "string" && TAG_RE.test(t);
}

/** evt_<last 8 of event ObjectId>[suffix]. Suffix "" = shooter a. */
export function buildUsername(eventId: string, tag: string): string {
  const short = eventId.slice(-8).toLowerCase();
  return tag === "a" ? `evt_${short}` : `evt_${short}_${tag}`;
}

/** 12 camera-typeable chars (~71 bits), chunked XXXX-XXXX-XXXX. No symbols — camera keyboards are painful. */
export function generatePassword(): string {
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += PASS_ALPHABET[crypto.randomInt(PASS_ALPHABET.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8)}`;
}

/** SHA256 hex — same convention as token_hash. Plaintext is shown once, never stored. */
export function sha256hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
