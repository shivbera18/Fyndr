import React from 'react';
import Header from './navbar/Header';
import Footer from './Footer';
import NeoCard from './ui/NeoCard';
import NeoBadge from './ui/NeoBadge';
import NeoButton from './ui/NeoButton';
import NeoImageCard from './ui/NeoImageCard';
import NeoAlert from './ui/NeoAlert';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--neo-bg)', minHeight: '100vh' }}>
      <Header />

      <div className="container py-5">
        {/* Title Header */}
        <div className="text-center mb-5">
          <NeoBadge variant="yellow" className="mb-2 px-3 py-1 fs-6">
            ⚡ ABOUT FYNDR
          </NeoBadge>
          <h1 className="display-5 fw-black">THE ZERO-FRICTION EVENT PHOTO PLATFORM</h1>
          <p className="lead mx-auto" style={{ maxWidth: '700px', fontWeight: 600, color: '#4B5563' }}>
            Built for wedding & event photographers who want to deliver photos seamlessly without the hassle of bulky apps or password friction.
          </p>
        </div>

        {/* Core Architecture Cards */}
        <div className="row g-4 mb-5">
          <div className="col-12 col-md-6">
            <NeoCard header="THE PROBLEM WE SOLVED" headerAccent="coral" style={{ height: '100%' }}>
              <h4>The 5,000 Photo Nightmare</h4>
              <p style={{ fontWeight: 600, color: '#374151', lineHeight: '1.7' }}>
                After a big wedding or event, photographers dump thousands of photos onto Google Drive or Dropbox links. Guests spend hours squinting at thumbnails trying to find 3 photos of themselves, or simply give up.
              </p>
              <p style={{ fontWeight: 600, color: '#374151', lineHeight: '1.7' }}>
                Existing face recognition apps force guests to download heavy 150MB mobile apps, create new accounts, and enter complex passwords.
              </p>
            </NeoCard>
          </div>

          <div className="col-12 col-md-6">
            <NeoCard header="THE FYNDR SOLUTION" headerAccent="lime" style={{ height: '100%' }}>
              <h4>Snap Selfie, Find Photos in &lt; 1s</h4>
              <p style={{ fontWeight: 600, color: '#374151', lineHeight: '1.7' }}>
                Fyndr works entirely inside any mobile browser. Guests simply scan a QR code at the table, snap a selfie, and our AI pipeline instantly matches their face against every photo in the event catalog.
              </p>
              <p style={{ fontWeight: 600, color: '#374151', lineHeight: '1.7' }}>
                Instant high-res downloads, studio branding, zero guest passwords, and privacy-first ephemeral selfie processing.
              </p>
            </NeoCard>
          </div>
        </div>
        {/* Security & Privacy Banner */}
        <div className="mb-5">
          <NeoAlert
            variant="lime"
            icon="🔒"
            title="100% EPHEMERAL PRIVACY GUARANTEE"
          >
            Guest selfie images are processed strictly in-memory and permanently purged within 60 seconds. Facial embeddings are mathematically irreversibly mapped and isolated per event.
          </NeoAlert>
        </div>

        {/* Photography Showcase Image Cards */}
        <div className="mb-5">
          <div className="text-center mb-4">
            <NeoBadge variant="cyan" className="mb-2 px-3 py-1 fs-6">
              📸 EVENT SHOWCASE
            </NeoBadge>
            <h2 className="display-6 fw-black">POWERED FOR ANY SCALE</h2>
          </div>
          <div className="row g-4 justify-content-center">
            <div className="col-12 col-md-4">
              <NeoImageCard
                imageUrl="/images/wedding.jpg"
                caption="Wedding Celebrations — Multi-group face clustering"
                tag="Weddings"
                tagVariant="yellow"
              />
            </div>
            <div className="col-12 col-md-4">
              <NeoImageCard
                imageUrl="/images/wedding2.jpg"
                caption="Portrait & Couple Shoots — Sub-second retrieval"
                tag="Portraits"
                tagVariant="cyan"
              />
            </div>
            <div className="col-12 col-md-4">
              <NeoImageCard
                imageUrl="/images/imran.jpg"
                caption="Galas & Festivals — High-density crowd indexing"
                tag="Events"
                tagVariant="lime"
              />
            </div>
          </div>
        </div>
        <div className="mb-5">
          <NeoCard header="PRODUCTION TECH STACK" headerAccent="purple">
            <div className="row g-3 text-center">
              <div className="col-6 col-md-3">
                <div className="p-3" style={{ backgroundColor: 'var(--neo-yellow-light)', border: '2px solid #121212', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 900 }}>FRONTEND</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>React 18 + Neobrutalism UI</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3" style={{ backgroundColor: 'var(--neo-cyan-light)', border: '2px solid #121212', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 900 }}>API BACKEND</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Node 20 + Express + Mongoose</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3" style={{ backgroundColor: 'var(--neo-lime-light)', border: '2px solid #121212', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 900 }}>ML ENGINE</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>InsightFace ONNX + SCRFD</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3" style={{ backgroundColor: 'var(--neo-coral-light)', border: '2px solid #121212', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 900 }}>VECTOR SEARCH</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>FAISS IndexFlatIP (512-d)</div>
                </div>
              </div>
            </div>
          </NeoCard>
        </div>

        {/* Call to action */}
        <div className="text-center pt-3">
          <NeoButton variant="yellow" size="lg" onClick={() => navigate('/login')}>
            Start Using Fyndr Now →
          </NeoButton>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
