import React from 'react';
import Header from './navbar/Header';
import Footer from './Footer';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <Header />
      <div className="container" style={{ padding: '32px 16px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', marginBottom: 24 }}>
          <span className="neo-badge neo-badge-yellow">ABOUT FYNDR</span>
          <h1 style={{ marginTop: 10, fontWeight: 700 }}>Zero-friction event photos — <span className="text-gradient-accent">Actors style.</span></h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: 8 }}>Inspired by Rivet Actors: durable, isolated, and instant. Wedding & event photographers get serverless photo delivery without apps or passwords.</p>
        </div>

        <div className="row g-3" style={{ marginBottom: 16 }}>
          <div className="col-12 col-md-6">
            <div className="neo-card" style={{ height: '100%' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginBottom: 6 }}>PROBLEM</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>The 5,000 photo nightmare</div>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Drive links, manual sorting, 150MB apps. Guests give up before they find themselves.</p>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="neo-card" style={{ height: '100%', borderColor: 'hsl(var(--primary) / 0.25)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'hsl(var(--primary))', fontWeight: 600, marginBottom: 6 }}>SOLUTION</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Snap selfie → <span className="text-gradient-accent">find in &lt;1s</span></div>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>QR → browser → selfie. FAISS 512-d search, high-res download, studio branding. Selfies vanish in 60s.</p>
            </div>
          </div>
        </div>

        <div className="neo-card" style={{ marginBottom: 16, background: 'hsl(var(--muted) / 0.35)', borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: 'hsl(var(--primary) / 0.14)', border: '1px solid hsl(var(--primary) / 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Ephemeral privacy guarantee</div>
              <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Selfies processed in-memory, purged in 60s. Embeddings isolated per event.</div>
            </div>
          </div>
        </div>

        <div className="row g-3" style={{ marginBottom: 16 }}>
          {[
            { src: '/images/wedding.jpg', cap: 'Weddings • multi-group clustering', tag: 'WEDDING' },
            { src: '/images/wedding2.jpg', cap: 'Portraits • sub-second retrieval', tag: 'PORTRAIT' },
            { src: '/images/imran.jpg', cap: 'Galas • crowd indexing', tag: 'EVENT' },
          ].map(c => (
            <div key={c.tag} className="col-12 col-md-4">
              <div className="neo-card" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={c.src} alt={c.cap} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
                <div style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{c.cap}</span>
                  <span className="neo-badge" style={{ fontSize: 10 }}>{c.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="neo-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginBottom: 10 }}>STACK • RIVET INSPIRED</div>
          <div className="row g-2">
            {[
              ['FRONTEND', 'React 18 • dark glass'],
              ['API', 'Node 20 • Express • Mongo'],
              ['ML', 'InsightFace ONNX • SCRFD'],
              ['VECTOR', 'FAISS IndexFlatIP 512-d'],
            ].map(([k, v]) => (
              <div key={k} className="col-6 col-md-3">
                <div style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>{k}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="neo-btn neo-btn-yellow" onClick={() => navigate('/login')}>Start using Fyndr →</button>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default About;
