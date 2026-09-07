import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../utils/api";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Camera,
  Check,
  Copy,
  Laptop,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
} from "lucide-react";

type FtpLoginStatus = {
  tag: string;
  username: string;
  lastSeenAt: string | null;
  bytesIn: number;
};

type FtpStatus = {
  host: string | null;
  port: number;
  enabled: boolean;
  logins: FtpLoginStatus[];
};

type FreshCred = { tag: string; username: string; password: string };

type Props = {
  eventID: string;
  ownerId: string;
};

// Brand menu paths (menus vary by body — these are the canonical routes).
const BRAND_STEPS: { id: string; label: string; steps: string[] }[] = [
  {
    id: "canon",
    label: "Canon",
    steps: [
      "Menu → Network (yellow tab) → Connection settings → SET* → Communication settings → FTP.",
      "Server: the Host or IP below, port 21. Login with your Username + Password. Encryption OFF, mode PASV.",
      "Transfer settings → Auto transfer: ON. Transfer type: JPEG only (RAW is skipped).",
    ],
  },
  {
    id: "nikon",
    label: "Nikon",
    steps: [
      "Setup / Network menu → Connect to FTP server → New profile.",
      "Address: the Host or IP below, port 21. Login with your Username + Password. Encryption OFF, mode PASV.",
      "Auto upload: ON. Send JPEGs only — RAW files are counted as skipped.",
    ],
  },
  {
    id: "sony",
    label: "Sony",
    steps: [
      "Network → Transfer/Remote → FTP Transfer Func. → Server Setting → New.",
      "Host: the Host or IP below, port 21. Login with your Username + Password. Encryption OFF, mode PASV.",
      "Auto FTP Transfer: ON. Shoot JPEG (or JPEG+RAW with JPEG transfer) — RAW-only is skipped.",
    ],
  },
  {
    id: "laptop",
    label: "No camera? Test",
    steps: [
      "FileZilla → Quickconnect with the Host (or IP), Username and Password below (port 21, plain FTP).",
      "Or one command: curl -T photo.jpg ftp://USERNAME:PASSWORD@HOST/ (replace caps with your values).",
      "Drop up to 100 photos — they flow through the same pipeline as the dashboard uploader.",
    ],
  },
];

