/**
 * Free WhatsApp click-to-chat helpers (no Meta Business API).
 * Uses wa.me / api.whatsapp.com deep links only.
 */

/** Strip to digits for wa.me; empty string if unusable. */
export function cleanWhatsAppPhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const digits = String(phone).replace(/[^0-9]/g, "");
  // Need at least country code + local (e.g. 91 + 10 digits)
  return digits.length >= 8 ? digits : "";
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
  const name = (opts.eventName || "the event").trim() || "the event";
  const n = Math.max(0, Math.floor(Number(opts.matchCount) || 0));
  const photoWord = n === 1 ? "photo" : "photos";
  const verb = n === 1 ? "is" : "are";
  return `Your ${n} ${photoWord} from ${name} ${verb} ready on Fyndr: ${opts.galleryUrl}`;
}
