import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              {ok ? (
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {ok ? "Email verified" : "Link expired"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ok
                ? "Your account is active. Create events and share photos."
                : "This link is invalid or has already been used. Please sign in or request a new link."}
            </p>
            <div className="pt-2">
              <Button onClick={() => navigate("/login")} className="w-full min-h-[44px]">
                Go to sign in →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmVerify;
