import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NeoButton from '../ui/NeoButton';
import NeoBadge from '../ui/NeoBadge';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (_) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <header className="neo-nav">
      <div className="neo-nav-container">
        {/* Brand */}
        <Link to="/" className="neo-brand">
          <span className="neo-brand-badge">⚡</span>
          <span>FYNDR</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="neo-nav-links d-none d-md-flex">
          <Link to="/" className="neo-nav-link">
            Home
          </Link>
          <Link to="/about" className="neo-nav-link">
            About
          </Link>
          {user && (
            <Link to="/dashboard" className="neo-nav-link">
              Dashboard
            </Link>
          )}
        </nav>

        {/* Action Buttons / User Status */}
        <div className="d-none d-md-flex align-items-center gap-3">
          {user ? (
            <>
              <NeoBadge variant="lime" className="px-3 py-2">
                👤 {user.name || user.email?.split('@')[0] || 'Photographer'}
              </NeoBadge>
              <NeoButton
                variant="yellow"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                My Events
              </NeoButton>
              <NeoButton
                variant="white"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </NeoButton>
            </>
          ) : (
            <>
              <NeoButton
                variant="white"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Sign In
              </NeoButton>
              <NeoButton
                variant="yellow"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Get Started →
              </NeoButton>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="d-flex d-md-none">
          <button
            type="button"
            className="neo-btn neo-btn-yellow neo-btn-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="d-md-none p-3 mt-2"
          style={{
            backgroundColor: 'var(--neo-yellow)',
            borderTop: 'var(--neo-border-thick)',
            borderBottom: 'var(--neo-border-thick)',
          }}
        >
          <div className="d-flex flex-column gap-2">
            <Link
              to="/"
              className="neo-btn neo-btn-white neo-btn-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              🏠 Home
            </Link>
            <Link
              to="/about"
              className="neo-btn neo-btn-white neo-btn-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              ℹ️ About Fyndr
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="neo-btn neo-btn-lime neo-btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📸 Dashboard ({user.name || 'User'})
                </Link>
                <button
                  type="button"
                  className="neo-btn neo-btn-dark neo-btn-sm text-start"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="neo-btn neo-btn-cyan neo-btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🔑 Sign In
                </Link>
                <Link
                  to="/login"
                  className="neo-btn neo-btn-purple neo-btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ✨ Create Free Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
