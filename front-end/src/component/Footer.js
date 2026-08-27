import React from 'react';
import { Link } from 'react-router-dom';
import NeoBadge from './ui/NeoBadge';

const Footer = () => {
  return (
    <footer className="neo-footer">
      <div className="container">
        <div className="row g-4 justify-content-between">
          {/* Brand Column */}
          <div className="col-12 col-md-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="neo-badge neo-badge-yellow fs-5 px-3 py-1">⚡ FYNDR</span>
              <span className="neo-badge neo-badge-lime">AI FACE SEARCH</span>
            </div>
            <p style={{ color: '#E5E7EB', fontSize: '1.05rem', lineHeight: '1.6' }}>
              The zero-friction event photo sharing platform. Photographers upload albums, guests scan a QR code, snap a selfie, and instantly find their photos.
            </p>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <NeoBadge variant="cyan">🔒 100% Private</NeoBadge>
              <NeoBadge variant="purple">⚡ Sub-Second FAISS</NeoBadge>
              <NeoBadge variant="lime">🎯 High Accuracy</NeoBadge>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="col-6 col-md-3">
            <h5 style={{ color: 'var(--neo-yellow)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Navigation
            </h5>
            <ul className="list-unstyled d-flex flex-column gap-2" style={{ fontWeight: 700 }}>
              <li>
                <Link to="/" style={{ color: '#D1D5DB', textDecoration: 'none' }}>
                  → Home
                </Link>
              </li>
              <li>
                <Link to="/about" style={{ color: '#D1D5DB', textDecoration: 'none' }}>
                  → About Fyndr
                </Link>
              </li>
              <li>
                <Link to="/login" style={{ color: '#D1D5DB', textDecoration: 'none' }}>
                  → Photographer Login
                </Link>
              </li>
              <li>
                <Link to="/dashboard" style={{ color: '#D1D5DB', textDecoration: 'none' }}>
                  → Event Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="col-6 col-md-3">
            <h5 style={{ color: 'var(--neo-cyan)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Get In Touch
            </h5>
            <p style={{ color: '#D1D5DB', fontSize: '0.95rem' }}>
              Built for wedding & event photographers worldwide.
            </p>
            <div
              className="p-3 mt-2"
              style={{
                backgroundColor: '#1E1E1E',
                border: '2px solid #374151',
                borderRadius: '8px',
              }}
            >
              <div style={{ color: '#9CA3AF', fontSize: '0.8rem', textTransform: 'uppercase' }}>Email Support</div>
              <div style={{ color: '#FFFFFF', fontWeight: 800 }}>shiv@fyndr.in</div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="neo-footer-bottom d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <div>© {new Date().getFullYear()} FYNDR — Crafted with taste by Shiv Bera.</div>
          <div className="d-flex gap-2">
            <span className="neo-badge neo-badge-dark" style={{ border: '1px solid #4B5563', color: '#9CA3AF' }}>
              v1.0.0
            </span>
            <span className="neo-badge neo-badge-dark" style={{ border: '1px solid #4B5563', color: '#9CA3AF' }}>
              No App Required
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
