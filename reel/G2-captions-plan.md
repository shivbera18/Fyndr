# G2 plan — per-photo captions

F5-cut scope: competitors caption individual slides; we only have a global
title card + CC-BY end card. Adds one optional caption per photo, rendered as a
lower-third during that photo's hold. No caption styling/position options.

## Data

- Modal state `captions: Record<string, string>` keyed by photo name — same
  pattern as `durations`/`anims`/`joins`, so reorder/delete needs no index
  repair (stale keys for removed photos are pruned on save like the others).
- Empty string = off: the setter deletes the key, keeping drafts small.
- Input `maxLength={80}`, single line; no renderer-side wrapping needed.

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
  mirroring `useAnims`), resolves the caption at each `paintTextOverlay` call
  site: hold branch → `caps[k]`; transition branch → `caps[k + 1] ?? caps[k]`
  (incoming slide owns the cut).
- `paintTextOverlay` gains a `caption: string` param; non-empty renders via the
  existing `drawTextCard(ctx, [caption], w, h, "lower")` helper — no new canvas
  code paths, inherits the title card's font/backdrop handling.
- Cover frame excluded: `renderCoverFrame` keeps title/endCard only (poster,
  not a slide).

## Wiring

- `captionList` memo (`selected.map(...)`) passed as `captions` to the cover
  effect, `previewReel`, and `renderReelToFile`; added to their dep arrays.
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
on the cover poster, animating captions in/out.
