/**
 * Free WhatsApp click-to-chat helpers (no Meta Business API).
 * Uses wa.me / api.whatsapp.com deep links only.
 */

/**
 * Validates and cleans a phone number for direct wa.me targeting.
 * WhatsApp wa.me requires an international number with country code (E.164 without leading + or zeros).
 * E.164 country codes never begin with '0'.
 * If a domestic number is passed (e.g. 10 digits without country code, or 11 digits with leading trunk 0),
 * returns "" so the caller falls back to the standard WhatsApp chat picker instead of broken/misrouted links.
 */
export function cleanWhatsAppPhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (!raw) return "";

  const digits = raw.replace(/[^0-9]/g, "");
  // Standard E.164 phone lengths are between 10 and 15 digits
  if (digits.length < 10 || digits.length > 15) return "";

  const hasPlusPrefix = raw.startsWith("+");
  const has00Prefix = raw.startsWith("00");

  if (hasPlusPrefix) {
    // E.164 country codes start with 1-9, never 0
    if (digits.startsWith("0")) return "";
    return digits.length >= 10 && digits.length <= 15 ? digits : "";
  }

  if (has00Prefix) {
    const normalized = digits.replace(/^00/, "");
    // Stripped of 00, country codes must start with 1-9
    if (normalized.startsWith("0")) return "";
    return normalized.length >= 10 && normalized.length <= 15 ? normalized : "";
  }

  // Without explicit '+' or '00', domestic trunk prefixes starting with '0'
  // (e.g. UK 07911 123456, India 09876543210) are domestic, not international.
  if (digits.startsWith("0")) {
    return "";
  }

  // Without explicit '+', 10 digits is almost universally a domestic/local number (e.g. India, US).
  // wa.me/9876543210 will misroute or fail in WhatsApp. Require at least 11 digits to infer country code.
  if (digits.length === 10) {
    return "";
  }

  return digits;
}

/**
 * Returns a masked version of the phone for display (e.g. "•••• 4321").
 * Returns empty string if the phone is not a valid international target.
 */
export function maskWhatsAppPhone(phone: string | undefined | null): string {
  const cleaned = cleanWhatsAppPhone(phone);
  if (!cleaned || cleaned.length < 4) return "";
  return `•••• ${cleaned.slice(-4)}`;
}

/**
 * Sanitizes photographer-provided event name for inclusion in WhatsApp draft text.
 * Prevents newline injection, defangs links, collapses whitespace, and enforces hard length limit (CWE-74).
 * Uses character-code filtering to avoid ESLint no-control-regex build warnings.
 */
export function sanitizeEventName(name: string | undefined | null): string {
  if (!name) return "the event";
  // Replace control characters (ASCII 0-31, 127) and newlines/tabs with space without regex control chars
  let clean = "";
  for (const ch of String(name)) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127) {
      clean += " ";
    } else {
      clean += ch;
    }
  }
  // Defang/neutralize URLs to prevent phishing in WhatsApp draft
  clean = clean.replace(/https?:\/\//gi, "").replace(/www\./gi, "");
  // Collapse whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  if (!clean) return "the event";
  // Hard cap length at 80 characters
  if (clean.length > 80) {
    clean = clean.slice(0, 80).trim();
  }
  return clean;
}

export function buildWhatsAppSendUrl(opts: {
  text: string;
  phone?: string | null;
}): string {
  const text = encodeURIComponent(opts.text);
  const phone = cleanWhatsAppPhone(opts.phone);
  if (phone) {
    return `https://wa.me/${phone}?text=${text}`;
  }
  return `https://api.whatsapp.com/send?text=${text}`;
}

export function buildMatchedPhotosWhatsAppText(opts: {
  eventName?: string;
  matchCount: number;
  galleryUrl: string;
}): string {
  const name = sanitizeEventName(opts.eventName);
  const n = Math.max(0, Math.floor(Number(opts.matchCount) || 0));
  const photoWord = n === 1 ? "photo" : "photos";
  const verb = n === 1 ? "is" : "are";
  return `Your ${n} ${photoWord} from ${name} ${verb} ready on Fyndr: ${opts.galleryUrl}`;
}
