# G7 plan — trim control a11y

Correction to the feature-list scope: plan §2.3's "keyboard ←/→ on focused
handles" ALREADY exists — the two half-width native range inputs are
arrow-key operable with `clampTrim` parity to pointer drag. G7 closes the
three remaining gaps around them; no new interaction model.

## Gaps (audited in `waveform.tsx`)

1. The ranges are ~24px tall (`accent-primary` only) — below the repo's
   ≥44px rule; canvas drag has 24px slop but keyboard users get tiny targets.
2. The time readout (`0:12–0:27 of 0:30`) is a plain `<p>` — trim changes via
   drag, sliders, Chorus, or Reset are never announced.
3. The canvas is unlabeled — screen readers meet an anonymous graphic with no
   hint that the sliders below drive it.

## Changes (`waveform.tsx` only)

- Both range inputs gain `min-h-[44px]` (keep half-width `flex` row; native
  thumb stays, hit area meets the rule). No step change (0.5s arrows are
  native behavior — predictable everywhere).
- Readout becomes `aria-live="polite" aria-atomic="true"` — announces the
  full window on every commit path (drag end, slider, Chorus, Reset). Drag
  fires `onChange` per move; announcements throttle naturally through the
  polite queue (no custom debounce — same call the G4 live-node decision made).
- Canvas gains `role="img"` + static `aria-label="Audio waveform. Use the
  Trim start and Trim end sliders below to adjust the selection."` The canvas
  itself stays non-focusable: the labeled sliders are the keyboard path
  (single focus order, no redundant tab stops — the F2 listbox lesson).

## Tests (`__tests__/waveform.test.tsx`)

- Sliders render labeled (`Trim start`/`Trim end`), carry `min-h-[44px]`,
  and commit clamped values via change events (existing clamp tests stay).
- Readout node has `aria-live="polite"` and reflects the current window text.
- Canvas exposes the img role + description label.

## Non-goals

Focusable canvas handles (redundant tab stops), custom key handlers (native
range behavior wins), step-size changes, slider styling beyond hit area,
peaks for uploads (unchanged placeholder).
