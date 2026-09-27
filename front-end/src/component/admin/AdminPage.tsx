import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { API_URL } from "../../utils/api";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

const KEY = "fyndr-admin-key";
type Tab = "overview" | "users" | "drive" | "queue";

interface AdminUser { _id: string; name: string; email: string; isVerified: boolean; createdAt: string; driveConnected: boolean; }
interface DriveConn { userId: string; email?: string; folderId?: string; connectedAt?: string; }
interface FailedJob { _id: string; event_id: string; photo_hash?: string; photo_name?: string; lastError?: string; }

export default function AdminPage() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) || "");
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(KEY));
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conns, setConns] = useState<DriveConn[]>([]);
  const [failed, setFailed] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: Tab, k?: string) => {
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
        {(["overview", "users", "drive", "queue"] as Tab[]).map((t) => (
          <Button key={t} variant={tab === t ? "primary" : "secondary"} onClick={() => switchTab(t)} className="min-h-[44px] capitalize">
            {t}
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
            G3 pool: env R2_* (VPS .env, restart API). Drive fallback: any-linked-token (driveStore tokenFor).
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
