import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { API_URL } from "../../utils/api";
import { ArrowLeft } from "lucide-react";

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              {step === 1 ? "Reset your password" : "Enter code & new password"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "We’ll send a one-time code to your email."
                : "Check your inbox — code expires in 10 minutes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <Label htmlFor="reset-otp">6-digit verification code</Label>
                  <Input
                    id="reset-otp"
                    type="tel"
                    inputMode="numeric"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    autoComplete="one-time-code"
                    className="text-center tracking-widest font-mono text-lg"
                  />
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
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgetPass;
