import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Header from "../../navbar/Header";
import Footer from "../../Footer";
import { Button } from "../../../components/ui/button";
import ReelCreatorModal from "./ReelCreatorModal";
import { API_URL } from "../../../utils/api";
import { isPhotoEligible, type GatePaywall } from "../../../utils/gates";

interface ReelPhoto {
  name: string;
  url: string;
}
interface LocationState {
  photos?: { name: string; url?: string }[];
  eventName?: string;
  from?: string;
}

const photoUrl = (name: string): string => `${API_URL}/uploads/${encodeURIComponent(name)}`;

const readCachedNames = (eventId: string): string[] => {
  try {
    const raw = sessionStorage.getItem(`fy-matched-${eventId}`);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
};

const ReelPage = (): React.JSX.Element => {
  const { eventId = "" } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) || {};

  const [eventName, setEventName] = useState<string>(
    state.eventName || sessionStorage.getItem(`fy-event-name-${eventId}`) || ""
  );
  const [paywall, setPaywall] = useState<GatePaywall | null>(null);
  const [names, setNames] = useState<string[]>(() => {
    if (state.photos && state.photos.length > 0) return state.photos.map((p) => p.name);
    return eventId ? readCachedNames(eventId) : [];
  });

  const cameFromCamera = state.from === "camera";
  const backToPhotos = (): void => {
    // -1 preserves the camera instance (matched photos stay in memory), but
    // only when the navigation state proves we came from there — webviews and
    // shared links can report external entries in history.length.
    if (cameFromCamera && typeof window !== "undefined" && window.history.length > 1)
      navigate(-1);
    else navigate("/camera", { state: eventId });
  };
  const prevEventRef = useRef(eventId);

  useEffect(() => {
    if (!eventId) return;
    // Same mounted route across events (/reel/evt1 -> /reel/evt2): drop the
    // old event's photos, name, and gates before the fresh fetch lands, or
    // guests export evt1 photos under evt2 gating.
    if (prevEventRef.current !== eventId) {
      prevEventRef.current = eventId;
      setNames(
        state.photos && state.photos.length > 0
          ? state.photos.map((p) => p.name)
          : readCachedNames(eventId)
      );
      let cachedName = "";
      try {
        cachedName = sessionStorage.getItem(`fy-event-name-${eventId}`) || "";
      } catch {
        cachedName = "";
      }
      setEventName(state.eventName || cachedName);
      setPaywall(null);
    } else if (state.photos && state.photos.length > 0) {
      setNames(state.photos.map((p) => p.name));
    }
    fetch(`${API_URL}/collect_event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: eventId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const ev: unknown =
          data && typeof data === "object" && "event" in data ? data.event : data;
        // Fail-closed like the camera flow: hydrate the lead flag so export
        // gating can't be bypassed on fresh deep links.
        const gate = ev && typeof ev === "object" && "requireLead" in ev ? ev.requireLead === true : false;
        try {
          sessionStorage.setItem(`fy-require-lead-${eventId}`, gate ? "1" : "0");
        } catch {
          // best-effort
        }
        if (ev && typeof ev === "object" && "event_name" in ev) {
          const n = String(ev.event_name);
          setEventName((prev) => {
            const next = prev || n;
            try {
              sessionStorage.setItem(`fy-event-name-${eventId}`, n);
            } catch {
              // best-effort
            }
            return next;
          });
        }
        if (ev && typeof ev === "object" && "paywall" in ev && ev.paywall && typeof ev.paywall === "object") {
          const pw = ev.paywall as Record<string, unknown>;
          setPaywall({
            enabled: pw.enabled === true,
            stage:
              pw.stage === "batch_download" ||
              pw.stage === "watermark_removal" ||
              pw.stage === "entry"
                ? pw.stage
                : "download",
            freePhotoLimit: typeof pw.freePhotoLimit === "number" ? pw.freePhotoLimit : 2,
          });
        }
      })
      .catch(() => undefined);
  }, [eventId, state.photos, state.eventName]);

  const photos: ReelPhoto[] = useMemo(() => names.map((name) => ({ name, url: photoUrl(name) })), [names]);

  const eligible = (filename: string): boolean => isPhotoEligible(eventId, paywall, filename);

  if (!eventId) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 container mx-auto max-w-3xl px-4 py-10 space-y-4">
          <h1 className="text-xl font-bold">Event link expired</h1>
          <p className="text-sm text-muted-foreground">Rescan the event QR code to create a reel.</p>
          <Button onClick={() => navigate("/")} className="min-h-[44px]">
            Return to Home
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
            onClick={() => backToPhotos()}
            aria-label="Back to photos"
          >
            ← Photos
          </Button>
          <span className="text-xs text-muted-foreground">
            {photos.length > 0 ? `${photos.length} photos ready` : "Reel studio"}
          </span>
        </div>
        {photos.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-6 text-center">
            <h1 className="text-xl font-bold">No photos yet</h1>
            <p className="text-sm text-muted-foreground">
              Find your photos with a selfie first — then come back here to turn them into a reel.
            </p>
            <Button
              onClick={() => {
                try {
                  sessionStorage.setItem("fy-last-event", eventId);
                } catch {
                  // best-effort
                }
                navigate("/camera", { state: eventId });
              }}
              className="min-h-[44px]"
            >
              Find my photos →
            </Button>
          </div>
        ) : (
          <ReelCreatorModal
            open={true}
            onOpenChange={() => backToPhotos()}
            eventId={eventId}
            eventName={eventName}
            photos={photos}
            isPhotoEligible={eligible}
            onGatedPhoto={() => {
              // The unlock UI (lead form / paywall) lives on the camera flow —
              // send guests there instead of bouncing them with no path.
              toast("Complete gallery access on the photos screen — then export your reel.");
              navigate("/camera", { state: eventId });
            }}
            asPage={true}
          />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ReelPage;
