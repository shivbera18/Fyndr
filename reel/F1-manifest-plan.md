# F1 plan — track catalog foundation

Parent: `reel_improvement_plan.md` §2.1. Ships the data layer songs depend on. No UI,
no renderer changes. Follow-up F2 (picker UI) and F3 (trim/mix) consume this.

## Files

- `front-end/public/reel-music/manifest.json` — NEW, `{ version: 1, tracks: [...] }`,
  seeded with `tracks: []` (maintainer supplies licensed mp3s + entries per parent §10.1).
- `front-end/public/reel-music/LICENSES.md` — NEW, per-track license + credit lines.
- `front-end/src/component/collect_images/reel/tracks.ts` — NEW (~120 lines).

## `tracks.ts` API

```ts
interface ManifestTrack { id, title, artist, mood[], src, duration, bpm?, license: "CC0"|"CC-BY", credit, peaks? }
loadTrackManifest(): Promise<ManifestTrack[]>  // fetch + validate + localStorage cache (key includes version); network/parse failure → []
getNoneTrack(): ReelTrack                      // the existing { id:"none", label:"No music", src:null } entry
resolveCatalog(manifest): ReelTrack[]          // [none, ...valid manifest tracks]; invalid entries dropped + console.warn, never throw
smartStart(peaks, windowSec=15): number         // loudest-window start; empty peaks → 10% fallback (pure, unit-tested)
```

## Contracts (do not break)

- `REEL_TRACKS[0]` stays `{ id:"none", src:null }` — pinned by `reelPresets.test.ts`
  ("ships a music-off track first"). `presets.ts` untouched in F1; `resolveCatalog`
  reproduces the none-first shape for F2.
- Empty catalog is a handled state (picker shows upload-only), not an error.
- CC-BY entries REQUIRE non-empty `credit`; validator drops CC-BY tracks without one.
- Track `src` must be same-origin path (starts with `/`); absolute URLs dropped
  (CORS breaks `MediaElementSource` export mux — parent §9).

## Validation rules

Required: `id` (unique, slug), `title`, `src` (same-origin), `duration` (>0),
`license` in {CC0, CC-BY}. Optional: `artist`, `mood[]`, `bpm` (>0), `credit`,
`peaks` (all 0..1). `trimStart` math clamps against `duration` (F3 reuses).

## Tests (extend `reel/__tests__/`)

`tracks.test.ts`: validator accepts good / drops bad (dup id, absolute URL, CC-BY
without credit, bad peaks); `resolveCatalog` none-first; `smartStart` loudest window
+ empty fallback; `loadTrackManifest` falls back to `[]` on 404 (mock fetch).

## Acceptance

`tsc --noEmit` clean; `npm --prefix front-end test -- --watchAll=false` green;
manifest with 0 tracks → loader resolves `[none]`, no throw, no toast.

## Non-goals

Picker UI (F2), waveform/trim/mix (F3), vendored mp3s (maintainer decision, parent
§10.1), backend changes, new deps (zero — fetch + WebAudio only).
