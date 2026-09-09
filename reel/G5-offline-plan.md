# G5 plan — offline music (Rev 1)

`front-end/public/sw.js` is registered app-wide (`front-end/src/index.js`)
with image/static/navigate routes, but audio requests fall through unhandled:
offline (or flaky wedding-venue network) the picker degrades to upload-only
even with bundled tracks. Adds an audio route; no loader/modal changes
(same-origin fetch keeps hitting the SW transparently).

## SW changes (`front-end/public/sw.js` only)

- New `CACHE_AUDIO = 'fyndr-audio-v1'`, added to the activate allowlist
  alongside static/images (old audio caches purge on future bumps the same way).
- Precache `/reel-music/manifest.json` in `CACHE_AUDIO` at install (tiny,
  no `CACHE_STATIC` bump, no shell re-download for all users). The audio trim
  below EXEMPTS the manifest key — evicting it would silently revert the
  picker to upload-only offline despite cached tracks.
- Runtime route, evaluated before the static-asset branch:
  - `url.pathname === "/reel-music/manifest.json"` → stale-while-revalidate
    into `CACHE_AUDIO` (fresh catalog online, stale catalog offline).
  - audio (`request.destination === "audio"` OR `/reel-music/` path with
    `.mp3/.m4a/.ogg/.wav`) → cache-first into `CACHE_AUDIO`, LRU-capped at
    the newest 20 mp3s via a manifest-exempt trim (existing `trimCache`
    generalized with a keep-key, or a 10-line local trim — whichever is
    smaller at code time).
- Range requests are INTERCEPTED, not bypassed (Blink/WebKit media elements
  send `Range: bytes=0-` on initial load — bypassing means nothing is ever
  cached or served offline):
  - Parse `bytes=N-M` / `bytes=N-` (suffix form `bytes=-N` and unparseable
    values → network passthrough, never stored).
  - Cache hit (full stored response): serve `206` built from
    `blob.slice(start, end)` with `Content-Range`, `Accept-Ranges: bytes`,
    correct `Content-Length`/`Content-Type`.
  - Cache miss: `fetch(url)` WITHOUT the Range header (full `200`), store a
    clone when status is 200 (never store 206/opaques), then serve the 206
    slice from the fresh bytes.
- Untouched: non-GET, non-http(s), API/mutation network-only paths (existing
  rule stays above). R2 future-proofing falls out: same rule stores only
  status-200 CORS full responses.

## Non-changes (explicit)

- `tracks.ts`, `musicPicker.tsx`, modal: untouched. Upload/custom-audio
  object URLs never hit the SW. First-visit-offline can't be helped (no SW
  controlling yet) — stale-serve covers every visit after install.

## Verification (cwd `front-end/`)

- `node --check public/sw.js` (syntax gate, CI-safe).
- New committed harness `scripts/sw-route-check.mjs` (~70 lines, zero deps):
  stubs `self`/`caches`/`fetch`/`Request`/`Response`, loads `sw.js`, fires
  synthetic FetchEvents and asserts — manifest SWR (stale served +
  revalidate put), mp3 cache-first hit/miss-put, Range `bytes=0-` served as
  206 from cache, Range-miss fetches full/stores/serves sliced, 206 never
  stored, manifest survives trim past 20 mp3s, `/api/` untouched, image/static
  routes unchanged. `node scripts/sw-route-check.mjs` (assert-based, non-zero
  exit on failure). iOS Safari <16.4 has no SW — graceful absence, as today.

## Non-goals

SW registration changes, precaching mp3s at install, offline photo uploads,
offline export queue, Workbox, versioned audio URLs.
