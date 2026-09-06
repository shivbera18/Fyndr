import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/api";
import Header from "../navbar/Header";
import Footer from "../Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
  ImagePlus,
  Lock,
  LockOpen,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Calendar,
} from "lucide-react";

type StoredUser = {
  _id: string;
  name?: string;
  email?: string;
};

export default function CreateEventPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);

  // Form State
  const [eventName, setEventName] = useState("");
  const [requirePin, setRequirePin] = useState(true);
  const [pin, setPin] = useState("123456");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      navigate("/login");
      return;
    }
    try {
      setUser(JSON.parse(userString));
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const generateRandomPin = () => {
    const rand = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(rand);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setCreateError("Event name is required.");
      return;
    }

    if (requirePin && (!pin.trim() || pin.trim().length < 4)) {
      setCreateError("PIN must be at least 4 characters long.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const formData = new FormData();
      formData.append("event_name", eventName.trim());
      formData.append("pin", requirePin ? pin.trim() : "");
      formData.append("no_pin", requirePin ? "false" : "true");
      formData.append("created_id", user?._id || "");
      formData.append("create_by", user?._id || "");
      if (coverFile) {
        formData.append("event_photo", coverFile);
        formData.append("event_profile", coverFile);
      }

      const res = await fetch(`${API_URL}/event`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data) {
        navigate("/dashboard");
      } else {
        setCreateError(data.message || "Failed to create event.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-card">
            <Calendar className="size-3.5 text-emerald-500" />
            New Gallery
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Create New Event
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up a live photo sharing gallery for your clients, attendees, and guests.
          </p>
        </div>

        <Card className="border border-border shadow-sm bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Event Configuration</CardTitle>
            <CardDescription className="text-xs">
              Configure event details, guest security, and gallery access permissions.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {createError && (
              <div className="mb-6 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Name */}
              <div className="space-y-2">
                <Label htmlFor="create-event-name" className="text-sm font-semibold">
                  Event Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-event-name"
                  type="text"
                  placeholder="e.g. Prianka & Rohan Wedding Reception"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  className="min-h-[44px]"
                />
              </div>

              {/* Cover Photo */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Event Cover Image (Optional)</Label>
                <div className="flex items-center gap-4">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="size-20 rounded-xl object-cover border border-border shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="size-20 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground shrink-0">
                      <ImagePlus className="size-6" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <input
                      type="file"
                      id="create-cover-file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("create-cover-file")?.click()}
                      className="min-h-[44px] text-xs font-semibold"
                    >
                      Choose Cover Image
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Displayed on table QR standees and guest welcome screens.
                    </p>
                  </div>
                </div>
              </div>

              {/* PIN Access Settings */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {requirePin ? (
                        <Lock className="size-4 text-emerald-500" />
                      ) : (
                        <LockOpen className="size-4 text-amber-500" />
                      )}
                      <span className="font-semibold text-sm text-foreground">
                        Require PIN for Guest Access
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {requirePin
                        ? "Guests must enter a PIN after scanning the QR code."
                        : "Public event — guests can access the gallery directly without typing a PIN."}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={requirePin}
                    onClick={() => setRequirePin(!requirePin)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
                      requirePin ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                        requirePin ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {requirePin ? (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="create-event-pin" className="text-xs font-semibold">
                        Event PIN (4–6 digits)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={generateRandomPin}
                        className="h-8 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono gap-1"
                      >
                        <RefreshCw className="size-3" />
                        Generate Random
                      </Button>
                    </div>
                    <Input
                      id="create-event-pin"
                      type="text"
                      placeholder="e.g. 123456"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      maxLength={24}
                      className="min-h-[44px] font-mono tracking-widest text-lg font-bold"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-mono pt-1">
                    <Sparkles className="size-3.5" />
                    <span>Public Access: Zero friction for guests. Can be enabled anytime later.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto min-h-[44px] px-6 font-semibold flex items-center justify-center gap-2"
                >
                  {creating ? "Creating event…" : "Create Event"}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
