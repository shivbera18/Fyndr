import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../landing.css";
import { Banner, Field, Reveal, Tabs } from "../landing/primitives";
import { API_URL } from "../../utils/api";

type Mode = "login" | "register";

const Login_Register = (): React.JSX.Element => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (localStorage.getItem("user")) navigate("/dashboard");
  }, [navigate]);

  const switchMode = (m: Mode): void => {
    setMode(m);
    setErr("");
    setOk("");
  };

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault(); setErr(""); setOk(""); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const d = await r.json();
      if (r.ok && d._id) { localStorage.setItem("user", JSON.stringify(d)); setOk("Signed in — redirecting…"); setTimeout(() => navigate("/dashboard"), 500); }
      else setErr(d.message || d.error || "Invalid email or password.");
    } catch { setErr("Cannot reach auth server."); } finally { setLoading(false); }
  };
  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault(); setErr(""); setOk(""); setLoading(true);
    try {
      const r = await fetch(`${API_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const d = await r.json();
      if (r.ok) { setOk(d.message || "Account created — sign in now."); setMode("login"); }
      else setErr(d.message || d.error || "Registration failed.");
    } catch { setErr("Cannot reach auth server."); } finally { setLoading(false); }
  };

  return (
    <div className="fy-page fy-container">
      <div className="fy-auth-wrap">
        <Reveal className="fy-auth-card">
          <div className="fy-card">
            <div className="fy-page-head">
              <h1>{mode === "login" ? "Sign in to Fyndr" : "Create your account"}</h1>
              <p className="fy-lede">{mode === "login" ? "Welcome back — manage your events and photos." : "Start sharing event photos in minutes."}</p>
            </div>

            <Tabs tabs={[{ id: "login", label: "Sign in" }, { id: "register", label: "Register" }]} active={mode} onChange={switchMode} />

            {err && <Banner kind="error">{err}</Banner>}
            {ok && <Banner kind="success">{ok}</Banner>}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="fy-form">
                <Field label="Email" name="email" type="email" placeholder="you@studio.com" value={email} onChange={setEmail} required autoComplete="email" />
                <Field label="Password" name="password" type="password" placeholder="••••••••" value={password} onChange={setPassword} required autoComplete="current-password" />
                <div style={{ textAlign: "right" }}><Link to="/forgetpassword" className="fy-link-muted" style={{ fontSize: 12 }}>Forgot?</Link></div>
                <button type="submit" className="fy-btn fy-btn-default fy-btn-md" disabled={loading}>{loading ? "Signing in…" : "Sign in →"}</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="fy-form">
                <Field label="Studio name" name="name" placeholder="Apex Visuals" value={name} onChange={setName} required autoComplete="organization" />
                <Field label="Email" name="email" type="email" placeholder="studio@example.com" value={email} onChange={setEmail} required autoComplete="email" />
                <Field label="Password" name="password" type="password" placeholder="At least 6 characters" value={password} onChange={setPassword} required autoComplete="new-password" />
                <button type="submit" className="fy-btn fy-btn-default fy-btn-md" disabled={loading}>{loading ? "Creating…" : "Create account →"}</button>
              </form>
            )}

            <p className="fy-micro" style={{ textAlign: "center", marginTop: "1rem" }}>Guest looking for photos? Scan the QR code provided by your event photographer.</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="fy-micro" style={{ textAlign: "center", marginTop: "1rem" }}>© {new Date().getFullYear()} FYNDR — Fast &amp; Private Event Photography</p>
        </Reveal>
      </div>
    </div>
  );
};
export default Login_Register;
