import React, { useState, useEffect } from 'react';
import NeoBadge from '../ui/NeoBadge';

const SAMPLE_PHOTOS = [
  { src: '/images/wedding.jpg', caption: 'Grand Wedding Reception — 21 Guests Indexed', tag: 'Wedding' },
  { src: '/images/wedding2.jpg', caption: 'Couple Photoshoot — High-Res Portraits', tag: 'Portraits' },
  { src: '/images/wedding4.jpg', caption: 'Ceremony & Family Moments', tag: 'Ceremony' },
  { src: '/images/maryam.jpg', caption: 'Guest Selfie Instant Verification', tag: 'Guest Selfie' },
  { src: '/images/imran.jpg', caption: 'Outdoor Gala & Corporate Celebrations', tag: 'Event' }
];

const Slider = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SAMPLE_PHOTOS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="neo-card p-0 my-4"
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        backgroundColor: 'var(--neo-black)',
        border: '3px solid var(--neo-black)',
      }}
    >
      {/* Frame Top Bar */}
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2"
        style={{
          backgroundColor: 'var(--neo-yellow)',
          borderBottom: '3px solid var(--neo-black)',
          fontWeight: 800,
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5E7E', border: '2px solid #000', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFE600', border: '2px solid #000', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#A3E635', border: '2px solid #000', display: 'inline-block' }} />
          <span className="ms-2" style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>
            FYNDR REAL-TIME AI GALLERY PREVIEW
          </span>
        </div>
        <NeoBadge variant="dark" className="d-none d-sm-inline-flex">
          {SAMPLE_PHOTOS[current].tag}
        </NeoBadge>
      </div>

      {/* Image Preview Container */}
      <div style={{ position: 'relative', height: '420px', overflow: 'hidden', backgroundColor: '#1A1A1A' }}>
        <img
          src={SAMPLE_PHOTOS[current].src}
          alt={SAMPLE_PHOTOS[current].caption}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.4s ease-in-out',
          }}
        />

        {/* Bottom Overlay Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '3px solid #121212',
            borderRadius: '12px',
            padding: '12px 18px',
            boxShadow: '4px 4px 0px #121212',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="neo-badge neo-badge-lime">MATCHED</span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{SAMPLE_PHOTOS[current].caption}</span>
          </div>
          <div className="d-flex gap-1">
            {SAMPLE_PHOTOS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '4px',
                  backgroundColor: i === current ? 'var(--neo-yellow)' : '#E5E7EB',
                  border: '2px solid #121212',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Slider;
