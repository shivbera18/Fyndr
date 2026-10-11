import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { API_URL } from "../../utils/api";
import { signOut } from "../../utils/session";
import { cn } from "../../lib/utils";
import { AuthShell } from "./AuthShell";

type Mode = "login" | "register";

const Login_Register = (): React.JSX.Element => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
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
        await signOut();
        localStorage.setItem("user", JSON.stringify(d));
        window.dispatchEvent(new Event("user-updated"));
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
    <AuthShell
      eyebrow={mode === "login" ? "Welcome back" : "For photographers"}
      title={mode === "login" ? "Sign in to Fyndr" : "Create your account"}
      description={
        mode === "login"
          ? "Welcome back — manage your events and photos."
          : "Start sharing event albums with AI face match."
      }
    >
      <Card className="shadow-lg">
        <CardContent className="space-y-4 p-6">
          {/* Segmented Mode Switcher */}
          <div
            role="tablist"
            aria-label="Sign in or register"
            className="grid grid-cols-2 p-1 bg-muted rounded-lg text-sm font-medium"
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={cn(
                  "py-2 rounded-md transition-all min-h-[44px] flex items-center justify-center",
                  mode === m
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {err && (
            <div
              role="alert"
              className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20"
            >
              {err}
            </div>
          )}
          {ok && (
            <div
              role="status"
              className="rounded-lg p-3 text-sm font-medium border bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-900"
            >
              {ok}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={reduceMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
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
            </motion.div>
          </AnimatePresence>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Guest looking for photos? Scan the event QR code or visit your event link directly.
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default Login_Register;
