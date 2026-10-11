import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { PageShell, Callout, EmptyState, StepGuide } from "../../components/ui/page-kit";
import "../../components/ui/editorial.css";
import { API_URL } from "../../utils/api";
import { trackEvent, recordAccessAttempt } from "../../utils/analytics";
import { Camera, KeyRound, Loader2 } from "lucide-react";
import { InquiryModal } from "./InquiryModal";
type EventData = {
  event_name: string;
  event_photo?: string;
  requireLead?: boolean;
  pin?: number | string;
};

type StudioData = {
  studio_name: string;
};

const PIN_LENGTH = 6;

const CollectEvent = (): React.JSX.Element => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [studioData, setStudioData] = useState<StudioData | null>(null);
  const [guestName, setGuestName] = useState<string>(() => (typeof sessionStorage !== "undefined" && sessionStorage.getItem("fyndr_guest_name")) || "");
  const [showInquiry, setShowInquiry] = useState<boolean>(false);
  const [guestPhone, setGuestPhone] = useState<string>(() => (typeof sessionStorage !== "undefined" && sessionStorage.getItem("fyndr_guest_phone")) || "");
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

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
      trackEvent(eventId, "page_view");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const setPinBox = (index: number, digit: string): void => {
    const clean = digit.replace(/\D/g, "").slice(-1);
    const chars = pin.padEnd(PIN_LENGTH, " ").split("").slice(0, PIN_LENGTH);
    chars[index] = clean || " ";
    setPin(chars.join("").trim());
    if (clean && index < PIN_LENGTH - 1) pinRefs.current[index + 1]?.focus();
  };

  const handlePinBoxKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Backspace" && !(e.target as HTMLInputElement).value && index > 0) {
      e.preventDefault();
      const chars = pin.padEnd(PIN_LENGTH, " ").split("").slice(0, PIN_LENGTH);
      chars[index - 1] = " ";
      setPin(chars.join("").trim());
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!text) return;
    e.preventDefault();
    setPin(text);
    pinRefs.current[Math.min(text.length, PIN_LENGTH - 1)]?.focus();
  };
  const handlePinSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!eventId) return;
    if (!guestName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!guestPhone.trim()) {
      setErrorMessage("Please enter your mobile or WhatsApp number.");
      return;
    }
    const isPinFree = Boolean(eventData && (eventData.pin === 0 || !eventData.pin));
    if (!isPinFree && !pin.trim()) {
      setErrorMessage("Please enter the access PIN.");
      return;
    }

    setVerifying(true);
    setErrorMessage("");

    try {
      const data = await recordAccessAttempt(eventId, guestName.trim(), guestPhone.trim(), pin.trim());
      if (data.ok && data.verified) {
        if (eventId) {
          sessionStorage.setItem("fy-last-event", eventId);
          sessionStorage.setItem(`fy-require-lead-${eventId}`, eventData?.requireLead ? "1" : "0");
        }
        navigate("/camera", { state: eventId });
      } else {
        setErrorMessage(data.message || "Incorrect PIN. Contact the photographer or host.");
      }
    } catch {
      setErrorMessage("Could not verify PIN. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const isPinFree = Boolean(eventData && (eventData.pin === 0 || !eventData.pin));
  const pinChars = pin.padEnd(PIN_LENGTH, " ").split("").slice(0, PIN_LENGTH);

  return (
    <PageShell header={<Header />} footer={<Footer />} maxWidth="max-w-md">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading event details…</p>
        </div>
      ) : eventData ? (
        <Card className="border-black/10 bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-3">
              {eventData.event_photo && (
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-black/10 bg-muted shadow-sm">
                  <img
                    src={`${API_URL}/event_profile/${eventData.event_photo}`}
                    alt={eventData.event_name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <p className="rk-kicker">Guest photo portal</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {eventData.event_name}
              </h1>
              {studioData && (
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span>
                    Photography by <span className="font-semibold text-foreground">{studioData.studio_name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInquiry(true)}
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    Book Studio ↗
                  </button>
                </div>
              )}
              <Badge variant="brand">
                <Camera className="mr-1 h-3 w-3" />
                Selfie finds your photos — no app needed
              </Badge>
            </div>

            {errorMessage && (
              <div role="alert" className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20 text-center">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="guestName" className="font-medium text-sm">
                  Your Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guestName"
                  name="guestName"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={guestName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuestName(e.target.value)}
                  required
                  autoComplete="name"
                  className="min-h-[52px] text-base"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="guestPhone" className="font-medium text-sm">
                  Mobile / WhatsApp Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guestPhone"
                  name="guestPhone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={guestPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuestPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  className="min-h-[52px] text-base"
                />
              </div>

              <Callout variant="info" title="Why do we need this?">
                Your name labels your matches and your number delivers the gallery link on WhatsApp.
                Your selfie is used only for matching and never stored.
              </Callout>

              {isPinFree ? (
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-1">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block font-mono">
                    Public Event · Zero PIN Needed
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Instant access granted by the photographer.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="fy-pin-0" className="block text-center font-medium">
                    6-digit event PIN <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center justify-center gap-2" role="group" aria-label="6-digit event PIN">
                    {pinChars.map((ch, i) => (
                      <input
                        key={i}
                        id={i === 0 ? "fy-pin-0" : undefined}
                        ref={(el) => {
                          pinRefs.current[i] = el;
                        }}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        aria-label={`PIN digit ${i + 1}`}
                        placeholder="•"
                        value={ch.trim()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinBox(i, e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handlePinBoxKeyDown(i, e)}
                        onPaste={handlePinPaste}
                        required={i === 0}
                        className="h-[52px] w-11 min-h-[52px] rounded-lg border border-input bg-background text-center font-mono text-xl font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                    ))}
                  </div>
                  <input type="hidden" name="pin" value={pin} />
                  <p className="text-xs text-muted-foreground text-center">
                    Check your table card or ask the event host for the PIN.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={verifying}
                loading={verifying}
                size="lg"
                className="w-full min-h-[52px] text-base flex items-center justify-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {verifying ? "Verifying…" : "Unlock Gallery & Find My Photos →"}
              </Button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate(`/select/${eventId}`)}
                  className="min-h-[44px] text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                >
                  Can't take a selfie? Browse full event album without selfie →
                </button>
              </div>
            </form>

            <StepGuide
              steps={[
                { title: "Unlock", body: "Enter your details and the event PIN." },
                { title: "Selfie", body: "One front-camera photo — deleted right after matching." },
                { title: "Gallery", body: "Download and share only the photos you're in." },
              ]}
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="Event Not Found"
          body={
            errorMessage ? (
              <span role="alert">{errorMessage}</span>
            ) : (
              "This event link may have expired or is not active. Please verify the URL with the host."
            )
          }
          actions={
            <Button onClick={() => navigate("/")} className="min-h-[44px]">
              Go to Fyndr Home
            </Button>
          }
        />
      )}
      <InquiryModal
        open={showInquiry}
        onOpenChange={setShowInquiry}
        eventId={eventId || ""}
        studioName={studioData?.studio_name}
        initialName={guestName}
        initialPhone={guestPhone}
      />
    </PageShell>
  );
};

export default CollectEvent;
