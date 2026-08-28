import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const EmailVerify = () => {
  const navigate = useNavigate();
  const loc = useLocation();
  const email = new URLSearchParams(loc.search).get('email') || 'your email';
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="neo-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'hsl(var(--primary) / 0.14)', border: '1px solid hsl(var(--primary) / 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>✉️</div>
        <h1 style={{ fontSize: 16, fontWeight: 600 }}>Check your inbox</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginTop: 6 }}>We sent a verification link to <span style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>{email}</span>. Click it to activate your account.</p>
        <button className="neo-btn neo-btn-yellow" style={{ marginTop: 16, width: '100%' }} onClick={() => navigate('/login')}>Continue to sign in →</button>
      </div>
    </div>
  );
};
export default EmailVerify;
