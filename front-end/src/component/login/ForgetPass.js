import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ForgetPass = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const sendOtp = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setLoading(true);
    try {
      const r = await fetch('http://localhost:5000/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      const d = await r.json();
      if (r.ok) { setOk('OTP sent to your email.'); setStep(2); } else setErr(d.message || d.error || 'Failed to send OTP.');
    } catch { setErr('Cannot reach server.'); } finally { setLoading(false); }
  };
  const verify = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setLoading(true);
    try {
      const r = await fetch('http://localhost:5000/newPassword-verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newpassword: newPassword }) });
      const d = await r.json();
      if (r.ok) { setOk('Password updated — redirecting…'); setTimeout(() => navigate('/login'), 1000); } else setErr(d.message || d.error || 'Invalid OTP.');
    } catch { setErr('Cannot reach server.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          <span style={{ width: 24, height: 24, borderRadius: 8, background: 'hsl(var(--primary))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary-foreground))', fontWeight: 700, fontSize: 12 }}>◆</span>
          <span style={{ fontWeight: 700, color: 'hsl(var(--foreground))' }}>FYNDR</span>
        </div>
        <div className="neo-card">
          <h1 style={{ fontSize: 16, fontWeight: 600 }}>{step === 1 ? 'Reset your password' : 'Enter code & new password'}</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, marginTop: 4 }}>{step === 1 ? 'We’ll send a one-time code to your email.' : 'Check your inbox — code expires quickly.'}</p>

          {err && <div style={{ marginTop: 12, background: 'hsl(var(--destructive) / 0.12)', border: '1px solid hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>{err}</div>}
          {ok && <div style={{ marginTop: 12, background: 'hsl(142 76% 36% / 0.12)', border: '1px solid hsl(142 76% 36% / 0.2)', color: 'hsl(142 76% 36%)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>{ok}</div>}

          {step === 1 ? (
            <form onSubmit={sendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 500 }}>Email</span><input className="neo-input" type="email" placeholder="you@studio.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
              <button className="neo-btn neo-btn-yellow" type="submit" disabled={loading} style={{ height: 36 }}>{loading ? 'Sending…' : 'Send code →'}</button>
            </form>
          ) : (
            <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 500 }}>6-digit code</span><input className="neo-input" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} required autoComplete="one-time-code" inputMode="numeric" /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 500 }}>New password</span><input className="neo-input" type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" /></label>
              <div style={{ display: 'flex', gap: 8 }}><button type="button" className="neo-btn neo-btn-white" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button><button className="neo-btn neo-btn-yellow" type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? 'Updating…' : 'Update password'}</button></div>
            </form>
          )}
          <div style={{ textAlign: 'center', marginTop: 14 }}><Link to="/login" style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>← Back to sign in</Link></div>
        </div>
      </div>
    </div>
  );
};
export default ForgetPass;
