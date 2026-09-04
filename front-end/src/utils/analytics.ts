import { API_URL } from "./api";

export function getOrSetSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  try {
    let sid = sessionStorage.getItem("fyndr_session_id");
    if (!sid) {
      sid = localStorage.getItem("fyndr_session_id");
    }
    if (!sid) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        sid = crypto.randomUUID();
      } else {
        sid = "s_" + Math.random().toString(36).slice(2, 11) + "_" + Date.now().toString(36);
      }
      sessionStorage.setItem("fyndr_session_id", sid);
      localStorage.setItem("fyndr_session_id", sid);
    }
    return sid;
  } catch {
    return "session_" + Date.now();
  }
}

export function detectDevice(): {
  type: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
  screen: string;
} {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { type: "desktop", os: "Unknown", browser: "Unknown", screen: "" };
  }
  const ua = navigator.userAgent.toLowerCase();
  let os = "Unknown";
  if (/iphone|ipad|ipod/.test(ua)) os = "iOS";
  else if (/android/.test(ua)) os = "Android";
  else if (/windows nt|windows/.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/.test(ua)) os = "Mac";
  else if (/linux/.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\/|opera/.test(ua)) browser = "Opera";
  else if (/chrome|crios/.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/.test(ua)) browser = "Firefox";
  else if (/safari/.test(ua) && !/chrome|crios/.test(ua)) browser = "Safari";

  const width = window.innerWidth || window.screen?.width || 1024;
  let type: "mobile" | "tablet" | "desktop" = "desktop";
  if (/ipad|tablet/.test(ua) || (width >= 768 && width <= 1024 && navigator.maxTouchPoints > 1)) {
    type = "tablet";
  } else if (/mobile|iphone|android/.test(ua) || width < 768) {
    type = "mobile";
  }

  const screen = `${window.screen?.width || width}x${window.screen?.height || 0}`;
  return { type, os, browser, screen };
}

export function trackEvent(
  eventId: string,
  type: string,
  metadata: Record<string, any> = {}
): void {
  if (!eventId) return;
  try {
    const sessionId = getOrSetSessionId();
    const guestId = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("fyndr_guest_id")) || undefined;
    const payload = JSON.stringify({
      eventId,
      sessionId,
      guestId,
      type,
      metadata,
    });
    const url = `${API_URL}/api/analytics/track`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Fail silently so tracking never interrupts user flow
  }
}

export async function recordAccessAttempt(
  eventId: string,
  name: string,
  phone: string,
  pin: string
): Promise<{ ok: boolean; verified: boolean; message: string; guestId?: string }> {
  const sessionId = getOrSetSessionId();
  const deviceInfo = detectDevice();

  const res = await fetch(`${API_URL}/api/analytics/access-attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId,
      name,
      phone,
      pin,
      sessionId,
      deviceInfo,
      screen: deviceInfo.screen,
    }),
  });

  const data = await res.json();
  if (data.guestId && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("fyndr_guest_id", data.guestId);
    sessionStorage.setItem("fyndr_guest_name", name);
    sessionStorage.setItem("fyndr_guest_phone", phone);
  }
  return data;
}

export function getGuestSession(): { guestId?: string; guestName?: string; guestPhone?: string } {
  if (typeof sessionStorage === "undefined") return {};
  return {
    guestId: sessionStorage.getItem("fyndr_guest_id") || undefined,
    guestName: sessionStorage.getItem("fyndr_guest_name") || undefined,
    guestPhone: sessionStorage.getItem("fyndr_guest_phone") || undefined,
  };
}
