import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ConfirmVerify = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    const s = new URLSearchParams(loc.search).get('status');
    setStatus(s === 'success' ? 'success' : 'error');
  }, [loc]);
  const ok = status === 'success';
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="neo-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9999, background: ok ? 'hsl(142 76% 36% / 0.14)' : 'hsl(var(--destructive) / 0.12)', border: `1px solid ${ok ? 'hsl(142 76% 36% / 0.2)' : 'hsl(var(--destructive) / 0.2)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{ok ? '✓' : '!'}</div>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: ok ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))' }}>{ok ? 'Email verified' : 'Link expired'}</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginTop: 6 }}>{ok ? 'Your account is active. Create events and share photos.' : 'This link is invalid or expired. Request a new one or sign in.'}</p>
        <button className="neo-btn neo-btn-yellow" style={{ marginTop: 16, width: '100%' }} onClick={() => navigate('/login')}>Go to sign in →</button>
      </div>
    </div>
  );
};
export default ConfirmVerify;
