# G4 plan — sticky summary action bar (Rev 1)

Plan §4 wants `Back | ≈12.5s · 6 photos | Next/Export` always visible; today
navigation is three scattered per-step `Next:` buttons plus tab triggers, no
Back, no summary, no safe-area handling. One footer bar replaces all three
per-step buttons.

## Placement (outside the scroll container)

- `DrawerContent` (`ui/drawer.tsx`, single caller: `ResponsiveModal`) gains
  optional `footer?: React.ReactNode`, rendered after the scroll div inside
  the flex-col sheet — always visible, full width, never mid-screen float,
  no `pb-6` gap beneath it. Zero impact on other callers (none).
- `ResponsiveModal` gains optional `footer` prop: mobile forwards it to
  `DrawerContent`; desktop renders it after children inside `DialogContent`
  with `-mx-6 -mb-6` edge compensation (Dialog padding is `p-6`; code
  verifies against `ui/dialog.tsx`).
- Footer shell (both shells): `border-t border-border bg-background px-4 pt-2
  pb-[max(1rem,env(safe-area-inset-bottom,0px))]` — opaque (no backdrop-blur
  over the live canvas), safe-area with `0px` fallback so the declaration
  stays valid where `env()` is unsupported. No underscores needed (no spaces
  in the arbitrary value); no global padding changes to shared shells.

## Bar content (fits 360px)

- `role="navigation" aria-label="Reel steps"`: `← Back` (outline,
  `min-h-[44px]`, `aria-label={`Back to ${prev}`}`, disabled on `photos`) |
  center summary (`flex-1 truncate text-center`) | primary (`min-h-[44px]`,
  `aria-label={`Continue to ${next}`}` with short visible text `Next →`;
  on `export` the slot is the Export action with visible text `Export` and
  `aria-label="Export Reel"` — the accessible name existing tests query).
- Step order const `["photos","music","style","export"]`; Next disabled while
  `selected.length < REEL_MIN_PHOTOS` (same rule as tab triggers).
- Visual summary `≈{total.toFixed(1)}s · {selected.length} photos` (`total` =
  existing `timeline.total` memo); under minimum it reads `Select at least 2
  photos`. Screen-reader announcements come from a SEPARATE sr-only
  `aria-live="polite"` node updated only on step/selected-count change
  (effect deps `[step, selected.length]`: `Step 2 of 4: Music · 6 photos`) —
  slider drags never flood the speech buffer.
- On `export`: right slot wires the existing `handleExport` with identical
  disabled logic and `Exporting…` loading state. The in-content Export button
  is REMOVED (bar owns the CTA — dual primaries collide in RTL queries and
  UX); Play/Mute/result actions stay in place.

## Cutover

- Delete the three per-step `Next:` buttons. Tab triggers stay as the
  overview/jump path. Cover `← Prev`/`Next →` untouched (no accessible-name
  collision: bar uses `Continue to …`/`Back to …` labels).
- One test retargets: the gating test moves from `Next: Music` to
  `Continue to Music`. All `/Export Reel/` tests keep passing (bar button
  carries that accessible name).

## Tests (`__tests__/ReelCreatorModal.test.tsx`)

- Bar renders `≈Xs · 3 photos`; Back disabled on photos step.
- Back/Continue walk steps both directions with correct aria-labels.
- Gating: `Continue to Music` disabled under minimum, enabled at minimum.
- Bar Export calls `renderReelToFile` (existing export tests cover this via
  the shared accessible name — no changes needed).
- Summary text updates when a duration pill changes; live node announces
  step/count changes only.

## Non-goals

Swipe-between-steps, visual step-progress indicator, removing tab triggers,
keyboard shortcuts, footer support in any modal but the reel creator.
