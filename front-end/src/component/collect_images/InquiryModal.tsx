import React, { useEffect, useState } from "react";
import { ResponsiveModal } from "../../components/ui/responsive-modal";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { API_URL } from "../../utils/api";
import { trackEvent } from "../../utils/analytics";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";

export interface InquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  studioName?: string;
  initialName?: string;
  initialPhone?: string;
}

export const InquiryModal = ({
  open,
  onOpenChange,
  eventId,
  studioName,
  initialName,
  initialPhone,
}: InquiryModalProps): React.JSX.Element => {
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setError("");
      setSubmitted(false);
      try {
        const cachedName = initialName || sessionStorage.getItem("fyndr_guest_name") || "";
        const cachedPhone = initialPhone || sessionStorage.getItem("fyndr_guest_phone") || "";
        setName(cachedName);
        setPhone(cachedPhone);
      } catch {
        setName(initialName || "");
        setPhone(initialPhone || "");
      }
    }
  }, [open, initialName, initialPhone]);

  const targetStudio = studioName?.trim() || "the photographer";

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!eventId || busy) return;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || !cleanPhone) {
      setError("Please provide your name and phone number.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          name: cleanName.slice(0, 100),
          phone: cleanPhone.slice(0, 20),
          kind: "booking",
          message: message.trim().slice(0, 500),
        }),
      });

      if (res.status === 429) {
        setError("Too many inquiries sent for this event right now — please try again later.");
        return;
      }
      if (res.status >= 500) {
        setError("Server busy — please try again in a moment.");
        return;
      }
      if (res.status === 400 || res.status === 422) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Please check your phone number and details.");
        return;
      }
      if (!res.ok) {
        setError("Could not send inquiry. Please try again.");
        return;
      }

      try {
        // High-intent booking satisfies lead gate so guests aren't re-prompted to download
        sessionStorage.setItem(`fy-lead-${eventId}`, "1");
        sessionStorage.setItem("fyndr_guest_name", cleanName);
        sessionStorage.setItem("fyndr_guest_phone", cleanPhone);
      } catch {
        // best-effort session storage
      }

      trackEvent(eventId, "booking_inquiry", {
        hasMessage: Boolean(message.trim()),
      });

      setSubmitted(true);
    } catch {
      setError("Could not submit inquiry. Please check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const waText = encodeURIComponent(
    `Hi ${targetStudio}, I saw your photography on Fyndr and would love to inquire about booking a session!`
  );
  const waUrl = `https://api.whatsapp.com/send?text=${waText}`;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={submitted ? "Inquiry Sent!" : `Inquire with ${targetStudio}`}
      description={
        submitted
          ? `We've forwarded your details to ${targetStudio}.`
          : `Interested in hiring ${targetStudio} for your upcoming wedding or event? Leave your contact info below.`
      }
    >
      {submitted ? (
        <div className="space-y-4 pt-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Thank you, {name.trim() || "Guest"}!
            </p>
            <p className="text-xs text-muted-foreground">
              {targetStudio} will get in touch with you shortly.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp instead ↗
            </a>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] w-full"
            >
              Back to Gallery
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
          {error ? (
            <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="inquiry-name" className="text-xs font-semibold">Your Name *</Label>
            <Input
              id="inquiry-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Priya Sharma"
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inquiry-phone" className="text-xs font-semibold">Phone / WhatsApp Number *</Label>
            <Input
              id="inquiry-phone"
              type="tel"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
              maxLength={20}
              placeholder="+91 98765 43210"
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="inquiry-message" className="text-xs font-semibold">Message (Optional)</Label>
              <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
            </div>
            <textarea
              id="inquiry-message"
              rows={3}
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              maxLength={500}
              placeholder="Tell them about your event date, location, or requirements..."
              className="w-full rounded-xl border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] font-semibold flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {busy ? "Sending Inquiry…" : "Send Inquiry →"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Prefer WhatsApp?{" "}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-500 dark:text-emerald-400"
              >
                Chat directly ↗
              </a>
            </p>
          </div>
        </form>
      )}
    </ResponsiveModal>
  );
};

export default InquiryModal;
