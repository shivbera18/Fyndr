# G5 plan — offline music

`public/sw.js` is registered app-wide (`index.js`) with image/static/navigate
routes, but audio requests fall through unhandled: offline (or flaky wedding-
venue network) the picker degrades to upload-only even with bundled tracks.
Adds an audio route; no loader/modal changes (same-origin fetch keeps hitting
the SW transparently).

## SW changes (`public/sw.js` only)

- New `CACHE_AUDIO = 'fyndr-audio-v1'`, added to the activate allowlist
  alongside static/images (old audio caches purge on future bumps the same way).
- Precache `/reel-music/manifest.json` in `CACHE_AUDIO` at install (tiny,
  versioned by the existing install flow — no `CACHE_STATIC` bump, no shell
  re-download for all users).
- Runtime route, evaluated before the static-asset branch:
  - `url.pathname === "/reel-music/manifest.json"` → stale-while-revalidate
    into `CACHE_AUDIO` (fresh catalog online, stale catalog offline — the
    picker never sees a network error for it).
  - `request.destination === "audio"` OR `url.pathname.startsWith("/reel-music/")`
    with an audio extension (`.mp3/.m4a/.ogg/.wav`) → cache-first into
    `CACHE_AUDIO`, LRU-capped at 20 entries via the existing `trimCache`
    (preview cuts are ~200KB; cap bounds wedding-day storage).
- Hard bypass (no intercept, no `cache.put`): any request with a `Range`
  header (audio scrubbing serves `206` partials — caching those poisons
  full-track playback), non-GET, non-http(s). API/mutation paths keep their
  existing network-only rule above.
- R2 future-proofing: same rule covers approved R2 hosts (status-200,
  CORS-enabled full responses only; opaque/Ranged responses are never stored).

## Non-changes (explicit)

- `tracks.ts`, `musicPicker.tsx`, modal: untouched — offline falls out of the
  SW layer. Upload/custom-audio path is unaffected (object URLs never hit the SW).
- No background-sync, no offline export queue, no precache of mp3 binaries
  (manifest is bytes; mp3s cache on first play — keeps install light).

## Verification

- `node --check public/sw.js` (syntax gate, CI-safe).
- New committed harness `front-end/scripts/sw-route-check.mjs` (~50 lines,
  zero deps): stubs `self`/`caches`/`fetch`, loads `sw.js`, fires synthetic
  FetchEvents and asserts — manifest SWR (stale served + revalidate put),
  mp3 cache-first hit/miss-put, Range bypass, `/api/` untouched, image/static
  routes unchanged. Run: `node scripts/sw-route-check.mjs` (assert-based,
  non-zero exit on failure). iOS Safari <16.4 has no SW — graceful absence,
  same as today.

## Non-goals

SW registration changes, precaching mp3s at install, offline photo uploads,
Workbox, versioned audio URLs.
