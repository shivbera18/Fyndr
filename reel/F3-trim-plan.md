# F3 plan — trim + mix engine (audible, trimmed music in preview + export)

Parent: `reel_improvement_plan.md` §2.3. Consumes F1 (`CatalogTrack.duration/peaks`,
`APPROVED_AUDIO_ORIGINS`) + F2 picker. Fixes the two biggest audio defects: silent
preview (`musicUrl: null`) and full-track-from-0s export. No timeline/filter/text work.

## Files

- `front-end/src/component/collect_images/reel/audioEngine.ts` — NEW (~120 lines).
- `front-end/src/component/collect_images/reel/waveform.tsx` — NEW (~110 lines).
- `ReelCreatorModal.tsx` — EDIT: trim/volume state, peaks compute, preview-with-music,
  export passes mix spec. `reelRenderer.ts` — EDIT: gain/fade/trim in export mux only.
- `reel/__tests__/audioEngine.test.ts` + `waveform.test.tsx` — NEW.

## `audioEngine.ts` API (shared by preview + export, zero deps)

```ts
interface MixSpec { url: string; trimStart: number; trimEnd: number; volume: number; fadeIn: number; fadeOut: number }
computePeaks(buf: AudioBuffer, n?: number): number[]   // downsample max-abs per bucket, pure
smartStart(peaks: number[], duration: number, windowSec?: number): number  // loudest window start; empty → duration*0.1 (duration param required — F1 review)
clampTrim(start: number, end: number, duration: number): { start: number; end: number }  // end-start ≥ 3s, inside [0, duration]
applyMix(ctx: AudioContext, src: MediaElementAudioSourceNode, spec: MixSpec, dest: AudioNode): void
// gain(volume) + linearRamp fades; export connects dest→MediaStreamDestination, preview dest→ctx.destination
startTrimmed(el: HTMLAudioElement, spec: MixSpec): () => void
// currentTime=trimStart; play().catch(noop); timeupdate clamp loops [start,end) iff reel outlasts trim; returns stop (pause)
```

- No `AudioContext` creation inside the engine (autoplay policy: caller creates/resumes
  inside the tap tick — modal owns it, as today).
- `decodeAudioData` for peaks happens in the modal on track pick (fetch → decode →
  `computePeaks` → ref cache keyed by track id); never blocks picker render.

## `waveform.tsx` API

```tsx
interface WaveformProps { peaks: number[]; duration: number; start: number; end: number; onChange(start: number, end: number): void }
```

- Canvas bars from `peaks` (theme `primary`/`muted` colors, selected region highlighted).
- Two native `<input type="range">` sliders (start/end, 44px thumb via CSS, keyboard
  ←/→ free) + time labels `0:12–0:27`; `clampTrim` enforced in `onChange`.
- Smart-start button ("♪ Chorus") sets `smartStart(...)`; double-click canvas resets.

## Modal + renderer deltas (exact)

- State: `trim: {start,end} | null` (null = full track), `volume` (0.8), `fades` (0.8s).
  On track pick with peaks ready: `trim = {start: smartStart(...), end: min(start+15, duration)}`.
- Preview effect: alongside `previewReel`, run `startTrimmed` through a preview gain
  (mute toggle = gain 0); pause stops both. Removes the hardcoded `musicUrl: null`.
- Export: `renderReelToFile` gains `mix: MixSpec | null`; renderer replaces direct
  `src.connect(dest)` with `applyMix` + `startTrimmed` semantics (loop only within trim).
- Volume slider + fade toggle live in the Music step under the trim strip (F2 picker untouched).

## Tests

`computePeaks`/`smartStart`/`clampTrim` pure unit tests; `startTrimmed` with mocked
`HTMLAudioElement` (seek/play/loop-clamp/stop); waveform clamps + labels; modal test
mocks engine (preview calls `startTrimmed` with selected track url).

## Acceptance

`tsc` clean; suites green; manual: pick track → waveform → trim chorus → preview
plays ONLY the segment → export mp4 has audible trimmed audio with fades; CC-BY
tracks still export (visual end-card rides with F5 text overlay).

## Non-goals

CC-BY end-card (F5), per-track volume memory, voiceover lane (dropped P3),
beat-sync auto-cut (dropped P3), Radix Slider (native ranges stand).
