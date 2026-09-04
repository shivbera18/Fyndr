import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/api";
import Header from "../navbar/Header";
import Footer from "../Footer";
import DisplayEvent from "./Display_event";
import InEvent from "./InEvent";
import PhotographerDetail from "./Photographer_detail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ImagePlus, RefreshCw } from "lucide-react";
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
};

type TabId = "events" | "create" | "studio";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "events", label: "My Events" },
  { id: "create", label: "Create New Event" },
  { id: "studio", label: "Studio Branding" },
];

export default function Dashboard(): React.JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const generateRandomPin = () => {
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(random);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setCreateError("");
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
      if (coverFile) {
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
        setCoverFile(null);
        setCoverPreview("");
        // Select the newly created event
        const createdId = data._id || data.eventID || (data.event && data.event._id);
        if (createdId) {
          setSelectedEvent({
            eventID: createdId,
            name: eventName,
            pin: pin,
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        {/* Page Head */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Photographer dashboard
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Welcome back, {user?.name || "Photographer"}! Manage your event galleries and guest access.
            </p>
          </div>
          {!selectedEvent && (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="font-mono">
                ● Online
              </Badge>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        {!selectedEvent && (
          <div className="flex items-center gap-2 border-b border-border overflow-x-auto scrollbar-hide py-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px]",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                  Set up a photo sharing event for your clients and guests.
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
                            Click to change cover photo
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                          <ImagePlus className="h-8 w-8 text-muted-foreground/60" />
                          <span className="text-sm font-medium text-foreground">
                            Click to select event cover photo
                          </span>
                          <span className="text-xs">PNG, JPG, WEBP up to 10MB</span>
                        </div>
                      )}
                    </label>
                  </div>

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
        ) : activeTab === "studio" ? (
          <PhotographerDetail />
        ) : (
          <DisplayEvent
            refresh={refreshKey}
            onclick={(eventID, name, display_pin) => {
              setSelectedEvent({ eventID, name, pin: display_pin });
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
