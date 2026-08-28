import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="neo-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-12 col-md-5">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'hsl(var(--primary))',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'hsl(var(--primary-foreground))', fontSize: 10, fontWeight: 700,
              }}>◆</span>
              <span style={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(var(--foreground))' }}>FYNDR</span>
              <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', letterSpacing: '0.08em' }}>ACTORS EDITION</span>
            </div>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: 420 }}>
              Event photo platform inspired by Rivet Actors — durable, serverless, and instant. Upload once, guests find themselves via on-device face search.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <span className="neo-badge">Private</span>
              <span className="neo-badge neo-badge-yellow">FAISS</span>
              <span className="neo-badge">No app</span>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: 12, textTransform: 'uppercase' }}>Navigation</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link to="/" style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: 14 }}>Overview</Link></li>
              <li><Link to="/about" style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: 14 }}>About</Link></li>
              <li><Link to="/login" style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: 14 }}>Sign in</Link></li>
              <li><Link to="/dashboard" style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: 14 }}>Dashboard</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-4">
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: 12, textTransform: 'uppercase' }}>Contact</div>
            <div style={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              padding: 12,
              maxWidth: 300,
            }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</div>
              <div style={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: 14 }}>shiv@fyndr.in</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>Crafted by Shiv Bera</div>
            </div>
          </div>
        </div>

        <div className="neo-footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>© {new Date().getFullYear()} FYNDR — Rivet-inspired serverless photos.</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <span className="neo-badge">v1 · actors</span>
            <span className="neo-badge">dark</span>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
