# G7 plan — trim control a11y

Correction to the feature-list scope: plan §2.3's "keyboard ←/→ on focused
handles" ALREADY exists — the two half-width native range inputs are
arrow-key operable with `clampTrim` parity to pointer drag. G7 closes the
three remaining gaps around them; no new interaction model.

## Gaps (audited in `waveform.tsx`)

1. The ranges are ~24px tall (`accent-primary` only) — below the repo's
   ≥44px rule for their hit area.
2. The time readout is a plain `<p>` — trim commits (slider, drag end,
   Chorus, Reset) are never announced.
3. The canvas is exposed to assistive tech as an anonymous graphic although
   it carries no information beyond the readout + sliders.

## Changes (`waveform.tsx` only)

- Both range inputs gain `min-h-[44px]` (keep half-width `flex` row). Honest
  scope: this enlarges the input's box and click-to-reposition area to 44px;
  the native thumb itself stays ~15px (zero custom slider CSS by choice —
  native arrows/focus ring/behavior win over a skinned thumb). No step change.
- Canvas becomes `aria-hidden="true"`: it is decorative for SR users — the
  window is fully communicated by the readout + labeled sliders, and an
  `img` stop would only duplicate announcements. Canvas stays non-focusable
  (sliders are the single keyboard path, no redundant tab stops).
- Announcements fire on COMMITS only, via a separate sr-only
  `aria-live="polite"` node (the visual readout stays a plain `<p>`):
  slider change, drag end (`onPointerUp`/`onPointerCancel` → announce current
  props), Chorus/Reset clicks. Per-move drag commits update visuals silently —
  announcing 60–120Hz intermediate timestamps would flood VoiceOver/TalkBack
  queues (the G4 live-node exclusion applied to the same hazard).

## Tests (`__tests__/waveform.test.tsx`)

- Sliders expose labels (`Trim start`/`Trim end`), `min`/`max`/`step`/`value`,
  and commit clamped values through change events (existing clamp tests stay).
- Live node exists (`aria-live="polite"`), silent after a mid-drag move,
  announcing the window after drag end, slider change, Chorus, and Reset.
- Canvas is `aria-hidden` (no img role, no label).
- No Tailwind class asserts (jsdom has no layout; target size is a Playwright
  concern, not a unit one).

## Non-goals

Focusable canvas handles (redundant tab stops), custom key handlers (native
range behavior wins), step-size changes, slider styling beyond hit area,
peaks for uploads (unchanged placeholder).
