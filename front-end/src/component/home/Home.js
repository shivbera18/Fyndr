import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../navbar/Header';
import Footer from '../Footer';
import Slider from './Slider';
import Goal from './Goal';
import NeoButton from '../ui/NeoButton';
import NeoCard from '../ui/NeoCard';
import NeoBadge from '../ui/NeoBadge';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />

      {/* ================= HERO SECTION ================= */}
      <section className="py-5">
        <div className="container py-3">
          <div className="row align-items-center g-5">
            {/* Hero Text */}
            <div className="col-12 col-lg-7 text-center text-lg-start">
              <div className="d-flex gap-2 justify-content-center justify-content-lg-start flex-wrap mb-3">
                <NeoBadge variant="yellow" className="px-3 py-1 fs-6">
                  📸 EVENT PHOTO SAAS
                </NeoBadge>
                <NeoBadge variant="lime" className="px-3 py-1 fs-6">
                  ⚡ INSTANT FACE RECOGNITION
                </NeoBadge>
              </div>

              <h1 className="display-4 fw-black mb-3">
                FIND YOURSELF IN <span className="neo-highlight">EVERY EVENT</span> PHOTO.
              </h1>

              <p className="lead mb-4" style={{ fontWeight: 600, color: '#374151', fontSize: '1.25rem' }}>
                No scrolling through 5,000 photos. No app download. No password for guests.
                Photographers upload once — guests snap a selfie and get their matched photos in seconds.
              </p>

              {/* Hero CTA Actions */}
              <div className="d-flex gap-3 justify-content-center justify-content-lg-start flex-wrap">
                <NeoButton
                  variant="yellow"
                  size="lg"
                  onClick={() => navigate('/login')}
                >
                  🚀 Launch Your Event
                </NeoButton>
                <NeoButton
                  variant="white"
                  size="lg"
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Explore How It Works ↓
                </NeoButton>
              </div>

              {/* Mini Social Proof */}
              <div className="mt-4 pt-2 d-flex align-items-center gap-3 justify-content-center justify-content-lg-start">
                <div className="d-flex -space-x-2">
                  <span className="neo-badge neo-badge-dark px-3 py-1">🔒 Private Selfies (Tmp 60s)</span>
                  <span className="neo-badge neo-badge-cyan px-3 py-1">⚡ 512-d ArcFace + FAISS</span>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="col-12 col-lg-5">
              <NeoCard
                header="LIVE MATCH SIMULATION"
                headerAccent="cyan"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="text-center p-2">
                  <img
                    src="/images/wedding.jpg"
                    alt="Wedding Match"
                    style={{
                      width: '100%',
                      height: '240px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #121212',
                    }}
                  />
                  <div
                    className="p-3 mt-3 text-start"
                    style={{
                      backgroundColor: 'var(--neo-lime-light)',
                      border: '2px solid #121212',
                      borderRadius: '8px',
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontWeight: 800 }}>GUEST MATCH STATUS</span>
                      <NeoBadge variant="lime">94.5% MATCH</NeoBadge>
                    </div>
                    <small style={{ fontWeight: 600 }}>
                      ✓ 10 Photos found featuring this guest in Event #6a8f
                    </small>
                  </div>
                </div>
              </NeoCard>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE PHOTO SLIDER ================= */}
      <section className="container py-2">
        <Slider />
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <div id="how-it-works">
        <Goal />
      </div>

      {/* ================= FEATURES GRID ================= */}
      <section className="py-5" style={{ backgroundColor: 'var(--neo-canvas)', borderTop: '3px solid #121212', borderBottom: '3px solid #121212' }}>
        <div className="container">
          <div className="text-center mb-5">
            <NeoBadge variant="purple" className="mb-2 px-3 py-1 fs-6">
              ✨ BUILT FOR SCALE
            </NeoBadge>
            <h2 className="display-6 fw-black">WHY PHOTOGRAPHERS CHOOSE FYNDR</h2>
            <p className="lead mx-auto" style={{ maxWidth: '600px', fontWeight: 600, color: '#4B5563' }}>
              Everything wedding, sports, and festival photographers need to delight clients.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-12 col-md-4">
              <NeoCard header="⚡ SUB-SECOND SEARCH" headerAccent="yellow" hoverable style={{ height: '100%' }}>
                <h5>Per-Event FAISS Index</h5>
                <p style={{ color: '#4B5563', fontWeight: 600 }}>
                  Cosine similarity vector search against 50,000+ faces in under 20ms using optimized Inner-Product Indexing.
                </p>
              </NeoCard>
            </div>

            <div className="col-12 col-md-4">
              <NeoCard header="📱 ZERO APP FRICTION" headerAccent="cyan" hoverable style={{ height: '100%' }}>
                <h5>QR Code + Web Browser</h5>
                <p style={{ color: '#4B5563', fontWeight: 600 }}>
                  Guests scan the table QR code and open Fyndr in Safari or Chrome. No downloads, no passwords to forget.
                </p>
              </NeoCard>
            </div>

            <div className="col-12 col-md-4">
              <NeoCard header="🎨 STUDIO BRANDING" headerAccent="lime" hoverable style={{ height: '100%' }}>
                <h5>Your Studio, Front & Center</h5>
                <p style={{ color: '#4B5563', fontWeight: 600 }}>
                  Custom photographer profile, event banners, watermark-free high-res downloads, and contact links.
                </p>
              </NeoCard>
            </div>

            <div className="col-12 col-md-4">
              <NeoCard header="🔒 PRIVACY FIRST" headerAccent="coral" hoverable style={{ height: '100%' }}>
                <h5>Selfie Auto-Purge</h5>
                <p style={{ color: '#4B5563', fontWeight: 600 }}>
                  Guest selfie images are processed in-memory and discarded within 60s. Vector embeddings remain private to the event.
                </p>
              </NeoCard>
            </div>

            <div className="col-12 col-md-4">
              <NeoCard header="📦 BATCH UPLOADER" headerAccent="purple" hoverable style={{ height: '100%' }}>
                <h5>High-Volume Ingestion</h5>
                <p style={{ color: '#4B5563', fontWeight: 600 }}>
                  Streamlined multi-photo upload with non-blocking streaming SHA-256 hash deduplication and async queue processing.
                </p>
              </NeoCard>
            </div>

            <div className="col-12 col-md-4">
              <NeoCard header="💰 100% FREE TIER READY" headerAccent="yellow" hoverable style={{ height: '100%' }}>
                <h5>$0 Upfront Infrastructure</h5>
                <p style={{ color: '#4B5563', fontWeight: 600 }}>
                  Engineered to run seamlessly on Oracle Always Free + Cloudflare + R2 storage without bloated SaaS subscriptions.
                </p>
              </NeoCard>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA BANNER ================= */}
      <section className="py-5 my-4">
        <div className="container">
          <div
            className="p-5 text-center"
            style={{
              backgroundColor: 'var(--neo-yellow)',
              border: '4px solid #121212',
              borderRadius: '20px',
              boxShadow: '10px 10px 0px #121212',
            }}
          >
            <NeoBadge variant="dark" className="mb-3 px-3 py-1 fs-6">
              START SHARING TODAY
            </NeoBadge>
            <h2 className="display-5 fw-black mb-3">
              READY TO DELIVER PHOTOS AT THE SPEED OF LIGHT?
            </h2>
            <p className="lead mb-4 mx-auto" style={{ maxWidth: '600px', fontWeight: 700, color: '#1F2937' }}>
              Create your first event in under 60 seconds. Free for up to 5 events.
            </p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <NeoButton
                variant="dark"
                size="lg"
                onClick={() => navigate('/login')}
              >
                ⚡ Create Photographer Account
              </NeoButton>
              <NeoButton
                variant="white"
                size="lg"
                onClick={() => navigate('/about')}
              >
                Learn More →
              </NeoButton>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
