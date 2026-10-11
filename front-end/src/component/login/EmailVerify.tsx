import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { MailCheck } from "lucide-react";
import { AuthShell } from "./AuthShell";
import { API_URL } from "../../utils/api";

const REDIRECT_SECS = 20;

const EmailVerify = (): React.JSX.Element => {
  const navigate = useNavigate();
  const loc = useLocation();
  const email = new URLSearchParams(loc.search).get("email") || "your email";
  const [seconds, setSeconds] = useState(REDIRECT_SECS);
  const [resendState, setResendState] = useState("");

  useEffect(() => {
    if (seconds <= 0) {
      navigate("/login");
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, navigate]);

  const resend = async (): Promise<void> => {
    setResendState("");
    try {
      const r = await fetch(`${API_URL}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json().catch(() => ({}));
      setResendState(r.ok ? "Verification link resent — check your inbox." : d.message || "Couldn't resend. Try again.");
    } catch {
      setResendState("Cannot reach server. Try again.");
    }
  };

  return (
    <AuthShell
      eyebrow="Check your inbox"
      title="Verify your email"
      description={`We sent a verification link to ${email}. Click it to activate your studio account.`}
    >
      <Card className="shadow-lg">
        <CardContent className="p-6 text-center space-y-4 sm:p-8">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-10 w-10" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We sent a verification link to <strong className="text-foreground">{email}</strong>.
            Click it to activate your account.
          </p>
          {resendState && (
            <p role="status" className="text-sm text-muted-foreground">
              {resendState}
            </p>
          )}
          <div className="space-y-2 pt-2">
            <Button onClick={() => navigate("/login")} className="w-full min-h-[44px]">
              Continue to sign in →
            </Button>
            <button
              type="button"
              onClick={resend}
              className="inline-flex min-h-[44px] items-center justify-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Resend verification link
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Redirecting to sign in in {seconds}s…{" "}
            <Link to="/login" className="underline underline-offset-4">
              Go now
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default EmailVerify;
