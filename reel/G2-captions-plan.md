# G2 plan — per-photo captions

F5-cut scope: competitors caption individual slides; we only have a global
title card + CC-BY end card. Adds one optional caption per photo, rendered as a
lower-third during that photo's hold only (never during transitions, never on
the cover poster). No caption styling/position options.

## Data

- Modal state `captions: Record<string, string>` keyed by photo name — same
  pattern as `durations`/`anims`/`joins`, so reorder needs no index repair.
- Empty string = off: the setter deletes the key, keeping drafts small.
- Stale keys for removed photos are pruned reactively: `setCaptions` joins the
  existing `pruneKeys` effect on `[selected]` alongside durations/anims/joins
  (the save effect persists raw state — pruning lives there, not at save).
- Input `maxLength={80}`, single line.

## Tray UI

- One caption `<input>` per photo card under the duration/FX row:
  `aria-label={`Caption for ${name}`}`, `min-h-[44px]`, `text-base` (no iOS
  zoom), `placeholder="Add a caption…"`, `maxLength={80}`.
- Controlled from `captions[name] ?? ""`; `onChange` sets or deletes the key.

## Renderer (`reelRenderer.ts`)

- `ReelRenderOptions` gains `captions?: string[]` — positional, aligned to
  `images` order (same contract as `anims`/`joinTransitions`); modal maps
  `selected.map((n) => captions[n] ?? "")`.
- `paintAt` guards `opts.captions.length === n` (falls back to all-empty,
  mirroring `useAnims`). The hold branch passes `caps[k]`; the transition
  branch passes `""` — captions live inside holds only, so cuts never snap or
  blank mid-crossfade (empty string is a real value, `??` fallback would be
  wrong here).
- `paintTextOverlay` gains a `caption: string` param, rendered LAST and only
  when no title card (`timeSec >= titleEnd`) and no end card are active — the
  global cards own the first 1.5s and last 1.2s, captions never double-draw.
- Rendering reuses `drawTextCard(ctx, [caption], w, h, "lower")` — no new
  canvas code paths, inherits font/backdrop handling. `drawTextCard` wraps on
  whitespace (an 80-char caption becomes 3–4 lines, fits the 9:16 lower third);
  before the call, the caption path chunks unbroken tokens longer than 20
  chars (hashtags/URLs) so nothing spills past the backdrop. Title/end-card
  paths are untouched.
- Cover frame excluded by omission: `renderCoverFrame` keeps its current
  title/endCard-only call — zero changes to `renderCoverFrame` itself.

## Wiring

- `captionList` memo (`selected.map(...)`) passed as `captions` to
  `previewReel` and `renderReelToFile` only, added to their dep arrays. The
  cover effect is deliberately untouched (no caption dep → no poster
  re-render on keystroke).
- Drafts: `ReelDraft` gains `captions: Record<string, string>`; `isValidDraft`
  treats it as optional (default `{}` — old drafts resume clean); save object
  and dep array include it; resume calls `setCaptions`.

## Tests (`__tests__/ReelCreatorModal.test.tsx`)

Caption input renders per photo; typing flows into export opts
(`objectContaining({ captions: [...] })`, positional); empty caption yields
`""` (off, no crash); draft resume restores caption text; old draft without
the field resumes with empty captions.

## Non-goals

Per-caption style/size/position, multi-line captions, caption search, captions
on the cover poster, captions during transitions, per-token styling.
