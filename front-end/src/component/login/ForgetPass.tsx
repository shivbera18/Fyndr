import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../landing.css";
import { Banner, Field, Reveal } from "../landing/primitives";
import { API_URL } from "../../utils/api";

const ForgetPass = (): React.JSX.Element => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const sendOtp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault(); setErr(""); setOk(""); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/send-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const d = await r.json();
      if (r.ok) { setOk("OTP sent to your email."); setStep(2); } else setErr(d.message || d.error || "Failed to send OTP.");
    } catch { setErr("Cannot reach server."); } finally { setLoading(false); }
  };
  const verify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault(); setErr(""); setOk(""); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/newPassword-verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newpassword: newPassword }) });
      const d = await r.json();
      if (r.ok) { setOk("Password updated — redirecting…"); setTimeout(() => navigate("/login"), 1000); } else setErr(d.message || d.error || "Invalid OTP.");
    } catch { setErr("Cannot reach server."); } finally { setLoading(false); }
  };

  return (
    <div className="fy-page fy-container">
      <div className="fy-auth-wrap">
        <Reveal className="fy-auth-card">
          <div className="fy-card">
            <div className="fy-page-head">
              <h1>{step === 1 ? "Reset your password" : "Enter code & new password"}</h1>
              <p className="fy-lede">{step === 1 ? "We’ll send a one-time code to your email." : "Check your inbox — code expires quickly."}</p>
            </div>

            {err && <Banner kind="error">{err}</Banner>}
            {ok && <Banner kind="success">{ok}</Banner>}

            {step === 1 ? (
              <form onSubmit={sendOtp} className="fy-form">
                <Field label="Email" name="email" type="email" placeholder="you@studio.com" value={email} onChange={setEmail} required autoComplete="email" />
                <button className="fy-btn fy-btn-default fy-btn-md" type="submit" disabled={loading}>{loading ? "Sending…" : "Send code →"}</button>
              </form>
            ) : (
              <form onSubmit={verify} className="fy-form">
                <Field label="6-digit code" name="otp" placeholder="123456" value={otp} onChange={setOtp} required autoComplete="one-time-code" />
                <Field label="New password" name="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={setNewPassword} required autoComplete="new-password" />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="fy-btn fy-btn-outline fy-btn-md" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
                  <button className="fy-btn fy-btn-default fy-btn-md" type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Updating…" : "Update password"}</button>
                </div>
              </form>
            )}
            <div className="fy-auth-links"><Link to="/login" className="fy-link-muted">← Back to sign in</Link></div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};
export default ForgetPass;
