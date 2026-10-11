import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Callout } from "../../components/ui/page-kit";
import { Loader2, CheckCircle2, CloudOff } from "lucide-react";
import { API_URL } from "../../utils/api";
import { purgeEphemeralCaches } from "../../utils/session";

export default function DriveCallback(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Connecting your Drive…");
  // OAuth codes are single-use: StrictMode double-fires this effect in dev,
  // so guard the initial exchange to one run. Retries call exchange() directly.
  const didRun = useRef(false);

  const exchange = useCallback(() => {
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
    setStatus("working");
    setMessage("Exchanging the Google code for your Drive link…");
    fetch(`${API_URL}/drive/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, user_id: userId }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && d.connected) {
          // Fresh token minted — drop pre-reconnect caches so the new link
          // never reads stale event/album/photo state from the dead session.
          await purgeEphemeralCaches();
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

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    exchange();
  }, [exchange]);

  const retry = () => {
    exchange();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5f1] px-4">
      <Card className="w-full max-w-md border-black/10 bg-white shadow-sm">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Google Drive
          </p>
          <CardTitle>
            {status === "error" ? "Drive not connected" : status === "done" ? "Drive connected" : "Connecting Google Drive"}
          </CardTitle>
          {status === "working" && (
            <CardDescription>Hold tight — finishing the secure exchange.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "working" && (
            <div className="flex items-center gap-3" role="status" aria-live="polite">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}
          {status === "done" && (
            <div className="flex items-center gap-3" role="status">
              <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}
          {status === "error" && (
            <>
              <div className="flex items-start gap-3">
                <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              <Callout variant="error" title="Troubleshoot the Drive link">
                <ul className="list-disc space-y-1 pl-4">
                  <li>Use the same Google account you picked on the consent screen.</li>
                  <li>Don&apos;t refresh mid-exchange — codes are single-use.</li>
                  <li>If you denied access, reconnect from Settings → Storage.</li>
                </ul>
              </Callout>
              <div className="flex flex-wrap gap-2">
                <Button onClick={retry} className="min-h-[44px]">
                  Try again
                </Button>
                <Link to="/settings?tab=storage">
                  <Button variant="secondary" className="min-h-[44px]">
                    Back to Settings
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
