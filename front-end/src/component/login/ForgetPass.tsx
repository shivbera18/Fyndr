import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { API_URL } from "../../utils/api";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import { AuthShell } from "./AuthShell";

const OTP_LEN = 6;
const RESEND_SECS = 30;

const ForgetPass = (): React.JSX.Element => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setOk("OTP sent to your email.");
        setStep(2);
        setCooldown(RESEND_SECS);
      } else {
        setErr(d.message || d.error || "Failed to send OTP.");
      }
    } catch {
      setErr("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async (): Promise<void> => {
    if (cooldown > 0 || loading || !email.trim()) return;
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setOk("New code sent — check your inbox.");
        setCooldown(RESEND_SECS);
      } else {
        setErr(d.message || d.error || "Failed to send OTP.");
      }
    } catch {
      setErr("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/newPassword-verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newpassword: newPassword.trim(),
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setOk("Password updated — redirecting to login…");
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setErr(d.message || d.error || "Verification failed.");
      }
    } catch {
      setErr("Cannot reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (i: number, v: string): void => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = otp.padEnd(OTP_LEN, " ").split("").slice(0, OTP_LEN);
    next[i] = d || " ";
    setOtp(next.join("").trim());
    if (d && i < OTP_LEN - 1) boxRefs.current[i + 1]?.focus();
  };

  const digits = Array.from({ length: OTP_LEN }, (_, i) => otp[i] ?? "");

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={step === 1 ? "Reset your password" : "Enter code & new password"}
      description={
        step === 1
          ? "We’ll send a one-time code to your email."
          : "Check your inbox — code expires in 10 minutes."
      }
    >
      <Card className="shadow-lg">
        <CardContent className="space-y-4 p-6">
          {/* Step indicator */}
          <ol aria-label="Password reset progress" className="flex items-center gap-2 text-xs font-medium">
            {[1, 2].map((s) => (
              <li key={s} className="flex flex-1 items-center gap-2" aria-current={step === s ? "step" : undefined}>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                    step >= s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground"
                  )}
                >
                  {s}
                </span>
                <span className={step === s ? "text-foreground" : "text-muted-foreground"}>
                  {s === 1 ? "Email" : "Code + password"}
                </span>
                {s === 1 && <span aria-hidden className="h-px flex-1 bg-border" />}
              </li>
            ))}
          </ol>

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

          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                className="w-full min-h-[44px]"
              >
                Send verification code →
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-otp-0">6-digit verification code</Label>
                <div className="flex gap-2" role="group" aria-label="6-digit verification code">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      id={i === 0 ? "reset-otp-0" : undefined}
                      ref={(el) => {
                        boxRefs.current[i] = el;
                      }}
                      value={d}
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      aria-label={`Digit ${i + 1}`}
                      required
                      maxLength={1}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digits[i] && i > 0) {
                          boxRefs.current[i - 1]?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
                        if (text.length > 1) {
                          e.preventDefault();
                          setOtp(text);
                          boxRefs.current[Math.min(text.length, OTP_LEN - 1)]?.focus();
                        }
                      }}
                      className="h-[52px] w-full min-w-0 flex-1 rounded-md border border-input bg-background text-center font-mono text-lg tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  ))}
                </div>
                {/* Hidden single field keeps the old label association + form shape for tests */}
                <input id="reset-otp" type="hidden" value={otp} readOnly aria-hidden tabIndex={-1} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-new-password">New password</Label>
                <Input
                  id="reset-new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Didn’t get a code?{" "}
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0 || loading}
                  className="font-medium text-foreground underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="min-h-[44px]"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  className="flex-1 min-h-[44px]"
                >
                  Update password →
                </Button>
              </div>
            </form>
          )}

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default ForgetPass;
