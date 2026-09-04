import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/api";
import "../../landing.css";
import Header from "../navbar/Header";
import Footer from "../Footer";
import DisplayEvent from "./Display_event";
import InEvent from "./InEvent";
import PhotographerDetail from "./Photographer_detail";
import { Banner, Button, Field, Reveal, Tabs } from "../landing/primitives";

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
    const auth = localStorage.getItem("user");
    if (!auth) {
      navigate("/login");
    } else {
      try {
        setUser(JSON.parse(auth) as StoredUser);
      } catch {
        navigate("/login");
      }
    }
  }, [navigate]);

  const generateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(randomPin);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    if (id === "create" && !pin) generateRandomPin();
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setCreateError("Event name is required.");
      return;
    }
    if (!user) {
      navigate("/login");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const formData = new FormData();
      formData.append("event_name", eventName.trim());
      formData.append("created_id", user._id);
      formData.append("pin", pin.trim() || "123456");
      if (coverFile) {
        formData.append("name", coverFile);
      }

      const res = await fetch(`${API_URL}/event`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data._id) {
        setEventName("");
        setPin("");
        setCoverFile(null);
        setCoverPreview("");
        setRefreshKey((prev) => prev + 1);
        // Automatically open created event
        setSelectedEvent({
          eventID: data._id,
          name: data.event_name,
          pin: data.pin,
        });
      } else {
        setCreateError(data.message || data.error || "Failed to create event.");
      }
    } catch {
      setCreateError("Could not connect to API server.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Header />
      <div className="fy-page fy-container">
        <Reveal>
          <div className="fy-page-head">
            <div>
              <h1>Photographer dashboard</h1>
              <p className="fy-lede" style={{ marginBottom: 0 }}>
                Welcome back, {user?.name || "Photographer"}! Manage your event galleries and
                guest access.
              </p>
            </div>
            {!selectedEvent && (
              <div className="fy-page-actions">
                <span className="fy-badge">Online</span>
              </div>
            )}
          </div>
        </Reveal>

        {!selectedEvent && (
          <Reveal delay={60}>
            <Tabs tabs={TABS} active={activeTab} onChange={handleTabChange} />
          </Reveal>
        )}

        {selectedEvent ? (
          <Reveal delay={60}>
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
          </Reveal>
        ) : activeTab === "create" ? (
          <Reveal delay={60}>
            <div className="fy-card" style={{ maxWidth: "42rem", margin: "0 auto" }}>
              <h3>Create new event</h3>
              {createError && (
                <div style={{ margin: "1rem 0" }}>
                  <Banner kind="error">{createError}</Banner>
                </div>
              )}

              <form className="fy-form" onSubmit={handleCreateEvent}>
                <Field
                  label="Event name"
                  name="eventName"
                  value={eventName}
                  onChange={setEventName}
                  required
                  placeholder="e.g. Rachel & Ross Wedding Reception"
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "0.625rem",
                    alignItems: "end",
                  }}
                >
                  <Field
                    label="Guest access PIN (6 digits)"
                    name="pin"
                    value={pin}
                    onChange={setPin}
                    required
                    placeholder="e.g. 123456"
                  />
                  <Button variant="secondary" size="md" onClick={generateRandomPin}>
                    Randomize
                  </Button>
                </div>

                <div>
                  <span className="fy-label">Event cover photo (optional)</span>
                  <div
                    className="fy-dropzone"
                    style={{ marginTop: "0.375rem" }}
                    onClick={() => document.getElementById("cover-image-input")?.click()}
                  >
                    <input
                      id="cover-image-input"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleCoverChange}
                    />
                    {coverPreview ? (
                      <div>
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          style={{ height: "8.75rem", objectFit: "cover", borderRadius: "0.5rem" }}
                        />
                        <div style={{ marginTop: "0.5rem" }}>
                          <strong>Click to change cover photo</strong>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>Click to select event cover photo</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
                  <Button variant="outline" size="lg" onClick={() => setActiveTab("events")}>
                    Cancel
                  </Button>
                  <button
                    className="fy-btn fy-btn-default fy-btn-lg"
                    type="submit"
                    disabled={creating}
                    style={{ flex: 1 }}
                  >
                    {creating ? "Creating…" : "Create event & open album →"}
                  </button>
                </div>
              </form>
            </div>
          </Reveal>
        ) : activeTab === "studio" ? (
          <PhotographerDetail />
        ) : (
          <Reveal delay={60}>
            <DisplayEvent
              refresh={refreshKey}
              onclick={(eventID, name, display_pin) => {
                setSelectedEvent({ eventID, name, pin: display_pin });
              }}
            />
          </Reveal>
        )}
      </div>
      <Footer />
    </>
  );
}
