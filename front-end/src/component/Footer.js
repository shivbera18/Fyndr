import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="neo-footer">
      <div className="container" style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark)', fontWeight: 700, transform: 'rotate(14deg)' }}>✦</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: 'white' }}>Positivus</span>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 8 }}>FYNDR</span>
          </span>
          <nav style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'underline', fontSize: 16 }}>Overview</Link>
            <Link to="/about" style={{ color: 'white', textDecoration: 'underline', fontSize: 16 }}>How it works</Link>
            <Link to="/dashboard" style={{ color: 'white', textDecoration: 'underline', fontSize: 16 }}>Dashboard</Link>
            <Link to="/login" style={{ color: 'white', textDecoration: 'underline', fontSize: 16 }}>Sign in</Link>
          </nav>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Contact: shiv@fyndr.in</span>
        </div>

        <div className="footer-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center', background: '#292A32', borderRadius: 14, padding: 24, border: '1px solid #3A3A44' }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Built for photographers — zero friction.</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.5 }}>Guests scan QR → selfie → instant FAISS match. No app, no password. Selfies purged in 60s.</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <span className="neo-badge" style={{ background: 'var(--green)', color: 'var(--dark)', borderColor: 'var(--dark)' }}>FAISS 512-D</span>
            <span className="neo-badge" style={{ background: 'white', color: 'var(--dark)' }}>Private</span>
            <span className="neo-badge" style={{ background: 'white', color: 'var(--dark)' }}>No App</span>
          </div>
        </div>

        <div className="neo-footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 24, paddingTop: 16, display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
          <span>© {new Date().getFullYear()} FYNDR — Crafted by Shiv Bera</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>Privacy Policy</Link>
            <span>•</span>
            <span>v1 • Positivus edition</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
