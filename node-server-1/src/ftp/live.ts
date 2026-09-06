// In-process live-ingest pub/sub (single VPS — no Redis/WebSocket server).
// The FTP watcher emits here; the SSE endpoint (GET /events/:id/live)
// subscribes here. No persistence: reconnecting clients re-sync via REST.

export type LiveHandler = (type: string, data: unknown) => void;

const subs = new Map<string, Set<LiveHandler>>();

export function subscribeLive(eventId: string, handler: LiveHandler): () => void {
  let set = subs.get(eventId);
  if (!set) {
    set = new Set();
    subs.set(eventId, set);
  }
  set.add(handler);
  return () => {
    set.delete(handler);
    if (set.size === 0) subs.delete(eventId);
  };
}

export function emitLive(eventId: string, type: string, data: unknown): void {
  const set = subs.get(eventId);
  if (!set || set.size === 0) return;
  for (const handler of set) {
    try {
      handler(type, data);
    } catch {
      // A broken subscriber must never break ingest.
    }
  }
}
