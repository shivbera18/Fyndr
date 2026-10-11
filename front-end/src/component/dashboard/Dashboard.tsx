import { useEffect, useRef, useState, useTransition } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/api";
import Header from "../navbar/Header";
import Footer from "../Footer";
import DisplayEvent from "./Display_event";
import InEvent from "./InEvent";
import PhotographerDetail from "./Photographer_detail";
import StudioAnalytics from "./StudioAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { PageShell, PageHero, StatusBadge, UploadProgressBar } from "../../components/ui/page-kit";
import { ImagePlus, RefreshCw, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

type StoredUser = {
  _id: string;
  name?: string;
  email?: string;
};

type SelectedEvent = {
  eventID: string;
  name: string;
  pin: string;
  ownerId: string;
  folders: { name: string }[];
  selectionLimit: number;
  selectionLocked: boolean;
};

type TabId = "events" | "create" | "analytics" | "studio";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "events", label: "My Events" },
  { id: "create", label: "Create New Event" },
  { id: "analytics", label: "Studio Analytics" },
  { id: "studio", label: "Studio Branding" },
];

type IncomingEventState = {
  newEvent?: {
    eventID: string;
    name: string;
    pin: string;
    ownerId: string;
  };
};

export default function Dashboard(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, startTabTransition] = useTransition();

  // Create Event Form State
  const [eventName, setEventName] = useState("");
  const [pin, setPin] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [user, setUser] = useState<StoredUser | null>(null);

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

  // Open the workspace for an event freshly launched from /create-event.
  useEffect(() => {
    const incoming = (location.state as IncomingEventState | null)?.newEvent;
    if (incoming?.eventID) {
      setSelectedEvent({
        eventID: incoming.eventID,
        name: incoming.name,
        pin: incoming.pin,
        ownerId: incoming.ownerId,
        folders: [],
        selectionLimit: 0,
        selectionLocked: false,
      });
    }
    // ponytail: keyed on the navigation state object; runs once per arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateRandomPin = () => {
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(random);
  };

  // ponytail: revoke one-shot cover blob URL — repeated cover picks leak browser memory.
  const coverPreviewRef = useRef("");
  useEffect(() => {
    return () => {
      if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current);
    };
  }, []);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current);
      coverPreviewRef.current = URL.createObjectURL(file);
      setCoverFile(file);
      setCoverPreview(coverPreviewRef.current);
    }
  };

  const handleTabChange = (id: TabId) => {
    startTabTransition(() => {
      setActiveTab(id);
      setCreateError("");
    });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setCreateError("Event name is required.");
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setCreateError("PIN must be at least 4 digits.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const formData = new FormData();
      formData.append("event_name", eventName.trim());
      formData.append("pin", pin.trim());
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
        // Reset form
        setEventName("");
        setPin("");
        if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current);
        coverPreviewRef.current = "";
        setCoverFile(null);
        setCoverPreview("");
        // Select the newly created event
        const createdId = data._id || data.event?._id || data.eventID || (data.event && data.event._id);
        if (createdId) {
          setSelectedEvent({
            eventID: createdId,
            name: eventName,
            pin: pin,
            ownerId: user?._id || "",
            folders: [],
            selectionLimit: 0,
            selectionLocked: false,
          });
        } else {
          setActiveTab("events");
          setRefreshKey((prev) => prev + 1);
        }
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
    <PageShell header={<Header />} footer={<Footer />} maxWidth="max-w-6xl">
      <div className="space-y-8">
        {!selectedEvent && (
          <PageHero
            align="left"
            kicker={
              <StatusBadge status="ok">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                Live — accepting guest scans
              </StatusBadge>
            }
            title="Photographer dashboard"
            lead={`Welcome back, ${user?.name || "Photographer"} — every gallery, guest list, and QR standee for your studio lives here.`}
            actions={
              <Button
                type="button"
                onClick={() => handleTabChange("create")}
                className="min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                Create new event
              </Button>
            }
          />
        )}

        {/* Tab pills (Desktop Only) */}
        {!selectedEvent && (
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-hide py-1"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap min-h-[44px] border",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-black/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        {selectedEvent ? (
          <InEvent
            eventID={selectedEvent.eventID}
            name={selectedEvent.name}
            pin={selectedEvent.pin}
            ownerId={selectedEvent.ownerId}
            initialFolders={selectedEvent.folders}
            initialLimit={selectedEvent.selectionLimit}
            initialLocked={selectedEvent.selectionLocked}
            backbtn={() => {
              setSelectedEvent(null);
              setRefreshKey((prev) => prev + 1);
            }}
            setRefresh={setRefreshKey}
          />
        ) : activeTab === "create" ? (
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Create new event</CardTitle>
                <CardDescription>
                  Name it, dress it with a cover, set the guest PIN — then launch the gallery.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {createError && (
                  <div className="mb-6 rounded-lg p-4 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20">
                    {createError}
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleCreateEvent}>
                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event name</Label>
                    <Input
                      id="eventName"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                      placeholder="e.g. Rachel & Ross Wedding Reception"
                    />
                  </div>

                  {/* PIN row responsive grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="pin">Guest access PIN (6 digits)</Label>
                      <Input
                        id="pin"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        required
                        placeholder="e.g. 123456"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={generateRandomPin}
                      className="min-h-[40px] sm:min-h-[44px] flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Randomize
                    </Button>
                  </div>

                  {/* Cover photo dropzone */}
                  <div className="space-y-2">
                    <Label htmlFor="cover-image-input">Event cover photo (optional)</Label>
                    <label
                      htmlFor="cover-image-input"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 min-h-[140px] cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <input
                        id="cover-image-input"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleCoverChange}
                      />
                      {coverPreview ? (
                        <div className="flex flex-col items-center gap-2 text-center">
                          <img
                            src={coverPreview}
                            alt="Cover preview"
                            className="h-28 w-auto object-cover rounded-lg shadow-sm"
                          />
                          <span className="text-xs font-medium text-primary hover:underline">
                            Looking good — click to swap the cover scene
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                          <ImagePlus className="h-8 w-8 text-muted-foreground/60" />
                          <span className="text-sm font-medium text-foreground">
                            Drop a cover scene here, or click to browse
                          </span>
                          <span className="text-xs">PNG, JPG or WEBP up to 10MB — shown on QR standees</span>
                        </div>
                      )}
                    </label>
                  </div>

                  {creating ? (
                    <UploadProgressBar value={70} stage="Creating your gallery — setting the PIN and cover…" />
                  ) : (
                    coverPreview && (
                      <UploadProgressBar value={100} stage="Cover photo attached — ready to launch." />
                    )
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setActiveTab("events")}
                      className="min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating}
                      loading={creating}
                      size="lg"
                      className="flex-1 min-h-[44px]"
                    >
                      Create event &amp; open album →
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : activeTab === "analytics" ? (
          <StudioAnalytics userId={user?._id || ""} />
        ) : activeTab === "studio" ? (
          <PhotographerDetail />
        ) : (
          <DisplayEvent
            refresh={refreshKey}
            onclick={(eventID, name, display_pin, ownerId, folders, selectionLimit, selectionLocked) => {
              setSelectedEvent({ eventID, name, pin: display_pin, ownerId, folders, selectionLimit, selectionLocked });
            }}
          />
        )}
      </div>
    </PageShell>
  );
}
