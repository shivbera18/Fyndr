# F2 plan — music picker UI + modal integration

Parent: `reel_improvement_plan.md` §2.2 + §4 (Music screen). Consumes F1 (`tracks.ts`,
`CatalogTrack`, `resolveCatalog`). No renderer, trim, or step-restructure changes.

## Files

- `front-end/src/component/collect_images/reel/musicPicker.tsx` — NEW (~90 lines: list + inline preview + upload row; search/chips deferred, see Non-goals).
- `ReelCreatorModal.tsx` — EDIT: replace `REEL_TRACKS` grid with picker; load catalog
  on open; guard `musicId` against missing ids; keep custom-upload path working.
- `front-end/src/component/collect_images/reel/__tests__/musicPicker.test.tsx` — NEW.

## `musicPicker.tsx` API

```ts
interface PickerAudio { url: string; name: string }  // user-uploaded track
interface MusicPickerProps {
  catalog: CatalogTrack[];            // resolveCatalog output ([none, ...tracks])
  musicId: string; onSelect(id: string): void;
  customAudio: PickerAudio | null; onUpload(file: File): void;  // modal owns validation + object-URL lifecycle
  loading: boolean;
}
```
(No `loadError` — F1 loader resolves `[]` for empty-or-failed alike; both render upload-only.)

- Rows use `track.label` (not `title` — `CatalogTrack` carries `label`): play button
  (44px, `aria-label` Play/Pause `<label>`) + `min-w-0 flex-1 truncate` text block
  (label/artist/duration + credit line) + selected ring (`aria-pressed`).
  Inline preview: ONE shared `HTMLAudioElement` in a ref — tapping ▶ pauses the
  previous track first; `ended`/`error` events reset playing state; every `play()`
  has a `.catch` (rapid taps, OS interrupts); pause on unmount. Preview never
  touches canvas (F3 syncs).
- `none` entry renders as "No music" row, shown active when `musicId === "none"`.
- Upload row lives in the picker UI but validation + object-URL lifecycle stay in the
  modal's existing `handleAudioUpload` (15MB rule, `customUrlRef` revocation) — the
  picker only forwards the `File`. Selected upload shows `Your audio: <name>`.
- Empty catalog (only `none`) → "No music" row + upload row + one-line hint.
  Loading → single "Loading music…" line (no skeletons).

## Modal integration (exact deltas)

- On open: `loadTrackManifest().then(setManifest)` (loading flag; caller owns it per F1).
  `catalog = useMemo(() => resolveCatalog(manifest), [manifest])`.
- `musicUrl` lookup: `custom` → `customAudio.url`, else catalog `src` by id, else `null`.
- Default `musicId`: `"upbeat"` → `"none"` unless catalog contains the id
  (effect: `setMusicId(c => c === "custom" || catalog.some(t => t.id === c) ? c : "none")`
  on catalog load — must preserve the `custom` upload selection).
- Delete the `REEL_TRACKS` grid block; `handleAudioUpload` stays in the modal untouched.
- `REEL_TRACKS` import stays iff still referenced elsewhere in the file, else drop.

## Tests

Render with 3-track catalog: rows appear with `label`; ▶ plays (mock `Audio`,
assert single instance + `pause` on switch + state reset on `ended`); `onSelect`
fires with id; empty catalog shows upload-only + active "No music"; upload row
forwards the `File` (oversize rejection stays covered by existing modal behavior).

## Acceptance

`tsc --noEmit` clean; reel suites green; manual: pick track → row highlights;
▶ streams audio; switching rows never overlaps; upload >15MB rejected with toast.

## Non-goals

Trim/waveform/volume/fades (F3), 4-step split (F5), search + mood chips (deferred
until catalog exceeds ~20 tracks — with empty/12-track catalogs eye-scan wins; when
added they must be sticky, 44px, `aria-pressed`, 16px input text), picker
virtualization (<50 tracks — plain list), new deps (zero — `<audio>` + Tailwind + lucide only).
