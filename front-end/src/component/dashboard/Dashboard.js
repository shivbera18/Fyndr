import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import DisplayEvent from './Display_event';
import InEvent from './InEvent';
import PhotographerDetail from './Photographer_detail';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';
import NeoInput from '../ui/NeoInput';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'create' | 'studio'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create Event Form State
  const [eventName, setEventName] = useState('');
  const [pin, setPin] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = localStorage.getItem('user');
    if (!auth) {
      navigate('/login');
    } else {
      try {
        setUser(JSON.parse(auth));
      } catch (_) {
        navigate('/login');
      }
    }
  }, [navigate]);

  const generateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(randomPin);
  };

  const handleCoverChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setCreateError('Event name is required.');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const formData = new FormData();
      formData.append('event_name', eventName.trim());
      formData.append('created_id', user._id);
      formData.append('pin', pin.trim() || '123456');
      if (coverFile) {
        formData.append('name', coverFile);
      }

      const res = await fetch('http://localhost:5000/event', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data._id) {
        setEventName('');
        setPin('');
        setCoverFile(null);
        setCoverPreview('');
        setRefreshKey((prev) => prev + 1);
        // Automatically open created event
        setSelectedEvent({
          eventID: data._id,
          name: data.event_name,
          pin: data.pin,
        });
      } else {
        setCreateError(data.message || data.error || 'Failed to create event.');
      }
    } catch (_) {
      setCreateError('Could not connect to API server.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />

      <div className="container py-4">
        {/* Top Greeting & Action Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h2 className="m-0 fw-black">PHOTOGRAPHER DASHBOARD</h2>
              <NeoBadge variant="lime">ONLINE</NeoBadge>
            </div>
            <p style={{ color: '#4B5563', fontWeight: 600, margin: 0 }}>
              Welcome back, <strong>{user?.name || 'Photographer'}</strong>! Manage your event galleries and guest access.
            </p>
          </div>

          {/* Navigation Tabs */}
          {!selectedEvent && (
            <div className="d-flex gap-2 flex-wrap">
              <NeoButton
                variant={activeTab === 'events' ? 'yellow' : 'white'}
                size="sm"
                onClick={() => setActiveTab('events')}
              >
                📸 My Events
              </NeoButton>
              <NeoButton
                variant={activeTab === 'create' ? 'cyan' : 'white'}
                size="sm"
                onClick={() => {
                  setActiveTab('create');
                  if (!pin) generateRandomPin();
                }}
              >
                + Create New Event
              </NeoButton>
              <NeoButton
                variant={activeTab === 'studio' ? 'purple' : 'white'}
                size="sm"
                onClick={() => setActiveTab('studio')}
              >
                🏢 Studio Branding
              </NeoButton>
            </div>
          )}
        </div>

        {/* View Switcher */}
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
        ) : activeTab === 'create' ? (
          <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            <NeoCard header="CREATE NEW EVENT" headerAccent="cyan">
              {createError && (
                <div
                  className="p-3 mb-3"
                  style={{
                    backgroundColor: 'var(--neo-coral-light)',
                    border: '2px solid var(--neo-black)',
                    borderRadius: '8px',
                    fontWeight: 700,
                  }}
                >
                  ⚠️ {createError}
                </div>
              )}

              <form onSubmit={handleCreateEvent}>
                <NeoInput
                  label="Event Name"
                  placeholder="e.g. Rachel & Ross Wedding Reception"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />

                <div className="row align-items-end g-2 mb-3">
                  <div className="col-8">
                    <NeoInput
                      label="Guest Access PIN (6 Digits)"
                      placeholder="e.g. 123456"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-4 mb-3">
                    <NeoButton
                      variant="white"
                      size="md"
                      full
                      onClick={generateRandomPin}
                    >
                      🎲 Randomize
                    </NeoButton>
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="mb-4">
                  <label className="neo-label">Event Cover Photo (Optional)</label>
                  <div
                    className="p-3 text-center"
                    style={{
                      border: '2px dashed #121212',
                      borderRadius: '8px',
                      backgroundColor: 'var(--neo-canvas)',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('cover-image-input')?.click()}
                  >
                    <input
                      id="cover-image-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleCoverChange}
                    />
                    {coverPreview ? (
                      <div>
                        <img
                          src={coverPreview}
                          alt="Cover Preview"
                          style={{
                            height: '140px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '2px solid #121212',
                          }}
                        />
                        <div className="mt-2 fw-bold" style={{ fontSize: '0.85rem' }}>
                          Click to Change Cover Photo
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="fs-3 d-block mb-1">🖼️</span>
                        <span style={{ fontWeight: 800 }}>Click to Select Event Cover Photo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <NeoButton
                    variant="white"
                    size="lg"
                    onClick={() => setActiveTab('events')}
                  >
                    Cancel
                  </NeoButton>
                  <NeoButton
                    type="submit"
                    variant="yellow"
                    size="lg"
                    full
                    loading={creating}
                  >
                    Create Event & Open Album →
                  </NeoButton>
                </div>
              </form>
            </NeoCard>
          </div>
        ) : activeTab === 'studio' ? (
          <PhotographerDetail />
        ) : (
          <DisplayEvent
            refresh={refreshKey}
            onclick={(eventID, name, display_pin) => {
              setSelectedEvent({ eventID, name, pin: display_pin });
            }}
          />
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
