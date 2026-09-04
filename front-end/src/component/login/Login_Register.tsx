import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { API_URL } from "../../utils/api";
import { cn } from "../../lib/utils";

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
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const d = await r.json();
      if (r.ok && d._id) {
        localStorage.setItem("user", JSON.stringify(d));
        setOk("Signed in — redirecting…");
        setTimeout(() => navigate("/dashboard"), 800);
      } else {
        setErr(d.message || d.error || "Invalid email or password.");
      }
    } catch {
      setErr("Cannot reach auth server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const d = await r.json();
      if (r.ok) {
        setOk(d.message || "Account created — sign in now.");
        setMode("login");
      } else {
        setErr(d.message || d.error || "Registration failed.");
      }
    } catch {
      setErr("Cannot reach auth server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md space-y-4">
        {/* Logo */}
        <div className="text-center pb-2">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline text-foreground">
            <span
              aria-hidden="true"
              className="flex h-[32px] w-[32px] items-center justify-center rounded-lg bg-zinc-900 text-brand font-bold text-sm"
            >
              ✦
            </span>
            <span className="font-display font-bold text-xl tracking-tight">FYNDR</span>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl sm:text-2xl font-bold">
              {mode === "login" ? "Sign in to Fyndr" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Welcome back — manage your events and photos."
                : "Start sharing event albums with AI face match."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Segmented Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-muted rounded-lg text-sm font-medium">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={cn(
                  "py-2 rounded-md transition-all min-h-[40px] flex items-center justify-center",
                  mode === "login"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={cn(
                  "py-2 rounded-md transition-all min-h-[40px] flex items-center justify-center",
                  mode === "register"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Register
              </button>
            </div>

            {err && (
              <div className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20 text-center">
                {err}
              </div>
            )}
            {ok && (
              <div className="rounded-lg p-3 text-sm font-medium border bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800 text-center">
                {ok}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Link
                      to="/forgetpassword"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  className="w-full min-h-[44px]"
                >
                  Sign in →
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Studio or photographer name</Label>
                  <Input
                    id="reg-name"
                    placeholder="Apex Visuals"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email address</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="studio@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  className="w-full min-h-[44px]"
                >
                  Create account →
                </Button>
              </form>
            )}

            <p className="text-xs text-muted-foreground text-center pt-2">
              Guest looking for photos? Scan the event QR code or visit your event link directly.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center font-mono">
          © {new Date().getFullYear()} FYNDR • Fast &amp; Private
        </p>
      </div>
    </div>
  );
};

export default Login_Register;
