import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { API_URL } from "../../utils/api";

export default function DriveCallback(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Connecting your Drive…");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      setMessage(error === "access_denied" ? "Drive access was denied. Try again from Settings." : `Google returned: ${error}`);
      return;
    }
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const rawUser = localStorage.getItem("user");
    const userId = rawUser ? (JSON.parse(rawUser)._id as string | undefined) : undefined;
    if (!code || !state || !userId) {
      setStatus("error");
      setMessage("Missing code, state, or login. Reconnect from Settings.");
      return;
    }
    fetch(`${API_URL}/drive/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, user_id: userId }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && d.connected) {
          setStatus("done");
          setMessage(`Drive connected (${d.email}). Returning to Settings…`);
          setTimeout(() => navigate("/settings?tab=storage"), 1200);
        } else {
          setStatus("error");
          setMessage(d.error || "Drive link failed. Try again.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error reaching the API. Try again.");
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{status === "error" ? "Drive not connected" : "Connecting Google Drive"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          {status === "error" && (
            <Link to="/settings?tab=storage">
              <Button className="min-h-[44px]">Back to Settings</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
