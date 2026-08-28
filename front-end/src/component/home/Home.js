import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import NeoAccordion from '../ui/NeoAccordion';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <Header />

      {/* HERO — Positivus style: split text / illustration */}
      <section style={{ padding: '40px 0 0 0' }}>
        <div className="container hero-grid">
          <div>
            <h1 style={{ fontSize: 58, lineHeight: 1, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Find yourself in <span style={{ background: 'var(--green)', padding: '2px 10px', borderRadius: 7 }}>every</span> event photo
            </h1>
            <p style={{ marginTop: 20, color: '#191A23', fontSize: 18, lineHeight: 1.6, maxWidth: 520 }}>
              No scrolling through 5,000 images. Photographers upload once — guests scan a QR, take a 1-second selfie and get their matches instantly. No app, no password.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <button className="neo-btn neo-btn-dark" style={{ padding: '18px 28px' }} onClick={() => navigate('/login')}>Start free — create event</button>
              <button className="neo-btn neo-btn-white" style={{ padding: '18px 28px' }} onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Explore services</button>
            </div>
          </div>
          {/* Illustration — Positivus megaphone style, no wedding photo */}
          <div style={{
            background: '#F3F3F3', border: '1px solid #191A23', borderRadius: 45, padding: 24,
            boxShadow: '0px 5px 0px #191A23', display: 'grid', placeItems: 'center', minHeight: 380,
          }}>
            <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--green)', border: '1px solid #191A23', display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 48 }}>◉</div>
              <div style={{ background: 'white', border: '1px solid #191A23', borderRadius: 14, padding: 14, boxShadow: '0px 3px 0px #191A23', textAlign: 'left' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#676767', fontWeight: 600 }}>LIVE MATCH • 512-D</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>Guest found in 10 photos</div>
                <div style={{ fontSize: 13, color: '#676767', marginTop: 4 }}>Event #6a8f • FAISS 18ms • private • tmp 60s</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  <span style={{ background: 'var(--green)', border: '1px solid #191A23', borderRadius: 7, padding: '4px 8px', fontSize: 11, fontWeight: 600 }}>94.5% MATCH</span>
                  <span style={{ background: '#191A23', color: 'white', borderRadius: 7, padding: '4px 8px', fontSize: 11 }}>QR + selfie</span>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#676767' }}>Illustration — no wedding photo needed. Clean, professional.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip — Positivus logoSlider */}
      <section style={{ marginTop: 32, borderTop: '1px solid #DDDDDD', borderBottom: '1px solid #DDDDDD', padding: '18px 0', overflow: 'hidden' }}>
        <div className="container trust-strip-inner" style={{ color: '#676767', fontSize: 13, fontWeight: 500 }}>
          <span>Trusted by studios</span>
          <span style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontWeight: 600, color: '#191A23' }}>
            <span>◆ APEX STUDIO</span><span>● MOMENT FRAME</span><span>⬢ LUMEN WEDDINGS</span><span>⬣ SHUTTER CO.</span>
          </span>
        </div>
      </section>

      {/* SERVICES — Positivus 2-col cards */}
      <section id="services" style={{ padding: '60px 0 20px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 32 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 12px', borderRadius: 7, fontSize: 40 }}>Services</h2>
            <p style={{ maxWidth: 560, color: '#191A23', fontSize: 16, lineHeight: 1.5 }}>Everything wedding & event photographers need — from ingest to delivery, inspired by durable serverless patterns.</p>
          </div>

          <div className="service-grid">
            <div className="service-card white">
              <div>
                <h3 style={{ background: 'var(--green)', display: 'inline', padding: '2px 8px', borderRadius: 7, lineHeight: 1.4 }}>Sub-second search</h3>
                <h3>FAISS Index</h3>
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><span style={{ width: 32, height: 32, borderRadius: '50%', background: '#191A23', color: 'white', display: 'grid', placeItems: 'center' }}>↗</span> Learn more</div>
              </div>
              <div style={{ width: 140, height: 140, borderRadius: 20, background: '#F3F3F3', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 42 }}>◧</div>
            </div>
            <div className="service-card green">
              <div>
                <h3 style={{ background: 'white', display: 'inline', padding: '2px 8px', borderRadius: 7 }}>Zero app</h3>
                <h3>friction</h3>
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><span style={{ width: 32, height: 32, borderRadius: '50%', background: '#191A23', color: 'white', display: 'grid', placeItems: 'center' }}>↗</span> Learn more</div>
              </div>
              <div style={{ width: 140, height: 140, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 42 }}>⬔</div>
            </div>
            <div className="service-card dark">
              <div>
                <h3 style={{ background: 'white', color: '#191A23', display: 'inline', padding: '2px 8px', borderRadius: 7 }}>Studio</h3>
                <h3>branding</h3>
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'white' }}><span style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', color: '#191A23', display: 'grid', placeItems: 'center' }}>↗</span> Learn more</div>
              </div>
              <div style={{ width: 140, height: 140, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 42, color: '#191A23' }}>⬢</div>
            </div>
            <div className="service-card white">
              <div>
                <h3 style={{ background: 'var(--green)', display: 'inline', padding: '2px 8px', borderRadius: 7 }}>Privacy</h3>
                <h3>first</h3>
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><span style={{ width: 32, height: 32, borderRadius: '50%', background: '#191A23', color: 'white', display: 'grid', placeItems: 'center' }}>↗</span> Learn more</div>
              </div>
              <div style={{ width: 140, height: 140, borderRadius: 20, background: '#F3F3F3', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 42 }}>⬣</div>
            </div>
            <div className="service-card green">
              <div>
                <h3 style={{ background: 'white', display: 'inline', padding: '2px 8px', borderRadius: 7 }}>Batch</h3>
                <h3>ingest</h3>
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><span style={{ width: 32, height: 32, borderRadius: '50%', background: '#191A23', color: 'white', display: 'grid', placeItems: 'center' }}>↗</span> Learn more</div>
              </div>
              <div style={{ width: 140, height: 140, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 42 }}>▭</div>
            </div>
            <div className="service-card dark">
              <div>
                <h3 style={{ background: 'var(--green)', color: '#191A23', display: 'inline', padding: '2px 8px', borderRadius: 7 }}>Free tier</h3>
                <h3>ready</h3>
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'white' }}><span style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', color: '#191A23', display: 'grid', placeItems: 'center' }}>↗</span> Learn more</div>
              </div>
              <div style={{ width: 140, height: 140, borderRadius: 20, background: 'white', border: '1px solid #191A23', display: 'grid', placeItems: 'center', fontSize: 42, color: '#191A23' }}>⬢</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — Positivus Article style */}
      <section style={{ padding: '20px 0' }}>
        <div className="container">
          <div className="cta-flex">
            <div style={{ flex: 1, minWidth: 280 }}>
              <h3 style={{ fontSize: 30 }}>Let’s make things happen</h3>
              <p style={{ marginTop: 12, color: '#191A23', maxWidth: 520 }}>Create your first event in 60 seconds. Upload high-res photos, share a QR, and let guests find themselves — durable, serverless, private.</p>
              <button className="neo-btn neo-btn-dark" style={{ marginTop: 20 }} onClick={() => navigate('/login')}>Get your free proposal</button>
            </div>
            <div style={{ width: 300, height: 200, borderRadius: 20, background: 'white', border: '1px solid var(--dark)', display: 'grid', placeItems: 'center', fontSize: 48 }}>✦</div>
          </div>
        </div>
      </section>

      {/* FAQ — Positivus workingProcess style, already have NeoAccordion */}
      <section style={{ padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
            <h2 style={{ background: 'var(--green)', padding: '6px 12px', borderRadius: 7 }}>FAQ</h2>
            <p style={{ maxWidth: 520, fontSize: 16 }}>Answers to the most common questions before you start.</p>
          </div>
          <NeoAccordion
            items={[
              { title: 'How fast is face search?', content: 'FAISS 512-d vectors on CPU — 50k faces in ~20ms. Guests get results instantly.', accent: 'yellow' },
              { title: 'Do guests need an app?', content: 'No. QR → browser → PIN → selfie. Works in Safari/Chrome, no install.', accent: 'cyan' },
              { title: 'Is my selfie stored?', content: 'No. Selfies are in-memory only and deleted in 60s. Embeddings are per-event isolated and ephemeral.', accent: 'lime' },
              { title: 'Can you ingest DSLR 50MP?', content: 'Yes — streaming SHA-256 dedup, auto thumbnail, queue. JPEG/PNG/WebP, high volume.', accent: 'coral' },
            ]}
          />
        </div>
      </section>

      {/* Final CTA — dark block like Positivus contact */}
      <section style={{ padding: '20px 0 40px 0' }}>
        <div className="container">
          <div className="final-cta-grid" style={{ border: '1px solid var(--dark)', background: 'var(--dark)', borderRadius: 45 }}>
            <div>
              <h2 style={{ color: 'white' }}>Ready to deliver photos at Fyndr speed?</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 12, maxWidth: 560 }}>Free for 5 events. No card. Cancel anytime. Your studio, your brand — zero friction.</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                <button className="neo-btn" style={{ background: 'var(--green)', color: 'var(--dark)', borderColor: 'var(--dark)' }} onClick={() => navigate('/login')}>Create photographer account</button>
                <button className="neo-btn neo-btn-white" onClick={() => navigate('/about')}>Learn more</button>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 20, padding: 20, color: 'var(--dark)' }}>
              <div style={{ fontWeight: 600 }}>What you get</div>
              <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
                <li>Event QR + PIN</li>
                <li>FAISS 512-d search</li>
                <li>High-res downloads</li>
                <li>Studio branding</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
export default Home;
