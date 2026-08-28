import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    } else setUser(null);
  }, [location]);

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const LogoMark = () => (
    <span
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: 'hsl(var(--primary))',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'hsl(var(--primary-foreground))',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '-0.02em',
      }}
    >
      ◆
    </span>
  );

  return (
    <header className="neo-nav">
      <div className="neo-nav-container">
        <Link to="/" className="neo-brand" style={{ gap: 10 }}>
          <LogoMark />
          <span style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>FYNDR</span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'hsl(var(--muted-foreground))',
            border: '1px solid hsl(var(--border))',
            padding: '2px 6px',
            borderRadius: 9999,
            marginLeft: 2,
          }}>ACTORS</span>
        </Link>

        <nav className="neo-nav-links d-none d-md-flex">
          <Link to="/" className="neo-nav-link">Overview</Link>
          <Link to="/about" className="neo-nav-link">About</Link>
          {user && <Link to="/dashboard" className="neo-nav-link">Dashboard</Link>}
          <a href="https://github.com/shivbera18/Fyndr" target="_blank" rel="noreferrer" className="neo-nav-link">GitHub</a>
        </nav>

        <div className="d-none d-md-flex align-items-center" style={{ gap: 8 }}>
          {user ? (
            <>
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'hsl(var(--muted-foreground))',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                padding: '6px 10px',
                borderRadius: 8,
              }}>
                {user.name || user.email?.split('@')[0]}
              </span>
              <button className="neo-btn neo-btn-yellow neo-btn-sm" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button className="neo-btn neo-btn-white neo-btn-sm" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <button className="neo-btn neo-btn-white neo-btn-sm" onClick={() => navigate('/login')}>Sign in</button>
              <button className="neo-btn neo-btn-yellow neo-btn-sm glow-accent" onClick={() => navigate('/login')}>Get started</button>
            </>
          )}
        </div>

        <button
          className="d-md-none neo-btn neo-btn-white neo-btn-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div
          style={{
            borderTop: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            padding: 12,
          }}
          className="d-md-none"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link className="neo-btn neo-btn-white neo-btn-sm" to="/" onClick={() => setMobileOpen(false)}>Overview</Link>
            <Link className="neo-btn neo-btn-white neo-btn-sm" to="/about" onClick={() => setMobileOpen(false)}>About</Link>
            {user ? (
              <>
                <Link className="neo-btn neo-btn-yellow neo-btn-sm" to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <button className="neo-btn neo-btn-white neo-btn-sm" onClick={() => { setMobileOpen(false); logout(); }}>Sign out</button>
              </>
            ) : (
              <>
                <Link className="neo-btn neo-btn-white neo-btn-sm" to="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                <Link className="neo-btn neo-btn-yellow neo-btn-sm" to="/login" onClick={() => setMobileOpen(false)}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
