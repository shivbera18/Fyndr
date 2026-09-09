# G4 plan — sticky summary action bar

Plan §4 wants `Back | ≈12.5s · 6 photos | Next/Export` always visible; today
navigation is three scattered per-step `Next:` buttons plus tab triggers, no
Back, no summary, no safe-area handling. One sticky bar replaces all three
per-step buttons.

## Bar

- Rendered after `</Tabs>` inside the modal content (works in Vaul Drawer and
  Radix Dialog alike):
  `sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4
  pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur`.
  (`-mx-4` spans the Drawer's `px-4`; dialog has no page-x padding to break —
  verify visually, no negative-margin overflow on desktop.)
- Layout: `Back` (outline, `min-h-[44px]`) | center summary | primary
  Next/Export (`min-h-[44px]`). `role="navigation"` + `aria-label="Reel steps"`.
- Summary: `≈{total.toFixed(1)}s · {selected.length} photos`, `aria-live="polite"
  aria-atomic="true"`, `total` is the existing `timeline.total` memo (already
  accounts holds/joins). Shows `Select at least 2 photos` when under minimum
  instead of a duration.
- Step order const `["photos","music","style","export"]`; Back disabled on
  `photos`; Next disabled while `selected.length < REEL_MIN_PHOTOS` (same rule
  as the tab triggers). Next labels: `Next: Music` / `Next: Style` /
  `Next: Preview & Export`.
- On `export`: right slot becomes the Export action — same `handleExport`,
  same disabled logic (`!exportSupported || images.length < REEL_MIN_PHOTOS`),
  same loading label (`Exporting…`, disabled while `isExporting`). The
  in-content Export button stays (it sits with Play/Mute/Download result
  actions); no behavior change there.

## Cutover

- Delete the three per-step `Next:` buttons (photos/music/style tails). Tab
  triggers stay as the overview/jump path. No other navigation changes.
- Existing gating test retargets from `Next: Music` to the bar's Next button
  (same name, same gating behavior — behavior preserved, locator moved).

## Tests (`__tests__/ReelCreatorModal.test.tsx`)

- Bar renders `≈Xs · 3 photos` summary; Back disabled on photos step.
- Back/Next walk steps both directions (assert tab panel content changes).
- Next disabled under minimum, enabled at minimum (retargeted gating test).
- Bar Export on the export step calls `renderReelToFile` (mock assert).
- Summary updates when duration changes (click a duration pill → text changes).

## Non-goals

Swipe-between-steps, visual step-progress indicator, removing tab triggers,
keyboard shortcuts, changing Drawer/Dialog padding globally in
`responsive-modal.tsx` (bar compensates locally with `-mx-4`/safe-area).
