# F2 plan — music picker UI + modal integration

Parent: `reel_improvement_plan.md` §2.2 + §4 (Music screen). Consumes F1 (`tracks.ts`,
`CatalogTrack`, `resolveCatalog`). No renderer, trim, or step-restructure changes.

## Files

- `front-end/src/component/collect_images/reel/musicPicker.tsx` — NEW (~200 lines).
- `ReelCreatorModal.tsx` — EDIT: replace `REEL_TRACKS` grid with picker; load catalog
  on open; guard `musicId` against missing ids; keep custom-upload path working.
- `reel/__tests__/musicPicker.test.tsx` — NEW.

## `musicPicker.tsx` API

```ts
interface PickerAudio { url: string; name: string }  // user-uploaded track
interface MusicPickerProps {
  catalog: CatalogTrack[];            // resolveCatalog output ([none, ...tracks])
  musicId: string; onSelect(id: string): void;
  customAudio: PickerAudio | null; onUpload(file: File): void;
  loading: boolean; loadError: boolean;
}
```

- Search input (title/artist, case-insensitive, no autofocus) + mood chips derived
  from catalog (`All` + union of `mood[]`, horizontal snap-scroll).
- Rows: play button (44px) + title/artist/duration + credit line + selected ring.
  Inline preview: ONE shared `HTMLAudioElement` in a ref — tapping ▶ stops the
  previous track first; pause on unmount; `preview` never touches canvas (F3 syncs).
- `none` entry renders as "No music" row (keeps the music-off contract).
- Upload label kept inside picker (`audio/*`, `MAX_UPLOAD_AUDIO_MB` from presets,
  oversize → `toast.error`); selected upload shows `Your audio: <name>`.
- Empty catalog (only `none`) → upload-only body + one-line hint. `loadError` →
  same + "couldn't load the music list" note. Loading → skeleton rows.

## Modal integration (exact deltas)

- On open: `loadTrackManifest().then(setManifest)` (loading flag; caller owns it per F1).
  `catalog = useMemo(resolveCatalog)`.
- `musicUrl` lookup: `custom` → `customAudio.url`, else catalog `src` by id, else `null`.
- Default `musicId`: `"upbeat"` → `"none"` unless catalog contains the id
  (effect: `setMusicId(c => catalog.some(t => t.id === c) ? c : "none")` on catalog load).
- Delete the `REEL_TRACKS` grid block; keep `handleAudioUpload` logic (moved into
  picker's `onUpload` callee — same 15MB rule, same object-URL ref pattern).
- `REEL_TRACKS` import stays iff still referenced elsewhere in the file, else drop.

## Tests

Render with 3-track catalog: rows appear; search filters; chip filters; ▶ plays
(mock `Audio`, assert single instance + `pause` called on switch); `onSelect` fires
with id; empty catalog shows upload-only; oversize file toasts and ignores.

## Acceptance

`tsc --noEmit` clean; reel suites green; manual: pick track → row highlights;
▶ streams audio; switching rows never overlaps; upload >15MB rejected with toast.

## Non-goals

Trim/waveform/volume/fades (F3), 4-step split (F5), picker virtualization (<50
tracks — plain list), new deps (zero — `<audio>` + Tailwind + lucide only).
