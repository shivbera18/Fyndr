import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 800);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    const s = localStorage.getItem('user');
    if (s) try { setUser(JSON.parse(s)); } catch { setUser(null); } else setUser(null);
  }, [location]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }, [mobileOpen]);

  const logout = () => { localStorage.removeItem('user'); setUser(null); navigate('/'); };

  const Logo = ({ size = 36 }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: size, height: size, borderRadius: 8,
        background: 'var(--dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: size * 0.45, transform: 'rotate(14deg)', fontWeight: 700,
      }}>✦</span>
      <span style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', color: 'var(--dark)' }}>FYNDR</span>
      <span style={{ fontSize: 9, letterSpacing: '0.12em', color: '#676767', borderLeft: '1px solid #DDDDDD', paddingLeft: 8, marginLeft: 2 }}>EVENT PHOTOS</span>
    </span>
  );

  return (
    <header className="neo-nav">
      <div className="neo-nav-container">
        <Link to="/" style={{ textDecoration: 'none' }}><Logo /></Link>

        {!isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <nav className="neo-nav-links">
              <Link to="/" className="neo-nav-link">Overview</Link>
              <Link to="/about" className="neo-nav-link">How it works</Link>
              <Link to="/dashboard" className="neo-nav-link">Dashboard</Link>
              <a href="https://github.com/shivbera18/Fyndr" target="_blank" rel="noreferrer" className="neo-nav-link">GitHub</a>
            </nav>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {user ? (
                <>
                  <span style={{ fontSize: 13, color: '#676767' }}>{user.name || user.email?.split('@')[0]}</span>
                  <button className="neo-btn neo-btn-yellow" style={{ padding: '12px 20px', fontSize: 16 }} onClick={() => navigate('/dashboard')}>Dashboard</button>
                  <button className="neo-btn neo-btn-white" style={{ padding: '12px 20px', fontSize: 16 }} onClick={logout}>Logout</button>
                </>
              ) : (
                <>
                  <button className="neo-btn neo-btn-white" style={{ padding: '14px 22px' }} onClick={() => navigate('/login')}>Sign in</button>
                  <button className="neo-btn neo-btn-dark" style={{ padding: '14px 22px' }} onClick={() => navigate('/login')}>Request a quote</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', justifyContent: 'end' }}>
            <button
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Menu"
              style={{
                width: 36, height: 36, border: 'none', background: 'transparent',
                fontSize: 28, lineHeight: 1, cursor: 'pointer',
              }}
            >
              {mobileOpen ? '×' : '☰'}
            </button>
          </div>
        )}
      </div>

      {isMobile && mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, top: 64, background: 'white',
          padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16, zIndex: 1000,
          borderTop: '1px solid #191A23', overflowY: 'auto',
        }}>
          <Link to="/" className="neo-nav-link" style={{ fontSize: 20 }} onClick={() => setMobileOpen(false)}>Overview</Link>
          <Link to="/about" className="neo-nav-link" style={{ fontSize: 20 }} onClick={() => setMobileOpen(false)}>How it works</Link>
          <Link to="/dashboard" className="neo-nav-link" style={{ fontSize: 20 }} onClick={() => setMobileOpen(false)}>Dashboard</Link>
          <a href="https://github.com/shivbera18/Fyndr" target="_blank" rel="noreferrer" className="neo-nav-link" style={{ fontSize: 20 }} onClick={() => setMobileOpen(false)}>GitHub</a>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <span style={{ fontSize: 14, color: '#676767', fontWeight: 500 }}>Signed in as: <strong>{user.name || user.email?.split('@')[0]}</strong></span>
              <button className="neo-btn neo-btn-yellow" style={{ padding: '12px 20px', fontSize: 16, width: '100%', justifyContent: 'center' }} onClick={() => { setMobileOpen(false); navigate('/dashboard'); }}>Dashboard</button>
              <button className="neo-btn neo-btn-white" style={{ padding: '12px 20px', fontSize: 16, width: '100%', justifyContent: 'center' }} onClick={() => { setMobileOpen(false); logout(); }}>Logout</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button className="neo-btn neo-btn-white" style={{ padding: '12px 20px', fontSize: 16, width: '100%', justifyContent: 'center' }} onClick={() => { setMobileOpen(false); navigate('/login'); }}>Sign in</button>
              <button className="neo-btn neo-btn-dark" style={{ padding: '12px 20px', fontSize: 16, width: '100%', justifyContent: 'center' }} onClick={() => { setMobileOpen(false); navigate('/login'); }}>Get started</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
export default Header;
