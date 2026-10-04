import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { API_URL } from "../../utils/api";
import { toast } from "sonner";
import { purgeEphemeralCaches } from "../../utils/session";
import { HardDrive, Loader2 } from "lucide-react";

interface DriveStatus {
  connected: boolean;
  email: string | null;
  folderId: string | null;
  connectedAt: string | null;
}

export default function DriveStorageCard(): React.JSX.Element {
  const rawUser = localStorage.getItem("user");
  const userId = rawUser ? (JSON.parse(rawUser)._id as string | undefined) : undefined;
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const r = await fetch(`${API_URL}/drive/status?user_id=${userId}`);
    if (r.ok) setStatus(await r.json());
  }, [userId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const connect = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/drive/connect?user_id=${userId}`);
      const d = await r.json();
      if (r.ok && d.authUrl) window.location.href = d.authUrl;
      else toast.error(d.error || "Could not start Drive link");
    } catch {
      toast.error("Network error starting Drive link");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/drive/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (r.ok) {
        // Hard purge: server revoked at Google + deleted the doc. Drop every
        // local trace so a reconnect starts clean.
        await purgeEphemeralCaches();
        toast.success("Drive disconnected — local Drive cache cleared, reconnect anytime");
        await load();
      } else toast.error("Disconnect failed");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-5" />
          Google Drive Storage
        </CardTitle>
        <CardDescription>
          Link your own Google Drive for future direct photo backup. Your Fyndr photos stay put — this reserves a
          “Fyndr Storage” folder on your Drive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Checking Drive status…
          </p>
        ) : status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">Connected</Badge>
              <span className="text-sm">{status.email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Folder ready{status.folderId ? "" : " (pending)"} · linked{" "}
              {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : ""}
            </p>
            <Button variant="outline" onClick={disconnect} disabled={busy} className="min-h-[44px]">
              Disconnect Drive
            </Button>
          </div>
        ) : (
          <Button onClick={connect} disabled={busy} className="min-h-[44px]">
            {busy ? "Starting…" : "Connect Google Drive"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
