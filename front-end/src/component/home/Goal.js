import React from 'react';

const steps = [
  { n: '01', t: 'Upload album', d: 'Create event with 6-digit PIN and upload high-res photos. Auto 512-d indexing.', badge: 'AUTO INDEX' },
  { n: '02', t: 'Scan & selfie', d: 'Guests scan QR, enter PIN, take 1s selfie. Zero app install.', badge: 'NO APP' },
  { n: '03', t: 'Instant match', d: 'FAISS queries <50ms, returns every photo you appear in.', badge: 'SUB-SECOND' },
];

const Goal = () => {
  return (
    <section style={{ padding: '32px 0' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span className="neo-badge neo-badge-yellow">3-STEP WORKFLOW</span>
          <h2 style={{ marginTop: 8, fontWeight: 700 }}>How Fyndr works</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', maxWidth: 560, margin: '6px auto 0' }}>From ingest to delivery — durable like Rivet Actors.</p>
        </div>
        <div className="row g-3">
          {steps.map(s => (
            <div key={s.n} className="col-12 col-md-4">
              <div className="neo-card" style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9999, background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{s.n}</span>
                  <span style={{ fontWeight: 600 }}>{s.t}</span>
                </div>
                <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, lineHeight: 1.5 }}>{s.d}</div>
                <div style={{ marginTop: 12 }}><span className="neo-badge">{s.badge}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Goal;
