import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import Slider from './Slider';
import Goal from './Goal';
import NeoMarquee from '../ui/NeoMarquee';
import NeoAccordion from '../ui/NeoAccordion';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: 'hsl(var(--background))', minHeight: '100vh' }}>
      <Header />

      {/* HERO - Rivet Actors style: dark, centered, subtle glow */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '56px 0 32px' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(600px 300px at 50% -20%, hsl(var(--primary) / 0.18), transparent 70%), radial-gradient(800px 400px at 80% 0%, hsl(var(--primary) / 0.08), transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-7">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <span className="neo-badge neo-badge-yellow" style={{ fontSize: 11 }}>● ACTORS DURABLE</span>
                <span className="neo-badge">SERVERLESS PHOTOS</span>
                <span className="neo-badge">512-D VECTOR</span>
              </div>
              <h1 style={{ fontSize: '2.6rem', lineHeight: 1.05, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12 }}>
                Find yourself in <span className="text-gradient-accent">every event</span> photo.
              </h1>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 560, marginBottom: 20 }}>
                Photographers upload once. Guests scan a QR, take a 1s selfie, and get every photo they appear in — no app, no password, sub-second FAISS search.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="neo-btn neo-btn-yellow glow-accent" style={{ height: 40, padding: '0 18px' }} onClick={() => navigate('/login')}>Start free — create event</button>
                <button className="neo-btn neo-btn-white" style={{ height: 40 }} onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                <span className="neo-badge">Tmp 60s selfies</span>
                <span className="neo-badge">On-device match</span>
                <span className="neo-badge neo-badge-yellow">FAISS 20ms</span>
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className="neo-card glass shine-top" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))' }}>LIVE MATCH • 512-D</span>
                  <span className="neo-badge neo-badge-yellow">94.5% match</span>
                </div>
                <img src="/images/wedding.jpg" alt="preview" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <div style={{ marginTop: 10, background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Guest found in 10 photos</span>
                  <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Event #6a8f • FAISS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <NeoMarquee
        items={['ACTORS DURABLE EXECUTION', 'FAISS VECTOR SEARCH', 'ZERO GUEST PASSWORDS', '1S SELFIE SCAN', 'STUDIO BRANDING', 'NO APP INSTALL']}
        bgColor="hsl(var(--card))"
        textColor="hsl(var(--muted-foreground))"
      />

      <section className="container" style={{ padding: '24px 12px' }}>
        <Slider />
      </section>

      <div id="how-it-works"><Goal /></div>

      <section style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card) / 0.4)', padding: '40px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span className="neo-badge neo-badge-yellow" style={{ marginBottom: 8 }}>BUILT FOR SCALE</span>
            <h2 style={{ fontWeight: 700 }}>Why photographers choose Fyndr</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', maxWidth: 560, margin: '8px auto 0' }}>Everything you need — from ingest to delivery — with Rivet-like durability.</p>
          </div>
          <div className="row g-3">
            {[
              { t: 'Sub-second search', d: 'Per-event FAISS IndexFlatIP over 50k faces in <20ms.', icon: '◧' },
              { t: 'Zero app friction', d: 'QR + browser. No downloads, no passwords.', icon: '⬔' },
              { t: 'Studio branding', d: 'Custom profile, event cover, clean downloads.', icon: '⬢' },
              { t: 'Privacy first', d: 'Selfies purged in 60s, embeddings per-event.', icon: '⬣' },
              { t: 'Batch ingest', d: 'Streaming SHA-256 dedup + queue.', icon: '▭' },
              { t: 'Free tier ready', d: 'Runs on Oracle Free + R2 — no lock-in.', icon: '⬔' },
            ].map((f, i) => (
              <div key={i} className="col-12 col-md-4">
                <div className="neo-card" style={{ height: '100%' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'hsl(var(--primary) / 0.14)', border: '1px solid hsl(var(--primary) / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))', fontSize: 12, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{f.t}</div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, lineHeight: 1.5 }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span className="neo-badge">FAQ</span>
            <h2 style={{ marginTop: 8 }}>Everything you need to know</h2>
          </div>
          <NeoAccordion
            items={[
              { title: 'How fast is face search?', content: 'FAISS 512-d vectors on CPU — 50k faces in ~20ms. Guests get results instantly.', accent: 'yellow' },
              { title: 'Do guests need an app?', content: 'No. QR → browser → PIN → selfie. Works in Safari/Chrome.', accent: 'cyan' },
              { title: 'Is my selfie stored?', content: 'No. Selfies are processed in-memory and deleted in 60s. Embeddings are per-event isolated.', accent: 'lime' },
              { title: 'Can you ingest DSLR 50MP?', content: 'Yes — streaming hash dedup, auto thumbnail, queue. JPEG/PNG/WebP.', accent: 'coral' },
            ]}
          />
        </div>
      </section>

      <section style={{ padding: '24px 0 40px' }}>
        <div className="container">
          <div className="glass-strong" style={{ borderRadius: 16, padding: 24, textAlign: 'center', border: '1px solid hsl(var(--border))' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginBottom: 8 }}>START SHARING TODAY</div>
            <h2 style={{ fontWeight: 700 }}>Deliver photos at the speed of actors.</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', maxWidth: 560, margin: '8px auto 16px' }}>Create your first event in 60s. Free for 5 events.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="neo-btn neo-btn-yellow" onClick={() => navigate('/login')}>Create photographer account</button>
              <button className="neo-btn neo-btn-white" onClick={() => navigate('/about')}>Learn more →</button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
export default Home;
