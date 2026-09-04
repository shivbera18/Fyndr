import { useEffect, useState } from "react";
import { API_URL } from "../../utils/api";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Loader2 } from "lucide-react";

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
      const res = await fetch(`${API_URL}/display_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      } else if (data && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch {
      setFetchError("Unable to load events. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading your events…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive">
        <p className="font-medium mb-3">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={() => fetchEvents()}>
          Retry
        </Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="text-center py-12 px-4">
        <CardContent className="space-y-3">
          <h3 className="text-lg font-semibold">No events created yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create your first event album to start uploading photos and distributing guest QR codes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Your active events</h2>
        <Badge variant="secondary">
          {events.length} event{events.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, index) => {
          const coverUrl = event.event_photo
            ? `${API_URL}/event_profile/${event.event_photo}`
            : "/images/wedding.jpg";
          return (
            <Card key={event._id || index} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden">
                <img
                  src={coverUrl}
                  alt={event.event_name}
                  loading="lazy"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.onerror = null;
                    t.src = PLACEHOLDER;
                  }}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>

              <CardContent className="p-5 flex flex-col justify-between flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1 text-foreground">
                    {event.event_name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      PIN: {event.pin || "123456"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {(event._id || "").slice(-6)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full min-h-[44px]"
                  onClick={() => onclick(event._id, event.event_name, event.pin || "123456")}
                >
                  Open album &amp; upload →
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
