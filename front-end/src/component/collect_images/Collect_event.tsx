import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { API_URL } from "../../utils/api";
import { KeyRound, Loader2 } from "lucide-react";

type EventData = {
  event_name: string;
  event_photo?: string;
};

type StudioData = {
  studio_name: string;
};

const CollectEvent = (): React.JSX.Element => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [studioData, setStudioData] = useState<StudioData | null>(null);
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const fetchEvent = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/collect_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventId }),
      });
      const data = await res.json();
      const ev = (data && data.event) ? data.event : data;
      if (ev && ev.event_name) {
        setEventData(ev);
        const std = (data && data.studio) ? data.studio : data;
        if (std && std.studio_name) {
          setStudioData({ studio_name: std.studio_name });
        }
        if (eventId) {
          sessionStorage.setItem("fy-last-event", eventId);
        }
      } else {
        setErrorMessage(data?.message || "Event not found or has expired.");
      }
    } catch {
      setErrorMessage("Could not connect to event server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      void fetchEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handlePinSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage("Please enter the 6-digit access PIN.");
      return;
    }

    setVerifying(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/confirm_pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventId, pin: pin.trim() }),
      });

      const data = await res.json();
      if (res.ok && (data.pin !== undefined || data.result === "Pin confirmed")) {
        // PIN Verified -> Navigate to Camera Selfie Matching screen
        if (eventId) {
          sessionStorage.setItem("fy-last-event", eventId);
        }
        navigate("/camera", { state: eventId });
      } else {
        setErrorMessage(data.result || data.message || "Incorrect PIN. Contact the photographer or host.");
      }
    } catch {
      setErrorMessage("Could not verify PIN. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-md px-4 py-8 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading event details…</p>
          </div>
        ) : eventData ? (
          <Card className="shadow-md">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-3">
                {eventData.event_photo && (
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-border bg-muted">
                    <img
                      src={`${API_URL}/event_profile/${eventData.event_photo}`}
                      alt={eventData.event_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <Badge variant="brand">Guest photo portal</Badge>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {eventData.event_name}
                </h1>
                {studioData && (
                  <p className="text-xs text-muted-foreground">
                    Photography by <span className="font-semibold text-foreground">{studioData.studio_name}</span>
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20 text-center">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fy-pin" className="block text-center font-medium">
                    6-digit event PIN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fy-pin"
                    name="pin"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    value={pin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value)}
                    required
                    className="h-12 min-h-[48px] text-center tracking-[0.3em] font-mono text-xl font-bold"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Check your table card or ask the event host for the PIN.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={verifying}
                  loading={verifying}
                  size="lg"
                  className="w-full min-h-[48px] text-base flex items-center justify-center gap-2"
                >
                  <KeyRound className="h-4 w-4" />
                  {verifying ? "Verifying…" : "Unlock Gallery & Find My Photos →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center">
            <CardContent className="p-8 space-y-4">
              <Badge variant="secondary">Event unavailable</Badge>
              <h1 className="text-xl font-bold tracking-tight">Event Not Found</h1>
              {errorMessage ? (
                <div className="rounded-lg p-3 text-sm border bg-destructive/10 text-destructive border-destructive/20">
                  {errorMessage}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This event link may have expired or is not active. Please verify the URL with the host.
                </p>
              )}
              <Button onClick={() => navigate("/")} className="min-h-[44px] w-full">
                Go to Fyndr Home
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CollectEvent;
