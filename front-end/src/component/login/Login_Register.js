import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../utils/api';

const Login_Register = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    if (localStorage.getItem('user')) navigate('/dashboard');
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      const d = await r.json();
      if (r.ok && d._id) { localStorage.setItem('user', JSON.stringify(d)); setOk('Signed in — redirecting…'); setTimeout(() => navigate('/dashboard'), 500); }
      else setErr(d.message || d.error || 'Invalid email or password.');
    } catch { setErr('Cannot reach auth server.'); } finally { setLoading(false); }
  };
  const handleRegister = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const d = await r.json();
      if (r.ok) { setOk(d.message || 'Account created — sign in now.'); setMode('login'); }
      else setErr(d.message || d.error || 'Registration failed.');
    } catch { setErr('Cannot reach auth server.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, transform: 'rotate(14deg)', fontSize: 13 }}>✦</span>
          <span style={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--dark)', fontSize: 20 }}>FYNDR</span>
          <span style={{ fontSize: 10, color: '#676767', letterSpacing: '0.08em', border: '1px solid #DDDDDD', padding: '2px 6px', borderRadius: 9999 }}>EVENT PHOTOS</span>
        </div>
        <div className="neo-card" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600 }}>{mode === 'login' ? 'Sign in to Fyndr' : 'Create your account'}</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginTop: 4 }}>{mode === 'login' ? 'Welcome back — your events await.' : 'Start hosting events in 60s. No card required.'}</p>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'hsl(var(--muted))', padding: 3, borderRadius: 8, border: '1px solid hsl(var(--border))' }}>
            <button onClick={() => { setMode('login'); setErr(''); setOk(''); }} style={{ flex: 1, height: 28, borderRadius: 6, border: 'none', background: mode === 'login' ? 'hsl(var(--card))' : 'transparent', color: mode === 'login' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', fontWeight: 500, fontSize: 13, boxShadow: mode === 'login' ? '0 1px 2px hsl(240 6% 4% / 0.08)' : 'none', borderWidth: mode === 'login' ? '1px' : 0, borderStyle: 'solid', borderColor: 'hsl(var(--border))' }}>Sign in</button>
            <button onClick={() => { setMode('register'); setErr(''); setOk(''); }} style={{ flex: 1, height: 28, borderRadius: 6, border: 'none', background: mode === 'register' ? 'hsl(var(--card))' : 'transparent', color: mode === 'register' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', fontWeight: 500, fontSize: 13, boxShadow: mode === 'register' ? '0 1px 2px hsl(240 6% 4% / 0.08)' : 'none', borderWidth: mode === 'register' ? '1px' : 0, borderStyle: 'solid', borderColor: 'hsl(var(--border))' }}>Create account</button>
          </div>

          {err && <div style={{ background: 'hsl(var(--destructive) / 0.12)', border: '1px solid hsl(var(--destructive) / 0.22)', color: 'hsl(var(--destructive))', borderRadius: 8, padding: '8px 10px', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          {ok && <div style={{ background: 'hsl(142 76% 36% / 0.12)', border: '1px solid hsl(142 76% 36% / 0.22)', color: 'hsl(142 76% 36%)', borderRadius: 8, padding: '8px 10px', fontSize: 13, marginBottom: 12 }}>{ok}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Email</span>
                <input className="neo-input" type="email" placeholder="you@studio.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>Password <Link to="/forgetpassword" style={{ color: 'hsl(var(--primary))', textDecoration: 'none', fontSize: 12 }}>Forgot?</Link></span>
                <input className="neo-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </label>
              <button type="submit" className="neo-btn neo-btn-yellow" disabled={loading} style={{ height: 36, marginTop: 4 }}>{loading ? 'Signing in…' : 'Sign in →'}</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Studio name</span>
                <input className="neo-input" placeholder="Apex Visuals" value={name} onChange={e => setName(e.target.value)} required autoComplete="organization" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Email</span>
                <input className="neo-input" type="email" placeholder="studio@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Password</span>
                <input className="neo-input" type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
              </label>
              <button type="submit" className="neo-btn neo-btn-yellow" disabled={loading} style={{ height: 36 }}>{loading ? 'Creating…' : 'Create account →'}</button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Guest looking for photos? Scan the QR code provided by your event photographer.</div>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>© {new Date().getFullYear()} FYNDR — Fast & Private Event Photography</div>
      </div>
    </div>
  );
};
export default Login_Register;
