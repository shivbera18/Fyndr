import {
  cleanWhatsAppPhone,
  buildWhatsAppSendUrl,
  buildMatchedPhotosWhatsAppText,
} from "../whatsapp";

describe("cleanWhatsAppPhone", () => {
  it("strips non-digits and keeps country code", () => {
    expect(cleanWhatsAppPhone("+91 98765 43210")).toBe("919876543210");
  });

  it("returns empty for short or missing values", () => {
    expect(cleanWhatsAppPhone("")).toBe("");
    expect(cleanWhatsAppPhone(null)).toBe("");
    expect(cleanWhatsAppPhone("123")).toBe("");
  });
});

describe("buildWhatsAppSendUrl", () => {
  it("targets guest phone when present", () => {
    const url = buildWhatsAppSendUrl({
      phone: "+919876543210",
      text: "Hello https://fyndr.in/collect/abc",
    });
    expect(url).toBe(
      "https://wa.me/919876543210?text=" +
        encodeURIComponent("Hello https://fyndr.in/collect/abc")
    );
  });

  it("falls back to chat picker without phone", () => {
    const url = buildWhatsAppSendUrl({ text: "Hi there" });
    expect(url).toBe(
      "https://api.whatsapp.com/send?text=" + encodeURIComponent("Hi there")
    );
  });
});

describe("buildMatchedPhotosWhatsAppText", () => {
  it("pluralizes and includes gallery URL", () => {
    expect(
      buildMatchedPhotosWhatsAppText({
        eventName: "Rohit & Ananya Wedding",
        matchCount: 12,
        galleryUrl: "https://fyndr.in/collect/abc",
      })
    ).toBe(
      "Your 12 photos from Rohit & Ananya Wedding are ready on Fyndr: https://fyndr.in/collect/abc"
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
