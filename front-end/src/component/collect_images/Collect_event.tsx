import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../landing.css";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Banner, Button, Reveal } from "../landing/primitives";
import { API_URL } from "../../utils/api";

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
      setLoading(true);
      const res = await fetch(`${API_URL}/collect_event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: eventId }),
      });

      const data = await res.json();
      if (res.ok && data.event) {
        setEventData(data.event as EventData);
        setStudioData((data.studio as StudioData | undefined) ?? null);
      } else {
        setErrorMessage(data.message || "Event not found or inactive.");
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
      if (data.pin) {
        // PIN Verified -> Navigate to Camera Selfie Matching screen
        navigate("/camera", { state: eventId });
      } else {
        setErrorMessage(data.result || "Incorrect PIN. Contact the photographer or host.");
      }
    } catch {
      setErrorMessage("Could not verify PIN. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="fy-page fy-container">
        <div className="fy-auth-wrap">
          {loading ? (
            <div className="fy-loading-row" role="status">
              <span className="fy-spinner" aria-hidden="true" />
              <span>Loading event details…</span>
            </div>
          ) : eventData ? (
            <Reveal className="fy-auth-card">
              <div className="fy-card">
                <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                  {eventData.event_photo && (
                    <img
                      src={`${API_URL}/event_profile/${eventData.event_photo}`}
                      alt={eventData.event_name}
                      style={{
                        width: "100%",
                        height: "160px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid var(--fy-border)",
                        marginBottom: "1rem",
                      }}
                    />
                  )}
                  <span className="fy-badge fy-badge-brand">Guest photo portal</span>
                  <h1 style={{ margin: "0.75rem 0 0.25rem" }}>{eventData.event_name}</h1>
                  {studioData && (
                    <p className="fy-micro">
                      Photography by <strong>{studioData.studio_name}</strong>
                    </p>
                  )}
                </div>

                {errorMessage && <Banner kind="error">⚠ {errorMessage}</Banner>}

                <form onSubmit={handlePinSubmit} className="fy-form" style={{ marginTop: "1rem" }}>
                  <div className="fy-field">
                    <label className="fy-label" htmlFor="fy-pin">
                      6-digit event PIN
                      <span className="req" aria-hidden="true">
                        {" *"}
                      </span>
                    </label>
                    <input
                      id="fy-pin"
                      name="pin"
                      className="fy-input"
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="••••••"
                      value={pin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value)}
                      required
                      style={{
                        textAlign: "center",
                        letterSpacing: "0.3em",
                        fontWeight: 800,
                        fontSize: "1.25rem",
                      }}
                    />
                    <span className="fy-help">
                      Check your table card or ask the event host for the PIN.
                    </span>
                  </div>

                  <button
                    className="fy-btn fy-btn-default fy-btn-lg"
                    type="submit"
                    disabled={verifying}
                    style={{ width: "100%" }}
                  >
                    {verifying ? "Verifying…" : "Unlock Gallery & Find My Photos →"}
                  </button>
                </form>
              </div>
            </Reveal>
          ) : (
            <Reveal className="fy-auth-card">
              <div className="fy-card" style={{ textAlign: "center" }}>
                <span className="fy-badge">Event unavailable</span>
                <h1 style={{ margin: "0.75rem 0 0.5rem" }}>Event Not Found</h1>
                {errorMessage ? (
                  <Banner kind="error">⚠ {errorMessage}</Banner>
                ) : (
                  <p className="fy-micro">
                    This event link may have expired or is not active. Please verify the URL with
                    the host.
                  </p>
                )}
                <div style={{ marginTop: "1rem" }}>
                  <Button variant="default" onClick={() => navigate("/")}>
                    Go to Fyndr Home
                  </Button>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CollectEvent;
