/**
 * Free WhatsApp click-to-chat helpers (no Meta Business API).
 * Uses wa.me / api.whatsapp.com deep links only.
 */

/**
 * Validates and cleans a phone number for direct wa.me targeting.
 * WhatsApp wa.me requires an international number with country code (E.164 without leading + or zeros).
 * If a 10-digit national number is passed without country code (+), returns ""
 * so the caller falls back to the standard WhatsApp chat picker instead of broken/misrouted links.
 */
export function cleanWhatsAppPhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (!raw) return "";

  const digits = raw.replace(/[^0-9]/g, "");
  // Standard E.164 phone lengths are between 10 and 15 digits
  if (digits.length < 10 || digits.length > 15) return "";

  const hasExplicitCountryPrefix = raw.startsWith("+") || raw.startsWith("00");

  if (hasExplicitCountryPrefix) {
    // Has country code explicitly (+91..., +1..., 0044...)
    // If 00 prefix, strip leading 00
    const normalized = raw.startsWith("00") ? digits.replace(/^00/, "") : digits;
    return normalized.length >= 10 && normalized.length <= 15 ? normalized : "";
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
 */
export function sanitizeEventName(name: string | undefined | null): string {
  if (!name) return "the event";
  // Strip control characters (0x00-0x1F, 0x7F) and newlines/tabs
  let clean = String(name).replace(/[\x00-\x1F\x7F\r\n\t]/g, " ");
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
