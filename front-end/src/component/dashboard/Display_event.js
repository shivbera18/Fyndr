import React, { useEffect, useState } from 'react';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';

const Display_event = ({ refresh, onclick, onQrClick }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const fetchEvents = async () => {
    const userString = localStorage.getItem('user');
    if (!userString) return;

    try {
      const user = JSON.parse(userString);
      setLoading(true);
      setFetchError('');
      const res = await fetch('http://localhost:5000/display_event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (e) {
      setFetchError('Could not load events from server. Please verify the API is running.');
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
      <div className="text-center py-5">
        <div className="spinner-border text-dark" role="status" />
        <p className="mt-2 fw-bold">Loading your events...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-center py-5">
        <NeoCard style={{ maxWidth: '480px', margin: '0 auto' }} header="Connection Notice" headerAccent="coral">
          <span className="fs-1 d-block mb-2">⚠️</span>
          <h4>Unable to Load Events</h4>
          <p style={{ color: '#6B7280', fontWeight: 600 }}>{fetchError}</p>
          <NeoButton variant="yellow" size="sm" onClick={fetchEvents}>
            🔄 Retry
          </NeoButton>
        </NeoCard>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-5">
        <NeoCard style={{ maxWidth: '480px', margin: '0 auto' }}>
          <span className="fs-1 d-block mb-2">🎉</span>
          <h4>No Events Created Yet</h4>
          <p style={{ color: '#6B7280', fontWeight: 600 }}>
            Create your first event to start uploading photos and generating guest QR codes.
          </p>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="my-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="m-0">YOUR ACTIVE EVENTS</h3>
        <NeoBadge variant="yellow" className="px-3 py-1 fs-6">
          {events.length} EVENT{events.length > 1 ? 'S' : ''}
        </NeoBadge>
      </div>

      <div className="row g-4">
        {events.map((event, index) => {
          const coverUrl = event.event_photo
            ? `http://localhost:5000/event_profile/${event.event_photo}`
            : '/images/wedding.jpg';

          return (
            <div key={event._id || index} className="col-12 col-md-6 col-lg-4">
              <NeoCard
                header={event.event_name}
                headerAccent={index % 3 === 0 ? 'yellow' : index % 3 === 1 ? 'cyan' : 'lime'}
                hoverable
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                {/* Cover Image */}
                <div
                  style={{
                    height: '180px',
                    borderRadius: '8px',
                    border: '2px solid #121212',
                    overflow: 'hidden',
                    marginBottom: '16px',
                    backgroundColor: '#E5E7EB',
                  }}
                >
                  <img
                    src={coverUrl}
                    alt={event.event_name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='100%25' height='100%25' fill='%23F3F4F6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239CA3AF'%3E📸 Event Gallery%3C/text%3E%3C/svg%3E";
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {/* Event Metadata */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-1">
                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>PIN:</span>
                    <NeoBadge variant="dark" style={{ letterSpacing: '0.1em' }}>
                      {event.pin || '123456'}
                    </NeoBadge>
                  </div>
                  <small style={{ color: '#6B7280', fontWeight: 700 }}>
                    ID: {event._id.slice(-6)}
                  </small>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto d-flex gap-2 flex-wrap">
                  <NeoButton
                    variant="yellow"
                    size="sm"
                    full
                    onClick={() => onclick(event._id, event.event_name, event.pin)}
                  >
                    📂 Open Album & Upload →
                  </NeoButton>
                </div>
              </NeoCard>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Display_event;
