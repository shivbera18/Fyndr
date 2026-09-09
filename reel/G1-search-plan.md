# G1 plan — picker search + mood chips

F2-deferred scope (plan §2.2): the picker lists every bundled track with no way
to find one. Adds query + mood filtering inside `musicPicker.tsx`. No modal,
track-loader, or renderer changes.

## UI

- Sticky search row under the `Music` heading (`sticky top-0 z-10 bg-background
  -pb-2` so catalog rows never bleed through): native `<input type="search">`,
  `min-h-[44px]`, `text-base` (16px blocks iOS focus-zoom), no autofocus,
  associated `<label>` (sr-only ok). `onKeyDown` intercepts Escape:
  `stopPropagation` + clear query — Escape must never bubble to the Radix/Vaul
  root and dismiss the modal. Native cancel is pointer-only, so keyboard users
  get parity via the Clear control below.
- Mood chips row: `All` + union of `mood[]` across cataloged tracks (order of
  first appearance), horizontal snap-scroll (`overflow-x-auto`,
  `data-vaul-no-drag` so diagonal swipes don't pull-to-dismiss the Drawer),
  every chip `min-h-[44px] min-w-[44px] px-3`, `aria-pressed`. Chips render
  only when ≥1 track carries a mood (empty catalog → no chips).

## Filtering rules

- `useMemo` over `catalog`: query matches `label`/`artist` case-insensitive
  substring (trimmed; empty query = match-all). Chip matches
  `track.mood?.includes(chip)`; `All` = match-all. Both combine with AND.
- `none` row (id `"none"`, contract from `reelPresets.test.ts`) and the upload
  row stay pinned and are never filtered — filtering applies to src-bearing
  tracks only. `"No bundled tracks yet"` upload-only notice keeps its
  `catalog.length <= 1` rule (unfiltered count).
- Selection is modal-owned and untouched: a selected track filtered out of view
  stays selected; returning the filter restores its highlighted row. No prop
  changes on `MusicPicker`.
- Empty result: `"No tracks match — "` + `Clear search` button (`min-h-[44px] px-3`)
  resetting query and chip to `All`. Active inline preview keeps playing; filtering
  never pauses `audioRef` or touches `playingId`.

## State

- `query` + `chip` local `useState` in `MusicPicker`. Ephemeral UI state: not
  draft-persisted, resets on unmount like `playingId`.

## Tests (`__tests__/musicPicker.test.tsx`)

Query narrows rows; chip narrows rows; query+chip AND; empty result shows reset
and reset restores rows; `none`/upload rows survive filtering; out-of-view
selection preserved (`aria-pressed` after filter restore).

## Non-goals

BPM/duration filters, sorting, highlighted match text, server-side search,
persisting query/chip in drafts.
