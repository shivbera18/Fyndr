import React, { useEffect, useState } from 'react';
import { API_URL } from '../../utils/api';
import NeoCard from '../ui/NeoCard';
import NeoButton from '../ui/NeoButton';
import NeoInput from '../ui/NeoInput';
const Photographer_detail = () => {
  const [studioName, setStudioName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [address, setAddress] = useState('');
  const [offer, setOffer] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchStudio = async () => {
      if (!user._id) return;
      try {
        const res = await fetch(`${API_URL}/find_studio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ create_by: user._id }),
        });
        const data = await res.json();
        if (data && data.studio_name) {
          setStudioName(data.studio_name || '');
          setPhoneNo(data.phone_no || '');
          setAddress(data.address || '');
          setOffer(data.offer || '');
          setDescription(data.description || '');
        }
      } catch (_) {}
    };

    fetchStudio();
  }, [user._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('');

    try {
      const res = await fetch(`${API_URL}/studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio_name: studioName,
          phone_no: phoneNo,
          address,
          offer,
          description,
          create_by: user._id,
        }),
      });

      if (res.ok) {
        setStatusMessage('✓ Studio profile successfully saved!');
      } else {
        setStatusMessage('❌ Failed to save profile.');
      }
    } catch (_) {
      setStatusMessage('❌ Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-3" style={{ maxWidth: '700px' }}>
      <NeoCard header="PHOTOGRAPHER & STUDIO BRANDING" headerAccent="purple">
        <p style={{ fontWeight: 600, color: '#4B5563', marginBottom: '20px' }}>
          This information will be displayed to guests when they access your event galleries and scan QR codes.
        </p>

        {statusMessage && (
          <div
            className="p-3 mb-3"
            style={{
              backgroundColor: statusMessage.startsWith('✓') ? 'var(--neo-lime-light)' : 'var(--neo-coral-light)',
              border: '2px solid var(--neo-black)',
              borderRadius: '8px',
              fontWeight: 800,
            }}
          >
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <NeoInput
            label="Studio or Brand Name"
            placeholder="e.g. Apex Visuals & Wedding Cinema"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            required
          />

          <div className="row g-2">
            <div className="col-12 col-md-6">
              <NeoInput
                label="Contact Phone / WhatsApp"
                placeholder="+91 98765 43210"
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <NeoInput
                label="Special Offers / Tagline"
                placeholder="Book 2026 weddings & get 15% off"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
              />
            </div>
          </div>

          <NeoInput
            label="Studio Location / Address"
            placeholder="Mumbai, India / Available Worldwide"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <NeoInput
            label="About Your Studio"
            placeholder="Tell your clients and event guests about your photography experience..."
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <NeoButton type="submit" variant="yellow" size="md" loading={loading}>
            Save Studio Branding →
          </NeoButton>
        </form>
      </NeoCard>
    </div>
  );
};

export default Photographer_detail;