function formatBytes(n: number): string {
  if (!n || n <= 0) return "0 B";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function liveTone(lastSeenAt: string | null): { dot: string; label: string } {
  if (!lastSeenAt) return { dot: "bg-muted-foreground/40", label: "Waiting for camera" };
  const age = Date.now() - new Date(lastSeenAt).getTime();
  if (age < 60 * 1000) return { dot: "bg-emerald-500", label: "LIVE" };
  if (age < 5 * 60 * 1000) return { dot: "bg-amber-500", label: "Recently seen" };
  return { dot: "bg-muted-foreground/40", label: "Offline" };
}

const CameraUploadCard = ({ eventID, ownerId }: Props) => {
  const [status, setStatus] = useState<FtpStatus | null>(null);
  const [fresh, setFresh] = useState<FreshCred[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");
  const [brand, setBrand] = useState<string>("canon");
  const [copiedKey, setCopiedKey] = useState<string>("");

  const load = useCallback(async () => {
    if (!eventID || !ownerId) return;
    try {
      const res = await fetch(`${API_URL}/events/${eventID}/ftp/status?created_id=${encodeURIComponent(ownerId)}`);
      if (!res.ok) return;
      setStatus((await res.json()) as FtpStatus);
    } catch {
      // Offline dashboard — card stays in its intro state.
    }
  }, [eventID, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Gentle LIVE polling while the card is visible and enabled.
  useEffect(() => {
    if (!status?.enabled) return;
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [status?.enabled, load]);

  const copy = async (key: string, value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1500);
    } catch {
      setMsg("Copy failed — long-press to copy manually.");
    }
  };

  const enable = async (): Promise<void> => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_URL}/events/${eventID}/ftp/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId, shooters: 1 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(data && typeof data.message === "string" ? data.message : "Could not enable camera upload.");
        return;
      }
      setFresh((data?.logins || []) as FreshCred[]);
      await load();
      setMsg("Camera upload enabled — enter these 3 fields in your camera, then take a test shot.");
    } catch {
      setMsg("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const addShooter = async (): Promise<void> => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_URL}/events/${eventID}/ftp/logins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(data && typeof data.message === "string" ? data.message : "Could not add a shooter login.");
        return;
      }
      setFresh([{ tag: data.tag, username: data.username, password: data.password }]);
      await load();
    } catch {
      setMsg("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const rotate = async (username: string): Promise<void> => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_URL}/events/${eventID}/ftp/logins/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId, username }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg("Could not rotate this login.");
        return;
      }
      setFresh([{ tag: username, username, password: data.password }]);
      setMsg(`New password issued for ${username} — update the camera before shooting.`);
    } catch {
      setMsg("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (username: string): Promise<void> => {
    if (!window.confirm(`Revoke camera login ${username}? Its camera stops uploading immediately.`)) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_URL}/events/${eventID}/ftp/logins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_id: ownerId, username }),
      });
      if (!res.ok) {
        setMsg("Could not revoke this login.");
        return;
      }
      await load();
      setMsg(`Revoked ${username}.`);
    } catch {
      setMsg("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const brandSteps = BRAND_STEPS.find((b) => b.id === brand) || BRAND_STEPS[0];

  return (
    <Card id="fy-camera-upload-card">
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Camera-to-cloud upload</h2>
          <Badge variant={status?.enabled ? "brand" : "secondary"}>
            {status?.enabled ? "Enabled" : "Off"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your camera sends every shot here over Wi-Fi while you shoot — the guest gallery
          fills up during the event. No card readers, no laptop, no midnight upload.
        </p>

        {status && !status.host && (
          <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
            Server setup pending — the studio FTP host is not configured yet. Logins below are
            reserved; ask support to finish the one-time server setup before the shoot.
          </p>
        )}

        {!status?.enabled ? (
          <div className="space-y-3">
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Enable below — you get a Host, Username and Password.</li>
              <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Type the 3 fields into your camera&apos;s FTP settings (pick your brand tab after enabling).</li>
              <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Turn on auto-transfer, JPEG-only. Use your phone hotspot — venue Wi-Fi often blocks cameras.</li>
              <li className="flex gap-2"><span className="font-bold text-primary">4.</span> Take a test shot — the LIVE dot below lights up within ~10 seconds.</li>
            </ol>
            <Button type="button" onClick={() => void enable()} disabled={busy} className="min-h-[44px]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4 mr-1.5" />}
              Enable camera upload
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {fresh.length > 0 && (
              <div role="alert" className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-bold text-foreground">New login — shown once. Copy it into the camera now:</p>
                {fresh.map((c) => (
                  <div key={c.username} className="grid gap-1.5 text-xs font-mono">
                    {(["username", "password"] as const).map((field) => (
                      <div key={field} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-muted-foreground">{field}</span>
                        <code className="flex-1 truncate rounded bg-background px-2 py-1.5 border border-border">{c[field]}</code>
                        <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => void copy(`${c.username}-${field}`, c[field])}>
                          {copiedKey === `${c.username}-${field}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-1.5 font-sans">
                      <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => void copy("setup-" + c.username, `${status.host || ""}\n${c.username}\n${c.password}`)}>
                        {copiedKey === "setup-" + c.username ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        Copy all 3 fields
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => void copy("curl-" + c.username, `curl -T photo.jpg ftp://${c.username}:${c.password}@${status.host || ""}/`)}>
                        {copiedKey === "curl-" + c.username ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        Copy test command
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Host</span>
                <code className="rounded bg-muted px-2 py-1 font-mono">{status.host || "pending setup"}</code>
                {status.host && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => void copy("host", status.host || "")}>
                    {copiedKey === "host" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
                {(() => {
                  const m = status.host?.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                  const ip = m ? m[1] : null;
                  if (!ip || ip === status.host) return null;
                  return (
                    <>
                      <span className="text-muted-foreground ml-2">or IP</span>
                      <code className="rounded bg-muted px-2 py-1 font-mono">{ip}</code>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void copy("ip", ip)}>
                        {copiedKey === "ip" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </>
                  );
                })()}
              </div>
              {(status.logins || []).map((l) => {
                const tone = liveTone(l.lastSeenAt);
                return (
                  <div key={l.username} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} title={tone.label} />
                    <code className="font-mono font-semibold">{l.username}</code>
                    <Badge variant="secondary">{tone.label}</Badge>
                    <span className="text-muted-foreground">{formatBytes(l.bytesIn)} in</span>
                    <span className="flex-1" />
                    <Button type="button" variant="ghost" size="sm" disabled={busy} title="Issue a new password" onClick={() => void rotate(l.username)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={busy} title="Revoke this login" onClick={() => void revoke(l.username)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {(status.logins || []).length < 5 && (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void addShooter()} className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-1" /> Add shooter (2nd/3rd camera)
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground">Camera setup — pick your brand:</p>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Camera brand">
                {BRAND_STEPS.map((b) => (
                  <Button
                    key={b.id}
                    type="button"
                    role="tab"
                    aria-selected={brand === b.id}
                    variant={brand === b.id ? "default" : "outline"}
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => setBrand(b.id)}
                  >
                    {b.id === "laptop" ? <Laptop className="h-4 w-4 mr-1" /> : null}
                    {b.label}
                  </Button>
                ))}
              </div>
              <ol className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                {brandSteps.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {msg && (
          <p role="status" className="text-xs font-medium text-foreground rounded-lg bg-muted p-2.5">{msg}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CameraUploadCard;
