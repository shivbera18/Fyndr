import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';
import NeoInput from '../ui/NeoInput';

const Collect_event = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [studioData, setStudioData] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/collect_event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: eventId }),
      });

      const data = await res.json();
      if (res.ok && data.event) {
        setEventData(data.event);
        setStudioData(data.studio || null);
      } else {
        setErrorMessage(data.message || 'Event not found or inactive.');
      }
    } catch (_) {
      setErrorMessage('Could not connect to event server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage('Please enter the 6-digit access PIN.');
      return;
    }

    setVerifying(true);
    setErrorMessage('');

    try {
      const res = await fetch('http://localhost:5000/confirm_pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: eventId, pin: pin.trim() }),
      });

      const data = await res.json();
      if (data.pin) {
        // PIN Verified -> Navigate to Camera Selfie Matching screen
        navigate('/camera', { state: eventId });
      } else {
        setErrorMessage(data.result || 'Incorrect PIN. Contact the photographer or host.');
      }
    } catch (_) {
      setErrorMessage('Could not verify PIN. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-dark" role="status" />
                <p className="mt-2 fw-bold">Loading event details...</p>
              </div>
            ) : eventData ? (
              <NeoCard
                header="GUEST PHOTO PORTAL"
                headerAccent="yellow"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                {/* Event Header Banner */}
                <div className="text-center mb-4">
                  {eventData.event_photo && (
                    <img
                      src={`http://localhost:5000/event_profile/${eventData.event_photo}`}
                      alt={eventData.event_name}
                      style={{
                        width: '100%',
                        height: '160px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '2px solid #121212',
                        marginBottom: '16px',
                      }}
                    />
                  )}

                  <NeoBadge variant="lime" className="mb-2 px-3 py-1">
                    🎉 EVENT ACCESS
                  </NeoBadge>
                  <h3 className="fw-black mb-1">{eventData.event_name}</h3>
                  {studioData && (
                    <p style={{ color: '#4B5563', fontWeight: 700, fontSize: '0.9rem' }}>
                      📸 Photography by <strong>{studioData.studio_name}</strong>
                    </p>
                  )}
                </div>

                {/* Status Message */}
                {errorMessage && (
                  <div
                    className="p-3 mb-3 text-center"
                    style={{
                      backgroundColor: 'var(--neo-coral-light)',
                      border: '2px solid var(--neo-black)',
                      borderRadius: '8px',
                      fontWeight: 800,
                      color: '#991B1B',
                    }}
                  >
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* PIN Verification Form */}
                <form onSubmit={handlePinSubmit}>
                  <div className="text-center mb-3">
                    <label className="neo-label">ENTER 6-DIGIT EVENT PIN</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="neo-input text-center fs-3"
                      style={{
                        letterSpacing: '0.3em',
                        fontWeight: 900,
                        backgroundColor: 'var(--neo-canvas)',
                      }}
                      required
                    />
                    <small style={{ color: '#6B7280', fontWeight: 600, display: 'block', marginTop: '6px' }}>
                      Check your table card or ask the event host for the PIN.
                    </small>
                  </div>

                  <NeoButton
                    type="submit"
                    variant="yellow"
                    size="lg"
                    full
                    loading={verifying}
                  >
                    Unlock Gallery & Find My Photos →
                  </NeoButton>
                </form>
              </NeoCard>
            ) : (
              <NeoCard header="EVENT UNAVAILABLE" headerAccent="coral" className="text-center">
                <span className="fs-1 d-block mb-2">🔍</span>
                <h4>Event Not Found</h4>
                <p style={{ color: '#4B5563', fontWeight: 600 }}>
                  This event link may have expired or is not active. Please verify the URL with the host.
                </p>
                <NeoButton variant="dark" onClick={() => navigate('/')}>
                  Go to Fyndr Home
                </NeoButton>
              </NeoCard>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Collect_event;
