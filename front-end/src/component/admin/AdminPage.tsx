import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_URL } from "../../utils/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

const KEY = "fyndr-admin-key";
type Tab = "overview" | "users" | "drive" | "g3" | "queue";

interface AdminUser { _id: string; name: string; email: string; isVerified: boolean; createdAt: string; driveConnected: boolean; }
interface DriveConn { userId: string; email?: string; folderId?: string; connectedAt?: string; }
interface FailedJob { _id: string; event_id: string; photo_hash?: string; photo_name?: string; lastError?: string; }
interface G3Account {
  id: string; email: string; status: string; weight: number;
  storageLimit: number; storageUsage: number; g3Usage?: number; createdAt?: string;
}

export default function AdminPage() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) || "");
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(KEY));
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conns, setConns] = useState<DriveConn[]>([]);
  const [failed, setFailed] = useState<FailedJob[]>([]);
  const [g3, setG3] = useState<{ accounts: G3Account[]; balancing: string | null; unconfigured: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: Tab, k?: string) => {
    if (t === "g3") {
      await loadG3();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/${t === "queue" ? "queue" : t === "drive" ? "drive" : t === "users" ? "users" : "overview"}`, {
        headers: { "x-admin-key": k ?? sessionStorage.getItem(KEY) ?? "" },
      });
      if (res.status === 401 || res.status === 503) {
        sessionStorage.removeItem(KEY);
        setAuthed(false);
        toast.error(res.status === 503 ? "Admin disabled" : "Wrong password");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (t === "overview") setOverview(j);
      else if (t === "users") setUsers(j.users ?? []);
      else if (t === "drive") setConns(j.connections ?? []);
      else setFailed(j.failed ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem(KEY, key);
    setAuthed(true);
    void load("overview", key);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    void load(t);
  };

  const authHeaders = () => ({
    "x-admin-key": sessionStorage.getItem(KEY) ?? "",
    "Content-Type": "application/json",
  });

  const disconnect = async (userId: string) => {
    if (!window.confirm(`Disconnect Drive for ${userId}?`)) return;
    try {
      const r = await fetch(`${API_URL}/admin/drive/disconnect`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Disconnected");
      await load("drive");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed");
    }
  };

  const retry = async (eventId?: string) => {
    try {
      const r = await fetch(`${API_URL}/admin/queue/retry`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(eventId ? { event_id: eventId } : {}),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const n = await r.json();
      toast.success(`Requeued ${n.modified ?? 0}`);
      await load("queue");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    }
  };

  const [g3Error, setG3Error] = useState<string | null>(null);

  const loadG3 = async () => {
    setLoading(true);
    setG3Error(null);
    try {
      const r = await fetch(`${API_URL}/admin/g3/pool`, { headers: { "x-admin-key": sessionStorage.getItem(KEY) ?? "" } });
      if (r.status === 503) {
        setG3({ accounts: [], balancing: null, unconfigured: true });
        return;
      }
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const msg = body && typeof body === "object" && "error" in body ? String(body.error) : `HTTP ${r.status}`;
        setG3Error(`G3 reachable but errored (${msg}) — check the G3 process, not env.`);
        return;
      }
      const j = await r.json();
      const list = Array.isArray(j.accounts) ? j.accounts : j.accounts?.accounts ?? [];
      setG3({ accounts: list, balancing: j.balancing?.strategy ?? null, unconfigured: false });
    } catch (e) {
      setG3Error(e instanceof Error ? e.message : "G3 pool load failed");
    } finally {
      setLoading(false);
    }
  };

  // OAuth must run in the operator browser (session + state cookies live
  // there): log them into G3 first, then open G3's own connect endpoint so
  // Google redirects back to a host their browser reaches.
  const g3Connect = async () => {
    try {
      const login = await fetch(`${API_URL}/admin/g3/login-passthrough`, {
        method: "POST",
        headers: { "x-admin-key": sessionStorage.getItem(KEY) ?? "" },
      });
      if (login.status === 503) {
        toast.error("G3 not configured on the API (G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)");
        return;
      }
      if (!login.ok) throw new Error(`G3 login HTTP ${login.status}`);
      const info = await fetch(`${API_URL}/admin/g3/panel-info`, { headers: { "x-admin-key": sessionStorage.getItem(KEY) ?? "" } });
      const j = await info.json().catch(() => null);
      const base = j && typeof j === "object" && "url" in j ? String(j.url) : null;
      if (!base) throw new Error("no G3 panel URL");
      window.open(`${base.replace(/\/$/, "")}/api/accounts/connect`, "_blank", "noopener");
      toast.success("Log in via the G3 tab if asked, approve Google, then Refresh pool");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect failed");
    }
  };

  const g3OpenPanel = async () => {
    try {
      const r = await fetch(`${API_URL}/admin/g3/panel-info`, { headers: { "x-admin-key": sessionStorage.getItem(KEY) ?? "" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.url) window.open(j.url, "_blank", "noopener");
      else throw new Error("no G3 panel URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Panel link failed");
    }
  };

  const g3Weight = async (id: string, weight: number) => {
    const clamped = Math.max(0, Math.min(1000, weight));
    try {
      const r = await fetch(`${API_URL}/admin/g3/accounts/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ weight: clamped }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Weight updated");
      await loadG3();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Weight update failed");
    }
  };

  const g3Unlink = async (id: string, email: string) => {
    if (!window.confirm(`Unlink G3 account ${email}? New uploads skip it.`)) return;
    try {
      const r = await fetch(`${API_URL}/admin/g3/accounts/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Unlinked");
      await loadG3();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unlink failed");
    }
  };

  const g3Strategy = async (strategy: string) => {
    try {
      const r = await fetch(`${API_URL}/admin/g3/balancing`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ strategy }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success(`Balancing: ${strategy}`);
      await loadG3();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Balancing update failed");
    }
  };
  useEffect(() => {
    if (authed) void load("overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <Card className="p-6">
          <h1 className="mb-4 text-lg font-semibold">Admin</h1>
          <form onSubmit={login} className="flex flex-col gap-3">
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin password" autoComplete="off" />
            <Button type="submit" className="min-h-[44px]">Unlock</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex gap-2">
        {(["overview", "users", "drive", "g3", "queue"] as Tab[]).map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "secondary"} onClick={() => switchTab(t)} className="min-h-[44px]">
            {t === "g3" ? "G3 pool" : t}
          </Button>
        ))}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {tab === "overview" && overview && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Object.entries(overview).map(([k, v]) => (
            <Card key={k} className="p-4">
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="text-2xl font-bold">{v}</div>
            </Card>
          ))}
          <Card className="col-span-full p-4 text-xs text-muted-foreground">
            G3 pool: G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD (node-server-1/.env, restart API). Drive fallback: any-linked-token (driveStore tokenFor).
          </Card>
        </div>
      )}
      {tab === "users" && (
        <Card className="divide-y p-0">
          {users.map((u) => (
            <div key={u._id} className="flex items-center gap-2 p-3 text-sm">
              <span className="font-medium">{u.email}</span>
              <span className="text-muted-foreground">{u.name}</span>
              {u.driveConnected ? <Badge>Drive</Badge> : null}
              {u.isVerified ? null : <Badge variant="secondary">unverified</Badge>}
            </div>
          ))}
        </Card>
      )}
      {tab === "drive" && (
        <Card className="divide-y p-0">
          {conns.map((c) => (
            <div key={c.userId} className="flex items-center gap-2 p-3 text-sm">
              <span className="font-medium">{c.email ?? c.userId}</span>
              <span className="text-muted-foreground">{c.folderId ?? ""}</span>
              <Button size="sm" variant="destructive" className="ml-auto min-h-[44px]" onClick={() => void disconnect(c.userId)}>
                Disconnect
              </Button>
            </div>
          ))}
        </Card>
      )}
      {tab === "g3" && (
        <div className="flex flex-col gap-3">
          <Card className="p-4 text-xs text-muted-foreground">
            G3 pool = the Drive accounts the G3 server spreads bytes across. Add Google accounts here (each adds ~15 GB);
            weights + balancing control the spread. Photographer Drive links (drive tab) are the separate per-event backup.
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-[44px]" onClick={() => void g3Connect()}>Add Google account</Button>
            <Button variant="secondary" className="min-h-[44px]" onClick={() => void loadG3()}>Refresh pool</Button>
            <Button variant="secondary" className="min-h-[44px]" onClick={() => void g3OpenPanel()}>Open full G3 panel</Button>
          </div>
          {g3Error && (
            <Card className="p-4 text-sm text-destructive">
              {g3Error}
            </Card>
          )}
          {!g3 || g3.unconfigured ? (
            <Card className="p-4 text-sm">
              G3 not configured on the API (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD in node-server-1/.env, restart API).
            </Card>
          ) : (
            <>
              <Card className="flex flex-wrap items-center gap-2 p-4 text-sm">
                <span className="text-muted-foreground">Balancing: {g3.balancing ?? "round_robin"}</span>
                {(["round_robin", "least_used", "fill_first", "hash"] as const).map((s) => (
                  <Button key={s} size="sm" variant={g3.balancing === s ? "primary" : "secondary"} className="min-h-[44px]" onClick={() => void g3Strategy(s)}>
                    {s}
                  </Button>
                ))}
              </Card>
              <Card className="divide-y p-0">
                {g3.accounts.length === 0 && <div className="p-4 text-sm text-muted-foreground">No accounts linked yet — click Add Google account.</div>}
                {g3.accounts.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                    <span className="font-medium">{a.email}</span>
                    <Badge variant={a.status === "connected" ? "default" : "secondary"}>{a.status}</Badge>
                    <span className="text-muted-foreground">
                      G3 {(a.g3Usage ?? 0) / 1024 / 1024 < 1024
                        ? `${((a.g3Usage ?? 0) / 1024 / 1024).toFixed(1)} MB`
                        : `${((a.g3Usage ?? 0) / 1024 / 1024 / 1024).toFixed(2)} GB`}
                      {" / "}Drive {a.storageLimit ? `${(a.storageUsage / 1024 / 1024 / 1024).toFixed(2)} / ${(a.storageLimit / 1024 / 1024 / 1024).toFixed(1)} GB` : "quota unknown"}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="secondary" className="min-h-[44px]" onClick={() => void g3Weight(a.id, a.weight - 1)}>−</Button>
                      <span className="w-8 text-center font-mono" title="Balancer weight (0 = skip)">{a.weight}</span>
                      <Button size="sm" variant="secondary" className="min-h-[44px]" onClick={() => void g3Weight(a.id, a.weight + 1)}>+</Button>
                      <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => void g3Unlink(a.id, a.email)}>
                        Unlink
                      </Button>
                    </span>
                  </div>
                ))}
              </Card>
            </>
          )}
          <Card className="p-4 text-xs text-muted-foreground">
            Full panel (buckets, keys, file manager) opens directly on the G3 origin — reach it via SSH tunnel
            (`ssh -L 8787:127.0.0.1:8787 fyndr`, then the Open button URL works from your laptop).
          </Card>
        </div>
      )}
      {tab === "queue" && (
        <div className="flex flex-col gap-2">
          <Button className="min-h-[44px] self-start" onClick={() => void retry()}>Retry all failed</Button>
          <Card className="divide-y p-0">
            {failed.map((j) => (
              <div key={j._id} className="flex items-center gap-2 p-3 text-sm">
                <span className="font-mono text-xs">{j.photo_hash ?? j.photo_name ?? j._id}</span>
                <span className="text-muted-foreground">{j.lastError ?? ""}</span>
                <Button size="sm" variant="secondary" className="ml-auto min-h-[44px]" onClick={() => void retry(j.event_id)}>
                  Retry event
                </Button>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
