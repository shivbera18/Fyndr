# G3 plan — export hardening

Plan §6 requires aborting the realtime export when the tab hides (rAF stalls
in background tabs → frozen-frame reels); plus the muted-fallback success
toast overclaims today. Two changes, both client-side, no new UI.

## Abort on tab-hide

- Renderer: `ReelRenderOptions` gains `shouldAbort?: () => boolean`, checked
  once per paint-loop frame in `renderReelToFile`. On true: stop the recorder
  via the existing cleanup path, then throw the new exported
  `ReelExportAbortedError extends Error` — before `Blob` creation, so no
  partial file ever surfaces. `previewReel`'s loop is user-stoppable already
- Modal: `abortRef = useRef<"hidden" | "closed" | null>(null)`, reset at export
  start. A `visibilitychange` listener (registered while `isExporting`,
  removed after) sets `"hidden"` when `document.hidden`. Modal close
  mid-export sets `"closed"` (same frozen-canvas hazard, one line in the
  existing open-change path). `shouldAbort: () => abortRef.current !== null`
  is passed to `renderReelToFile` only — cover/preview effects never abort.
- Catch in `handleExport`: `e instanceof ReelExportAbortedError` → toast
  `"Export stopped — keep this tab visible."` for `"hidden"`, `"Export
  cancelled."` for `"closed"`, no `setError` (neither is a failure state);
  progress resets via the existing `setProgress(0)` on next export; `finally`
  re-enables the button as today. Draft is NOT deleted on abort (only on
  success, as today) so the user retries with one tap.

## Honest muted toast

- Today a silent fallback still toasts `"Reel exported."` when `musicUrl` is
  set. When `"muted" in blob && blob.muted === true`: keep `setMutedNotice`
  (existing inline notice stays) and toast
  `"Reel exported without music — the track couldn't load."` instead of the
  success line. No renderer changes (expando flag already exists).

## Tests (`__tests__/ReelCreatorModal.test.tsx`, mocked renderer)

- Abort: `renderReelToFile` mock rejects once with `ReelExportAbortedError`;
  export click → stopped toast, no download link, no error panel, button
  re-enabled, draft preserved (localStorage untouched).
- Tab-hide wiring: with export pending (deferred mock), dispatch
  `document.visibilitychange` with `hidden=true` → mock's captured
  `shouldAbort()` returns true. (`document.hidden` overridden via
  `Object.defineProperty` in the test, restored after.)
- Muted: mock resolves a blob with `muted=true` → muted toast text +
  existing inline notice; success toast not shown.

## Non-goals

Export cancel button, retry/resume of partial exports, background/offscreen
export (impossible with realtime capture), aborting preview or cover.
