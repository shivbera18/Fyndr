# F1 plan — track catalog foundation

Parent: `reel_improvement_plan.md` §2.1. Ships the data layer songs depend on. No UI,
no renderer changes. Follow-up F2 (picker UI) and F3 (trim/mix) consume this.

## Files

- `front-end/public/reel-music/manifest.json` — NEW, `{ version: 1, tracks: [...] }`,
  seeded with `tracks: []` (maintainer supplies licensed mp3s + entries per parent §10.1).
  License + credit live ONLY in manifest entries (no separate LICENSES file — single source of truth).
- `front-end/src/component/collect_images/reel/tracks.ts` — NEW (~70 lines).

## `tracks.ts` API

```ts
interface ManifestTrack { id, title, artist?, mood?, src, duration, license: "CC0"|"CC-BY", credit?, bpm?, peaks? }
type CatalogTrack = ReelTrack & { license: "none"|"CC0"|"CC-BY", artist?, mood?, duration?, bpm?, peaks? }
loadTrackManifest(): Promise<ManifestTrack[]>  // fetch + validate; failure → [] (no cache — HTTP caching covers a static <5KB JSON). [] means empty-or-failed; the caller owns loading state.
getNoneTrack(): ReelTrack                      // the existing { id:"none", label:"No music", src:null } entry
resolveCatalog(manifest): CatalogTrack[]       // [none-as-CatalogTrack, ...valid tracks]; invalid dropped + console.warn in dev, never throw. (smartStart deferred to F3 with a duration param.)
```

## Contracts (do not break)

- `REEL_TRACKS[0]` stays `{ id:"none", src:null }` — pinned by `reelPresets.test.ts`
  ("ships a music-off track first"). `presets.ts` untouched in F1; `resolveCatalog`
  reproduces the none-first shape for F2.
- Empty catalog is a handled state (picker shows upload-only), not an error.
- CC-BY entries REQUIRE non-empty `credit`; validator drops CC-BY tracks without one.
- Track `src`: same-origin path (`/...`) OR `https://` URL on an approved CDN origin
  (R2 mirror per parent §2.1/§9 — bucket must send `Access-Control-Allow-Origin`, expose
  `Content-Length/Range`, and allow `Range`; `<audio crossOrigin="anonymous">`). Anything else dropped.

## Validation rules

Required: `id` (unique), `title`, `src` (allowed origin), `duration` (>0),
`license` in {CC0, CC-BY} (+ non-empty `credit` when CC-BY). Everything else optional
and unvalidated beyond shape. Dev/CI also runs `validateManifest` against the
checked-in `manifest.json` so maintainer edits fail loud instead of vanishing tracks.

## Tests (extend `reel/__tests__/`)

`tracks.test.ts`: validator accepts good / drops bad (dup id, disallowed origin, CC-BY
without credit); checked-in `manifest.json` validates clean; `resolveCatalog` none-first
with metadata preserved; `loadTrackManifest` falls back to `[]` on 404 (mock fetch).

## Acceptance

`tsc --noEmit` clean; `npm --prefix front-end test -- --watchAll=false` green;
manifest with 0 tracks → `resolveCatalog` yields `[none]` (loader itself resolves `[]`), no throw, no toast.

## Non-goals

Picker UI (F2), waveform/trim/mix incl. `smartStart` (F3), vendored mp3s (maintainer decision, parent
§10.1), manifest client caching, backend changes, new deps (zero — fetch only).
