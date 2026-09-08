# F4 plan — timeline control (reorder, per-photo duration/anim, per-cut transitions)

Parent: `reel_improvement_plan.md` §3 (P1 rows). Consumes F1–F3 untouched. No
filters/text/ratios (F5), no dnd-kit (arrow-reorder first, per parent §3).

## Files

- `front-end/src/component/collect_images/reel/timeline.tsx` — NEW (~110 lines).
- `presets.ts` — EXTEND: `resolveTimeline` pure math + `DUR_CHOICES`, `CutSpec` types.
- `reelRenderer.ts` — EDIT: `paintAt` + `previewReel` + `renderReelToFile` consume a
  resolved timeline (holds + per-cut transitions + per-photo anims).
- `ReelCreatorModal.tsx` — EDIT: order/duration/anim/cut state, timeline UI in Photos
  step, totals + export wiring.
- `reel/__tests__/timeline.test.tsx` — NEW (+ presets math cases).

## State (modal, maps keyed by photo name; absent = global default)

```ts
durations: Record<string, number>   // per-photo hold seconds; default photoDur
anims: Record<string, ReelAnimation> // per-photo override; absent = global animation
cuts: Record<number, ReelTransition> // per-join override keyed by left index; absent = global transition
```

- `selected: string[]` stays the order source. `move(name, -1|+1)` swaps + clamps ends.
- `photoDur` slider becomes the default for newly added photos (existing overrides kept).
- Prune maps on deselect (delete keys) to avoid stale entries.

## `presets.ts` additions

```ts
DUR_CHOICES = [0.8, 1.5, 2.5] as const;
interface CutSpec { transition: ReelTransition; duration: number }
interface Timeline { holds: number[]; cuts: CutSpec[]; total: number }
resolveTimeline(count: number, photoDur: number, transDur: number,
  perDur: (number | undefined)[], perCut: (ReelTransition | undefined)[]): Timeline
```

- `holds[i] = clamp(perDur[i] ?? photoDur, PHOTO_DUR_MIN, PHOTO_DUR_MAX)`.
- Each join `j`: `t = perCut[j] ?? global`, `d = clampTransitionDuration(transDur, min(holds[j], holds[j+1]))`.
- `total = sum(holds) + sum(cut durations)`. Zero photos → total 0.
- Renderer takes `timeline: Timeline` + `anims: (ReelAnimation | undefined)[]` in
  `ReelRenderOptions` (optional; absent = today's global behavior — zero regression).

## Renderer deltas (exact)

- `paintAt`: walk cumulative `holds`/`cuts` instead of uniform arithmetic; per-slide
  animation = `anims[i] ?? opts.animation`; join renderer picks `cuts[j].transition`.
- `previewReel`/`renderReelToFile`: resolve once per call from opts (modal passes
  `timeline` + `anims` arrays aligned to `images` order); `reelTotalDuration` kept for
  legacy callers, modal total display switches to `timeline.total`.

## `timeline.tsx` API

```tsx
interface TimelineProps {
  photos: { name: string; url: string }[];   // selected order
  durations: Record<string, number>; anims: Record<string, ReelAnimation>;
  globalDur: number;
  onMove(name: string, dir: -1 | 1): void;
  onDuration(name: string, sec: number): void;
  onAnim(name: string, anim: ReelAnimation | "global"): void;
}
```

- Horizontal snap-scroll filmstrip: thumb + order badge + ←/→ arrow buttons (44px,
  `aria-label` "Move <name> left/right", disabled at ends) + duration segmented
  (`0.8 / 1.5 / 2.5`, `aria-pressed`) + native `<select>` for anim
  (`Global + 5`, 44px). Keyboard-operable throughout; no drag libs.
- Per-cut transition editing: deferred to a join control in F5 if this slice grows —
  F4 ships per-cut via a compact join selector row ONLY if under ~30 extra lines,
  else cuts stay global in F4 and move to F5 (decision recorded at implementation).

## Tests

`resolveTimeline` math (uniform, mixed holds, clamped joins, empty); timeline arrows
reorder + end-disable; duration select calls; modal export receives `timeline` aligned
to images; existing suites keep passing (global path unchanged).

## Acceptance

`tsc` clean; suites green; manual: reorder 6 photos keyboard-only → play order
follows; per-photo durations reflected in `≈ Ns` + export length; per-photo anim
visible in preview; deselect prunes without errors.

## Non-goals

dnd-kit drag (metric-gated), filters/text/ratios/cover/drafts/templates (F5),
voiceover/beat-sync (dropped P3), reducer refactor (maps suffice).
