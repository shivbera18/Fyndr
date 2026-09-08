# F3 plan — trim + audible mix (trimmed music in preview + export)

Parent: `reel_improvement_plan.md` §2.3. Consumes F1 (`CatalogTrack.duration/peaks`) plus
F2 picker. Fixes silent preview (`musicUrl: null`) and full-track-from-0s export.
No timeline/filter/text work. No new modules, no client-side audio decoding.

## Files

- `front-end/src/component/collect_images/reel/waveform.tsx` — NEW (~80 lines:
  display canvas + trim controls; peaks display-only, never computed here).
- `presets.ts` — EXTEND with pure helpers `clampTrim`, `smartStart`, `formatTrimTime`.
- `ReelCreatorModal.tsx` — EDIT: trim/volume state, preview element, export passes mix spec.
- `reelRenderer.ts` — EDIT: fragment-loop + gain/fades in the export mux only (~25 lines).
- `reel/__tests__/` — EXTEND `reelPresets.test.ts` (pure helpers) + NEW `waveform.test.tsx`.

## Audio design (review-driven: no engine module, no decode, no JS loop clamp)

- **Segment looping via Media Fragments** (`src = url + "#t=start,end"` + `loop=true`):
  the browser loops the segment gaplessly. No `timeupdate` clamp (250ms throttle +
  seek dropouts). If the reel is shorter than the trim, it simply ends early.
- **Preview uses plain element semantics** — `el.volume`, no `AudioContext`
  (`createMediaElementSource` is once-per-element; the export owns the single graph).
- **Export keeps its graph**, extended: `GainNode(volume)` + fade-in ramp from take
  start + fade-out ramp anchored at **reel end** (`ctx.currentTime + reelDuration -
  fadeOut`, not trim-relative — AudioParam runs on context time).
- **No manual seek before metadata**: fragment URL sets the start; renderer awaits
  `loadedmetadata`/`play()` success and preserves the existing `mutedFallback` path
  (play errors propagate — never swallowed).
- **No `decodeAudioData`**: peaks come ONLY from manifest `peaks` (F1-optional);
  uploads show flat placeholder bars. Duration via `loadedmetadata` (no PCM, no
  200MB tab-kill). Peaks cache keyed by **src URL**, never track id.

## `waveform.tsx` API

```tsx
interface WaveformProps { peaks?: number[]; duration: number; start: number; end: number; onChange(s: number, e: number): void; onChorus(): void; onReset(): void }
```

- Canvas bars from `peaks` (flat line when absent) with selected-region highlight.
- Touch path: drag on the canvas strip (pointer events, active-handle tracking, 24px
  slop) — NOT stacked 44px range thumbs (touch-trapping + iOS pseudo-element bugs).
- Keyboard path: two half-width native ranges (start/end, no overlap, ←/→ free).
- Explicit "♪ Chorus" (only when `peaks` present) + "Reset" buttons (44px) —
  no double-click reset. Time labels `0:12–0:27`; `clampTrim` (≥3s) in `onChange`.

## Modal + renderer deltas (exact)

- State: `trim: {start,end} | null` (null = full track — the default; NEVER auto-trim
  on pick, Chorus is tap-only), `volume` (0.8), `fade` (0.8s on/off).
- Trim/volume UI hidden when `musicId === "none"`; lives in the Music step under the
  F2 picker (44px targets throughout).
- Preview effect: alongside `previewReel`, run a preview `<audio>` element with the
  fragment URL + `el.volume`; mute toggle + pause stop both. Removes hardcoded `null`.
- Export: `renderReelToFile` gains `mix: { url, start, end, volume, fade } | null`;
  renderer builds `url#t=start,end`, loops, gains, reel-anchored fades.

## Tests

`clampTrim`/`smartStart`/`formatTrimTime` pure tests in `reelPresets.test.ts`;
waveform clamp/labels/buttons (Chorus hidden without peaks); modal test asserts
preview element uses fragment URL + export receives the mix spec.

## Acceptance

`tsc` clean; suites green; manual: pick track → trim via canvas + sliders → preview
plays ONLY the segment (looping if reel outlasts it) → export mp4 has audible trimmed
audio with reel-end fade; CC-BY tracks still export (visual end-card rides with F5).

## Non-goals

CC-BY end-card (F5), per-track volume memory, voiceover lane (dropped P3),
beat-sync auto-cut (dropped P3), Radix Slider (native ranges stand),
client-side peak decoding (dropped — manifest-only peaks), `timeupdate` loop clamp.
