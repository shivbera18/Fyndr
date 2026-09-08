# F4 plan — timeline control (reorder + per-photo pacing, inline)

Parent: `reel_improvement_plan.md` §3 (P1). Consumes F1–F3 untouched. No new files,
no drag libs, no per-photo anims, no per-cut transitions (both deferred to F5 —
review verdict: clutter + index-keyed cuts drift on reorder).

## Files (all edits, zero new modules)

- `presets.ts` — EXTEND: `resolveTimeline` pure math.
- `reelRenderer.ts` — EDIT: `paintAt`/`previewReel`/`renderReelToFile` walk an optional
  `holds: number[]` (absent = today's uniform behavior, zero regression).
- `ReelCreatorModal.tsx` — EDIT: `durations` map, `move()`, image URL-cache, inline
  selected tray, totals + export wiring.
- `reel/__tests__/` — EXTEND `reelPresets.test.ts` (math) + modal order/pacing cases.

## State (modal)

```ts
durations: Record<string, number>  // per-photo hold; ABSENT = Auto = follows photoDur slider live
```

- `photoDur` slider stays the live default; pill cycles `Auto → 1 → 2 → 3 → 4 → Auto`
  (all inside `PHOTO_DUR_MIN..MAX`, no clamp surprises). Absent key is the reset path.
- `move(name, -1|+1)` swaps in `selected`, clamps ends. Prune `durations` on deselect.
- Photo names are unique within an event (matched-photo list) — maps keyed by name hold.

## `presets.ts`

```ts
interface Timeline { holds: number[]; total: number }
resolveTimeline(photoDur: number, transDur: number, transition: ReelTransition,
  perDur: (number | undefined)[]): Timeline
```

- `holds[i] = clamp(perDur[i] ?? photoDur, PHOTO_DUR_MIN, PHOTO_DUR_MAX)`.
- Joins use the global `transition`; join `j` duration =
  `transition === "none" ? 0 : clampTransitionDuration(transDur, min(holds[j], holds[j+1]))`.
- `total = sum(holds) + sum(joins)`; empty → `{ holds: [], total: 0 }`.

## Renderer deltas (exact)

- `ReelRenderOptions` gains optional `holds?: number[]`. When absent, current uniform
  arithmetic runs untouched.
- `paintAt` walk: cumulative holds + joins; count = `min(holds.length, images.length)`
  (async-load skew guard); `timeSec >= total` pins the final slide (float-accumulation
  guard); `N <= 1` never indexes a join.
- Modal builds `holds` aligned to **loaded `images` order** and passes it to
  `previewReel` + `renderReelToFile`; total display switches to `timeline.total`.

## No-refetch reorder (exact)

- `loadReelImages` results cached in a `Map<url, HTMLImageElement>` ref; the load
  effect fetches only URLs missing from the cache; `images` derives from `selected`
  order via the cache (reorder re-sorts in place, zero flicker, zero refetch).

## Inline selected tray (Photos step, under the grid)

- Full-width rows (no horizontal trap): 40px thumb + `truncate` name + duration pill
  (`Auto`/`1s`… tap cycles, 44px, `aria-pressed` when overridden) + ←/→ arrows
  (44px, `aria-label` "Move <name> left/right", disabled at ends, keyed by name so
  focus survives the swap) + polite `aria-live` region announcing
  `"<name>, position i of n"`.

## Tests

`resolveTimeline` (uniform, mixed, `none` joins, empty); tray arrows reorder +
end-disable + live announcement; pill cycles back to Auto; reorder keeps loaded
images without refetch (mock `loadReelImages` call counts); export receives `holds`
aligned to images.

## Acceptance

`tsc` clean; suites green; manual: reorder 6 photos keyboard-only → order, preview,
and export follow; pill values reflected in `≈ Ns`; slider still moves Auto photos.

## Non-goals

dnd-kit drag (metric-gated), per-photo anims + per-cut transitions (F5),
filters/text/ratios/cover/drafts/templates (F5), reducer refactor (maps suffice).
