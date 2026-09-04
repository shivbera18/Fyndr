import { useEffect, useState } from "react";
import { API_URL } from "../../utils/api";
import { Banner, Button, Reveal } from "../landing/primitives";

type EventItem = {
  _id: string;
  event_name: string;
  pin?: string;
  event_photo?: string;
};

type Props = {
  refresh?: number;
  onclick: (eventID: string, name: string, pin: string) => void;
  onQrClick?: (eventID: string) => void;
};

const PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' fill='%236b7280' font-family='sans-serif' font-size='24' text-anchor='middle' dy='.35em'%3EEvent%3C/text%3E%3C/svg%3E";

export default function Display_event({ refresh, onclick }: Props): React.JSX.Element {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const fetchEvents = async () => {
    const userString = localStorage.getItem("user");
    if (!userString) return;
    try {
      const user = JSON.parse(userString);
      setLoading(true);
      setFetchError("");
      const res = await fetch(`${API_URL}/display_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data as EventItem[]);
      } else {
        setEvents([]);
      }
    } catch {
      setFetchError("Could not load events from server. Please verify the API is running.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [refresh]);

  if (loading) {
    return (
      <div className="fy-loading-row" role="status">
        <span className="fy-spinner" aria-hidden="true" />
        <span>Loading your events…</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <Reveal>
        <Banner kind="error">{fetchError}</Banner>
        <div style={{ marginTop: "1rem" }}>
          <Button variant="secondary" size="sm" onClick={fetchEvents}>
            Retry
          </Button>
        </div>
      </Reveal>
    );
  }

  if (events.length === 0) {
    return (
      <Reveal>
        <div className="fy-empty">
          <h3>No events created yet</h3>
          <p>Create your first event to start uploading photos and generating guest QR codes.</p>
        </div>
      </Reveal>
    );
  }

  return (
    <div>
      <div className="fy-page-head">
        <h2>Your active events</h2>
        <span className="fy-badge">
          {events.length} event{events.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="fy-grid">
        {events.map((event, index) => {
          const coverUrl = event.event_photo
            ? `${API_URL}/event_profile/${event.event_photo}`
            : "/images/wedding.jpg";
          return (
            <Reveal key={event._id || index} delay={(index % 8) * 40}>
              <article className="fy-card">
                <div style={{ marginBottom: "1rem" }}>
                  <img
                    src={coverUrl}
                    alt={event.event_name}
                    loading="lazy"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.onerror = null;
                      t.src = PLACEHOLDER;
                    }}
                    style={{ width: "100%", height: "11rem", objectFit: "cover", borderRadius: "0.5rem" }}
                  />
                </div>
                <h3>{event.event_name}</h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "0.5rem 0 1rem",
                  }}
                >
                  <span className="fy-badge">PIN: {event.pin || "123456"}</span>
                  <small className="fy-micro">ID: {(event._id || "").slice(-6)}</small>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onclick(event._id, event.event_name, event.pin || "123456")}
                >
                  Open album &amp; upload →
                </Button>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
