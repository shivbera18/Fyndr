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
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 32 }}>
          <h1 style={{ background: 'var(--green)', padding: '6px 12px', borderRadius: 7, display: 'inline' }}>About Fyndr</h1>
          <p style={{ maxWidth: 580, fontSize: 16, lineHeight: 1.5 }}>Zero-friction event photos — built for photographers who want durability without the complexity. Inspired by Rivet Actors and Positivus clarity.</p>
        </div>

        <div className="about-two-col">
          <div className="neo-card">
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#676767', fontWeight: 600 }}>PROBLEM</div>
            <h3 style={{ marginTop: 8 }}>The 5,000 photo nightmare</h3>
            <p style={{ marginTop: 8, color: '#191A23' }}>Drive links, manual sorting, 150MB apps. Guests give up before they find themselves. Delivery takes days.</p>
          </div>
          <div className="neo-card" style={{ background: 'var(--dark)', color: 'white' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--green)', fontWeight: 600 }}>SOLUTION</div>
            <h3 style={{ marginTop: 8, color: 'white' }}>Snap selfie → find in &lt;1s</h3>
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.8)' }}>QR → browser → selfie. FAISS 512-d, instant download, studio brand. Selfies vanish in 60s.</p>
          </div>
        </div>

        <div style={{ background: 'var(--green)', border: '1px solid var(--dark)', borderRadius: 45, padding: '20px 24px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0px 5px 0px var(--dark)', marginBottom: 32 }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', border: '1px solid var(--dark)', display: 'grid', placeItems: 'center' }}>🔒</span>
          <div>
            <div style={{ fontWeight: 600 }}>Ephemeral privacy guarantee</div>
            <div style={{ fontSize: 14, color: '#191A23' }}>Selfies in-memory, purged in 60s. Embeddings per-event isolated.</div>
          </div>
        </div>

        <div className="neo-card" style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#676767', fontWeight: 600, marginBottom: 12 }}>STACK • POSITIVUS GRADE</div>
          <div className="about-four-col">
            {[
              ['FRONTEND', 'React 18 • Positivus'],
              ['API', 'Node 20 • Express'],
              ['ML', 'InsightFace ONNX'],
              ['VECTOR', 'FAISS 512-d'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#F3F3F3', border: '1px solid #191A23', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>{k}</div>
                <div style={{ fontSize: 12, color: '#676767', marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="neo-btn neo-btn-dark" style={{ padding: '18px 28px' }} onClick={() => navigate('/login')}>Start using Fyndr →</button>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default About;
