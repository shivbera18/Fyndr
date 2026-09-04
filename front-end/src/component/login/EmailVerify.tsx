import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { MailCheck } from "lucide-react";

const EmailVerify = (): React.JSX.Element => {
  const navigate = useNavigate();
  const loc = useLocation();
  const email = new URLSearchParams(loc.search).get("email") || "your email";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <MailCheck className="h-10 w-10" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a verification link to <strong className="text-foreground">{email}</strong>. Click it to activate your account.
            </p>
            <div className="pt-2">
              <Button onClick={() => navigate("/login")} className="w-full min-h-[44px]">
                Continue to sign in →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerify;
