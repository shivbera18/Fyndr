import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "./AuthShell";

const ConfirmVerify = (): React.JSX.Element => {
  const loc = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const s = new URLSearchParams(loc.search).get("status");
    setStatus(s === "success" ? "success" : "error");
  }, [loc]);

  const ok = status === "success";

  return (
    <AuthShell
      eyebrow="Email verification"
      title={ok ? "Email verified" : "Link expired"}
      description={
        ok
          ? "Your account is active. Create events and share photos."
          : "This link is invalid or has already been used. Please sign in or request a new link."
      }
    >
      <Card className="shadow-lg">
        <CardContent className="p-6 text-center space-y-4 sm:p-8">
          <div className="flex justify-center">
            {ok ? (
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {ok
              ? "Your account is active. Create events and share photos."
              : "This link is invalid or has already been used. Please sign in or request a new link."}
          </p>
          <div className="space-y-2 pt-2">
            <Button onClick={() => navigate("/login")} className="w-full min-h-[44px]">
              Go to sign in →
            </Button>
            {!ok && (
              <Link
                to="/forgetpassword"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                Recover my account →
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default ConfirmVerify;
