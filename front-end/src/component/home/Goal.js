import React from 'react';
import NeoCard from '../ui/NeoCard';
import NeoBadge from '../ui/NeoBadge';

const Goal = () => {
  return (
    <section className="my-5 py-4">
      <div className="container">
        {/* Section Title */}
        <div className="text-center mb-5">
          <NeoBadge variant="lime" className="mb-2 px-3 py-1 fs-6">
            ⚡ 3-STEP MAGIC WORKFLOW
          </NeoBadge>
          <h2 className="display-6 fw-black">HOW FYNDR WORKS</h2>
          <p className="lead mx-auto" style={{ maxWidth: '650px', fontWeight: 600, color: '#4B5563' }}>
            Traditional photo delivery takes days of manual sorting. Fyndr does it in milliseconds with AI facial recognition.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="row g-4 justify-content-center">
          {/* Step 1 */}
          <div className="col-12 col-md-4">
            <NeoCard
              header="STEP 01"
              headerAccent="yellow"
              hoverable
              style={{ height: '100%', backgroundColor: '#FFFDF5' }}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="fs-1">📸</span>
                <h4 className="m-0">Upload Album</h4>
              </div>
              <p style={{ fontWeight: 600, color: '#374151' }}>
                Photographer creates an event (with a 6-digit PIN) and uploads hundreds or thousands of high-res photos.
              </p>
              <div className="mt-3">
                <NeoBadge variant="dark">AUTO 512-D VECTOR INDEX</NeoBadge>
              </div>
            </NeoCard>
          </div>

          {/* Step 2 */}
          <div className="col-12 col-md-4">
            <NeoCard
              header="STEP 02"
              headerAccent="cyan"
              hoverable
              style={{ height: '100%', backgroundColor: '#FFFDF5' }}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="fs-1">🤳</span>
                <h4 className="m-0">Scan & Selfie</h4>
              </div>
              <p style={{ fontWeight: 600, color: '#374151' }}>
                Guests scan the event QR code or open the link on their phone, enter the PIN, and take a quick 1-second selfie.
              </p>
              <div className="mt-3">
                <NeoBadge variant="cyan">ZERO APP INSTALLATION</NeoBadge>
              </div>
            </NeoCard>
          </div>

          {/* Step 3 */}
          <div className="col-12 col-md-4">
            <NeoCard
              header="STEP 03"
              headerAccent="lime"
              hoverable
              style={{ height: '100%', backgroundColor: '#FFFDF5' }}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="fs-1">✨</span>
                <h4 className="m-0">Instant Match</h4>
              </div>
              <p style={{ fontWeight: 600, color: '#374151' }}>
                Fyndr queries the FAISS index in &lt; 50ms, finds every photo where the guest appears, and provides instant downloads.
              </p>
              <div className="mt-3">
                <NeoBadge variant="lime">SUB-SECOND MATCH</NeoBadge>
              </div>
            </NeoCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Goal;
