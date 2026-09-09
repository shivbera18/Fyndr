import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Header from "../../navbar/Header";
import Footer from "../../Footer";
import { Button } from "../../../components/ui/button";
import ReelCreatorModal from "./ReelCreatorModal";
import { API_URL } from "../../../utils/api";

interface ReelPhoto {
  name: string;
  url: string;
}

interface LocationState {
  photos?: { name: string; url?: string }[];
  eventName?: string;
}

interface PaywallConfig {
  enabled: boolean;
  stage: "download" | "batch_download" | "watermark_removal" | "entry";
  freePhotoLimit: number;
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
  const [paywall, setPaywall] = useState<PaywallConfig | null>(null);
  const [names, setNames] = useState<string[]>(() => {
    if (state.photos && state.photos.length > 0) return state.photos.map((p) => p.name);
    return eventId ? readCachedNames(eventId) : [];
  });

  useEffect(() => {
    if (!eventId) return;
    sessionStorage.setItem("fy-last-event", eventId);
    if (state.photos && state.photos.length > 0) {
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
  }, [eventId]);

  const photos: ReelPhoto[] = useMemo(() => names.map((name) => ({ name, url: photoUrl(name) })), [names]);

  const isPhotoEligible = (filename: string): boolean => {
    if (paywall?.enabled) {
      if (paywall.stage === "download" || paywall.stage === "watermark_removal") {
        try {
          const stored = sessionStorage.getItem(`fy-unlocked-photos-${eventId}`);
          const list: unknown = stored ? JSON.parse(stored) : [];
          const unlockedAlbum = sessionStorage.getItem(`fy-unlocked-album-${eventId}`) === "1";
          if (!unlockedAlbum && (!Array.isArray(list) || !list.includes(filename))) return false;
        } catch {
          return false;
        }
      }
      if (paywall.stage === "batch_download") {
        const unlockedAlbum = sessionStorage.getItem(`fy-unlocked-album-${eventId}`) === "1";
        if (!unlockedAlbum) {
          const count = Number(sessionStorage.getItem(`fy-dl-count-${eventId}`) || "0");
          try {
            const stored = sessionStorage.getItem(`fy-unlocked-photos-${eventId}`);
            const list: unknown = stored ? JSON.parse(stored) : [];
            if (count >= paywall.freePhotoLimit && (!Array.isArray(list) || !list.includes(filename)))
              return false;
          } catch {
            return false;
          }
        }
      }
      if (paywall.stage === "entry" && sessionStorage.getItem(`fy-unlocked-album-${eventId}`) !== "1")
        return false;
    }
    if (sessionStorage.getItem(`fy-require-lead-${eventId}`) === "1" && !sessionStorage.getItem(`fy-lead-${eventId}`))
      return false;
    return true;
  };

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
            onClick={() => navigate(-1)}
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
            onOpenChange={() => navigate(-1)}
            eventId={eventId}
            eventName={eventName}
            photos={photos}
            isPhotoEligible={isPhotoEligible}
            onGatedPhoto={() => {
              toast.error("Unlock gallery access first — then export your reel.");
              navigate(-1);
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
