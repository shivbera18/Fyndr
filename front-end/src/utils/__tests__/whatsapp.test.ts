import {
  cleanWhatsAppPhone,
  maskWhatsAppPhone,
  sanitizeEventName,
  buildWhatsAppSendUrl,
  buildMatchedPhotosWhatsAppText,
} from "../whatsapp";

describe("cleanWhatsAppPhone", () => {
  it("keeps explicit international numbers with country code (+)", () => {
    expect(cleanWhatsAppPhone("+91 98765 43210")).toBe("919876543210");
    expect(cleanWhatsAppPhone("+1 (415) 555-2671")).toBe("14155552671");
    expect(cleanWhatsAppPhone("+44 7911 123456")).toBe("447911123456");
  });

  it("handles 00 international prefix", () => {
    expect(cleanWhatsAppPhone("0044 7911 123456")).toBe("447911123456");
  });

  it("rejects local 10-digit numbers without country prefix to avoid broken wa.me links", () => {
    // Domestic numbers like 9876543210 fail wa.me click-to-chat; must return "" to trigger chat picker
    expect(cleanWhatsAppPhone("9876543210")).toBe("");
  });

  it("accepts numbers without + only if they have >= 11 digits (inferred country code)", () => {
    expect(cleanWhatsAppPhone("919876543210")).toBe("919876543210");
  });

  it("returns empty for short, invalid, or missing values", () => {
    expect(cleanWhatsAppPhone("")).toBe("");
    expect(cleanWhatsAppPhone(null)).toBe("");
    expect(cleanWhatsAppPhone(undefined)).toBe("");
    expect(cleanWhatsAppPhone("12345")).toBe("");
    expect(cleanWhatsAppPhone("+1234567")).toBe(""); // < 10 digits
    expect(cleanWhatsAppPhone("+123456789012345678")).toBe(""); // > 15 digits
  });
});

describe("maskWhatsAppPhone", () => {
  it("masks the phone to show last 4 digits for confirmed international numbers", () => {
    expect(maskWhatsAppPhone("+91 98765 43210")).toBe("•••• 3210");
    expect(maskWhatsAppPhone("919876543210")).toBe("•••• 3210");
  });

  it("returns empty string if phone is missing or unvalidated local number", () => {
    expect(maskWhatsAppPhone("9876543210")).toBe("");
    expect(maskWhatsAppPhone("")).toBe("");
    expect(maskWhatsAppPhone(null)).toBe("");
  });
});

describe("sanitizeEventName", () => {
  it("returns 'the event' for empty or whitespace-only names", () => {
    expect(sanitizeEventName("")).toBe("the event");
    expect(sanitizeEventName(null)).toBe("the event");
    expect(sanitizeEventName("   ")).toBe("the event");
  });

  it("strips newlines, control characters, and collapses whitespace", () => {
    const dirty = "Priya & Rahul\n\rWedding\tReception   ";
    expect(sanitizeEventName(dirty)).toBe("Priya & Rahul Wedding Reception");
  });

  it("defangs/neutralizes injected URLs (CWE-74 phishing mitigation)", () => {
    const malicious = "Wedding \n\n Verify: https://evil.example/fyndr";
    const clean = sanitizeEventName(malicious);
    expect(clean).not.toContain("https://");
    expect(clean).toBe("Wedding Verify: evil.example/fyndr");
  });

  it("caps length at 80 characters", () => {
    const longName = "A".repeat(120);
    const clean = sanitizeEventName(longName);
    expect(clean.length).toBe(80);
  });
});

describe("buildWhatsAppSendUrl", () => {
  it("targets wa.me for valid international phone", () => {
    const url = buildWhatsAppSendUrl({
      phone: "+919876543210",
      text: "Hello https://fyndr.in/collect/abc",
    });
    expect(url).toBe(
      "https://wa.me/919876543210?text=" +
        encodeURIComponent("Hello https://fyndr.in/collect/abc")
    );
  });

  it("falls back to chat picker when phone lacks country code", () => {
    const url = buildWhatsAppSendUrl({
      phone: "9876543210",
      text: "Hello",
    });
    expect(url).toBe("https://api.whatsapp.com/send?text=Hello");
  });

  it("falls back to chat picker without phone", () => {
    const url = buildWhatsAppSendUrl({ text: "Hi there" });
    expect(url).toBe(
      "https://api.whatsapp.com/send?text=" + encodeURIComponent("Hi there")
    );
  });
});

describe("buildMatchedPhotosWhatsAppText", () => {
  it("pluralizes and includes sanitized event name and gallery URL", () => {
    expect(
      buildMatchedPhotosWhatsAppText({
        eventName: "Rohit & Ananya Wedding\nSpecial",
        matchCount: 12,
        galleryUrl: "https://fyndr.in/collect/abc",
      })
    ).toBe(
      "Your 12 photos from Rohit & Ananya Wedding Special are ready on Fyndr: https://fyndr.in/collect/abc"
    );
  });

  it("uses singular for one photo and default event name", () => {
    expect(
      buildMatchedPhotosWhatsAppText({
        matchCount: 1,
        galleryUrl: "https://fyndr.in/collect/x",
      })
    ).toBe("Your 1 photo from the event is ready on Fyndr: https://fyndr.in/collect/x");
  });
});
