import React, { useState, useEffect } from 'react';

const SAMPLE_PHOTOS = [
  { src: '/images/wedding.jpg', caption: 'Grand Wedding • 21 indexed', tag: 'Wedding' },
  { src: '/images/wedding2.jpg', caption: 'Couple portraits • high-res', tag: 'Portraits' },
  { src: '/images/wedding4.jpg', caption: 'Ceremony moments', tag: 'Ceremony' },
  { src: '/images/maryam.jpg', caption: 'Guest selfie verification', tag: 'Guest' },
  { src: '/images/imran.jpg', caption: 'Gala & corporate', tag: 'Event' }
];

const Slider = () => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % SAMPLE_PHOTOS.length), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="neo-card" style={{ maxWidth: 980, margin: '0 auto', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted) / 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: 'hsl(var(--destructive))', display: 'inline-block' }} />
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: 'hsl(47 96% 53%)', display: 'inline-block' }} />
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: 'hsl(142 76% 36%)', display: 'inline-block' }} />
          <span style={{ fontSize: 11, letterSpacing: '0.08em', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginLeft: 8 }}>PREVIEW • FAISS</span>
        </div>
        <span className="neo-badge">{SAMPLE_PHOTOS[current].tag}</span>
      </div>
      <div style={{ position: 'relative', height: 380, overflow: 'hidden', background: 'hsl(var(--background))' }}>
        <img src={SAMPLE_PHOTOS[current].src} alt={SAMPLE_PHOTOS[current].caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, background: 'hsl(var(--card) / 0.92)', backdropFilter: 'blur(8px)', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}><span className="neo-badge neo-badge-yellow">LIVE</span> {SAMPLE_PHOTOS[current].caption}</span>
          <span style={{ display: 'flex', gap: 6 }}>
            {SAMPLE_PHOTOS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`slide ${i+1}`} style={{ width: 8, height: 8, borderRadius: 9999, background: i === current ? 'hsl(var(--primary))' : 'hsl(var(--border))', border: 'none', padding: 0 }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
};
export default Slider;
