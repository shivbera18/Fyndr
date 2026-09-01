import React from 'react';
import Header from './navbar/Header';
import Footer from './Footer';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <Header />
      <div className="container" style={{ padding: '40px 0' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 36 }}>
          <h1 style={{ background: 'var(--green)', padding: '6px 14px', borderRadius: 8, display: 'inline', fontSize: 42 }}>
            About Fyndr
          </h1>
          <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.6, color: '#191A23' }}>
            We're on a mission to eliminate the friction of event photo sharing. Fyndr connects event guests to their memories instantly without bloated apps, passwords, or endless scrolling.
          </p>
        </div>

        {/* Problem vs Solution */}
        <div className="about-two-col">
          <div className="neo-card" style={{ padding: 40 }}>
            <div style={{ display: 'inline-block', background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
              THE PROBLEM
            </div>
            <h3 style={{ marginTop: 14, fontSize: 24 }}>The 5,000 Photo Dilemma</h3>
            <p style={{ marginTop: 10, color: '#555', fontSize: 16, lineHeight: 1.6 }}>
              Event photographers take thousands of stunning photos, but delivering them is painful. Shared cloud links overwhelm guests, forcing them to hunt through hundreds of strangers' pictures. Most guests never see their best moments.
            </p>
          </div>

          <div className="neo-card" style={{ padding: 40, background: 'var(--dark)', color: 'white' }}>
            <div style={{ display: 'inline-block', background: 'var(--green)', color: 'var(--dark)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
              THE SOLUTION
            </div>
            <h3 style={{ marginTop: 14, fontSize: 24, color: 'white' }}>Scan QR → Instant Personal Gallery</h3>
            <p style={{ marginTop: 10, color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.6 }}>
              Guests scan a QR code at the table, take a quick selfie, and get every photo they appear in within two seconds. High-resolution downloads, complete privacy, zero apps.
            </p>
          </div>
        </div>

        {/* Privacy Promise */}
        <div style={{
          background: 'var(--green)', border: '1px solid var(--dark)', borderRadius: 32, padding: '28px 36px',
          display: 'flex', gap: 20, alignItems: 'center', boxShadow: '0px 5px 0px var(--dark)', marginBottom: 40, flexWrap: 'wrap'
        }}>
          <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'white', border: '1px solid var(--dark)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
            🛡️
          </span>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Our Strict Privacy Promise</div>
            <div style={{ fontSize: 15, color: '#191A23', marginTop: 4, lineHeight: 1.5 }}>
              Guest selfies are processed strictly in real-time to find photos and are immediately discarded. We never sell, store, or train on guest face data.
            </div>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="neo-card" style={{ marginBottom: 40, padding: 40 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.08em', color: '#676767', fontWeight: 700, marginBottom: 20 }}>
            BUILT ON FOUR CORE PILLARS
          </div>
          <div className="about-four-col">
            {[
              { title: 'LIGHTNING FAST', desc: 'Photos matched in under 2 seconds' },
              { title: 'ZERO APP INSTALL', desc: 'Runs directly in mobile browsers' },
              { title: 'STUDIO BRANDED', desc: 'Grow your photography business' },
              { title: 'FULL RESOLUTION', desc: 'Original DSLR quality downloads' },
            ].map((item, idx) => (
              <div key={idx} style={{ background: '#F8F8F8', border: '1px solid #191A23', borderRadius: 16, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#676767', marginTop: 6, lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <button className="neo-btn neo-btn-dark" style={{ padding: '18px 36px', fontSize: 18 }} onClick={() => navigate('/login')}>
            Start Creating Events Free →
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
