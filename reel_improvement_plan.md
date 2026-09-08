# Fyndr Reel Improvement Plan — client-side, mobile-first, competitive

> Scope: `front-end/src/component/collect_images/reel/*` only. Zero backend/ML work.
> Current code: `ReelCreatorModal.tsx` (3-tab wizard) + `presets.ts` + `reelRenderer.ts`
> (canvas `captureStream(30)` + `MediaRecorder` + WebAudio music mux). No new npm dep in
> P0/P1 unless a metric forces it (repo rule: no new dep without metric).
> Open-source leverage here = **content** (CC0/CC-BY music catalog) + **documented patterns**
> (wavesurfer regions, dnd-kit sensors) re-implemented natively at ~1/10th the weight.

## 0. Current-state audit (what's actually broken)

| # | Fact (worktree) | Why it hurts |
|---|---|---|
| 1 | `presets.ts` `REEL_TRACKS` points at `/reel-music/upbeat.mp3`, `/romantic.mp3`, `/party.mp3`, `/lofi.mp3` — **`front-end/public/` has no `reel-music/` dir at all** (verified: only `demo/`, `images/`, `videos/`, `icons/`). Every bundled pick 404s. | User taps a song, export silently falls back to muted (`mutedFallback=true`, `mutedNotice`). Feels like "music doesn't work". This is the #1 song-selection bug. |
| 2 | Preview is always silent: `ReelCreatorModal.tsx:160` calls `previewReel(..., { musicUrl: null })` with a hardcoded `null`. | User picks music blind, only hears it after a full realtime export. Core UX break. |
| 3 | No search / mood filter / duration / BPM / artist display. 4 opaque labels ("Upbeat Pop"…). No per-track play button in the Style step. | Not competitive with CapCut/Instagram (search + trending + preview-before-apply). |
| 4 | No trim: full track loops from 0s (`audioEl.loop=true`, `currentTime=0`). A 24s reel over a 3-min song always starts at the intro. No volume, no fade, no "start at chorus". | Every reel sounds identical at the head. |
| 5 | Photo order = tap order, no reorder UI, no per-photo duration, one global animation + one global transition. `REEL_MAX_PHOTOS=12`, `photoDur` 1–4s global. | No storytelling control; fixing one boring slide means deselect/reselect dance. |
| 6 | Export is **realtime** (`requestAnimationFrame` paint for `total` seconds while `MediaRecorder` runs). Background tab / screen lock on mobile throttles rAF → short/corrupt file. No visibility guard. | Mobile export flakiness; user blames "the app". |
| 7 | iOS risk unhandled: `canvas.captureStream` + mp4 `MediaRecorder` needs Safari 17+; code throws generic "Try Chrome or Safari 17+" with no pre-check messaging or 720p fallback for low-end GPUs at 1080×1920. | Low-end Android jank / OOM on 12-photo 1080p canvas. |
| 8 | Text/filter/ratio/cover/templates/drafts: all absent. Export filename `fyndr-reel-<eventId>.<ext>`; share via `navigator.share` only when `canShare(files)` — fine, keep. | Parity gap vs InShot/CapCut basics. |

Non-goals for this plan: server-side ffmpeg jobs, licensed commercial catalogs (Spotify/Apple/JioSaavn SDKs — licensing + API keys + per-stream cost, all rejected), native apps, collaborations/comments.

## 1. Design principles (feature-heavy yet clean)

1. **Mobile-first, desktop free.** `ResponsiveModal` already renders `Vaul Drawer` on mobile / `Radix Dialog` on desktop — keep that shell. All new UI is thumb-zone, ≥44px targets, bottom-sticky primary action, `safe-area-inset-bottom`. Desktop gets wider timeline + keyboard shortcuts for free via the same components.
2. **Four steps max, one job per screen:** `Photos → Music → Style → Preview & Export`. (Today Music+Style are crammed in step 2; splitting is the cheapest clarity win.)
3. **Every choice is audible/visible in <1s.** Tap song → 15s preview with waveform plays inline. Move slider → canvas preview updates live. No blind settings.
4. **Theme sync:** existing tokens only — `bg-card/border/muted/primary`, `Geist` display font, `lucide-react` icons, `sonner` toasts, `Radix Tabs` + `Vaul Drawer` (both installed). Sliders stay native `<input type="range">` with a 44px thumb via CSS — `@radix-ui/react-slider` is NOT installed (verified in `package.json`) and is only added if a slider-a11y metric demands it. No new design language.
5. **Clean = progressive disclosure.** Defaults produce a good reel in 3 taps (auto-template, see §5). Power controls (trim, per-photo, fades) sit one tap deeper, never on the first screen.
6. **Accessibility baseline:** `prefers-reduced-motion` already forces `animation:none` — extend to transitions too; keyboard-operable reorder (arrow buttons, not drag-only); `aria-pressed` on picks; `role=progressbar` on export (already present, keep).

## 2. Song selection redesign (the core ask)

### 2.1 Catalog: manifest, not hardcoded array

Replace the 4-entry `REEL_TRACKS` with a versioned JSON manifest + typed loader:

```
// new: front-end/public/reel-music/manifest.json (self-hosted, R2 mirror optional)
{ "version": 1, "tracks": [
  { "id":"wedding-strings",
    "title":"Wedding Strings", "artist":"FreePD", "mood":["romantic","wedding"],
    "src":"/reel-music/wedding-strings.mp3", "duration": 96, "bpm": 84,
    "license":"CC0", "credit":"", "peaks":[0.1,0.4,...] /* precomputed, optional */ },
  ...12-20 tracks across romantic / upbeat / party / lofi / cinematic / devotional
]}
```

- **Sources (all open/free, self-host — never hotlink):** FreePD (CC0, no credit), Incompetech/Kevin MacLeod (CC-BY — `credit` shown + burned into export description, never skipped), Pixabay Music content-license tracks (download + self-host, keep license txt in `public/reel-music/LICENSES.md`). Ship ~2MB total: 12 tracks × ~30–60s preview cuts at 96kbps mono is plenty for reels; full-length files live on R2 and stream.
- **Why self-host:** hotlinking Pixabay/Jamendo breaks CORS for `MediaElementSource` (`crossOrigin="anonymous"` needs `Access-Control-Allow-Origin`); same-origin/R2-with-CORS keeps export mux working.
- **Loader:** `loadTrackManifest()` with `localStorage` cache + version check; failure → graceful fallback to the 4 legacy ids + upload-only mode (never a dead screen).
- **Attribution UI:** one line under the picker (`"Warm Lights — FreePD (CC0)"` / `"Life of Riley — Kevin MacLeod (CC-BY)"`); export toast + download description carry the credit.

### 2.2 Picker UX (mobile-first)

```
┌ Music ────────────────┐
│ 🔍 Search songs/moods │  <- sticky, 44px, autofocus=no (no iOS zoom-jank)
│ [All][Wedding][Party] │  <- mood chips, horizontal snap-scroll
│ ▶ ▓▓▓▓▓░░ Wedding…  ♪ │  <- row: play btn, mini-waveform, title/artist/dur,
│ ▶ ▓▓▓░░░░░ Lo-Fi…   ♪ │     active row highlighted primary/10, aria-pressed
│ ⬆ Upload from device  │  <- keeps existing 15MB path + validation
└───────────────────────┘
┌ Selected: Warm Lights ┐
│ ▓▓▓▓[████]░░░░ 0:12-0:27│ <- trim strip (drag handles, §2.3)
│ Vol [━━●━━]  Fade [×]  │  <- volume + fade in/out toggles
│ ♪ Chorus  ⏵ Preview    │  <- "smart start" (loudest 15s) + preview toggle
└───────────────────────┘
```

- **Inline preview per row:** tapping ▶ streams that track (one shared `HTMLAudioElement`, stops previous — never overlapping). The selected track keeps playing while the user moves to Style.
- **Preview + canvas in sync:** fix the `:160` hardcoded `musicUrl:null` — preview graph plays music through a `GainNode` (volume slider) while `previewReel` paints; pause stops both.
- **Smart start ("♪ Chorus"):** default `trimStart` = loudest 15s window from `peaks` (computed in-browser via `decodeAudioData` on first pick, cached in memory; fallback: 10% in). One-tap, huge perceived intelligence, ~20 lines.
- **Upload path kept:** `audio/*`, 15MB cap, object URL, `decodeAudioData` duration display; trim/volume apply equally.

### 2.3 Trim + volume (native WebAudio, no new dep)

- **Data model per reel:** `{ trackId, trimStart, trimEnd (default = shortest(track, 60s)), volume 0–1 (default 0.8), fadeIn/fadeOut 0–2s (default 0.8s) }`. Clamp `trimEnd-trimStart ≥ 3s`.
- **Trim UI:** single waveform strip with two drag handles (pointer events, 24px hit slop, keyboard ←/→ on focused handle). Double-tap a handle resets to full. Time labels update live.
- **Waveform rendering:** custom `<canvas>` from precomputed `peaks` (or `decodeAudioData` → downsample to ~120 bars on first load, cached in memory). ~80 lines. Verdict vs `wavesurfer.js` + Regions plugin (MIT, docs verified `/katspaugh/wavesurfer.js` — `Regions.create()`, `enableDragSelection`, `region-updated` events): wavesurfer is excellent, but it owns its own player + DOM and fights our canvas-preview sync; custom strip is smaller and theme-exact. **Decision: native strip in P0; adopt wavesurfer only if trim-usability metric fails** (e.g. <40% of music users complete a trim).
- **Mix at export:** `MediaElementSource → GainNode(volume + fade ramps) → MediaStreamDestination`; `fadeIn/fadeOut` via `linearRampToValueAtTime`. Reuse existing `combined = video + dest.audio` mux. Trim = `audioEl.currentTime = trimStart` at export start + `pause()` at `trimEnd` (loop only if reel outlasts trim: `loopSegment` flag).

## 3. Competitive reel features (client-side only)

| Feature | P | Spec (clean version) |
|---|---|---|
| Reorder photos | P1 | Filmstrip under grid: ←/→ arrows per thumb (a11y-safe) + drag on desktop. Verdict vs `@dnd-kit/sortable` (MIT, docs verified `/clauderic/dnd-kit` — `TouchSensor(delay 250, tolerance 5)`, `KeyboardSensor`, `touch-action:none` on handle): dnd-kit is the right answer *if* drag proves wanted. **Start with arrow-reorder (0 deps); add dnd-kit sortable when reorder-usage metric justifies it.** |
| Per-photo duration | P1 | Tap thumb → `0.8 / 1.5 / 2.5s` segmented control + "apply to all". Global slider remains as master. |
| Per-cut transition | P1 | Global default + optional per-join override (`fade/slide/zoom/none`, duration inherits global). Renderer already cross-blends (`paintAt`); extend `opts` with `cuts[]`. |
| Ken Burns per photo | P1 | Keep 5 global animations; add per-photo override in the same thumb sheet ("Same as global" default). Zero renderer rewrite — `animTransform` already parameterized. |
| Filters | P2 | 6 CSS-grade presets via `ctx.filter`: None / Warm / Vivid (`saturate(1.25) contrast(1.05)`) / Soft (`brightness(1.05) saturate(.9)`) / B&W / Vintage (`sepia(.35)`). One global + per-photo override. Live in preview (canvas `filter` is cheap at 1080p? gate to preview-res, full-res at export). |
| Text overlay | P2 | Title card (event name + date, 3 styles: lower-third / centered / minimal) + optional per-photo caption (≤60 chars). Canvas fillText with Geist fallback; safe-area padding 8%. Reduced-motion users still get static text. |
| Aspect ratios | P2 | 9:16 (default, Reels/Shorts) / 1:1 / 4:5. `REEL_W/H` become per-export params; preview canvas letterboxes via `object-contain`. Keep 1080-wide ladder; 720p toggle for low-end (see §6). |
| Cover frame | P2 | Scrubber over loaded images → "Use as cover" (poster for `<video>` + first exported frame hold 0.3s). |
| Templates | P2 | One-tap presets: `Wedding Romance` (slow zoom-in, fade 0.8, warm, romantic track), `Party Energy` (slide, 1.2s/photo, upbeat, vivid), `Chill Highlights` (pan, lofi). Sets all state incl. music; user can diverge after. |
| Draft autosave | P2 | `localStorage fyndr:reel:draft:<eventId>` (selection, music, trim, style — never blobs). "Resume draft?" chip on open. |
| Beat-sync auto-cut | P3 | `BPM tap button` + manifest `bpm` → "Fit to beat": `photoDur = round(trimLen/photos to nearest beat)`. True onset detection (aubio.js/Essentia.js, both open-source) explicitly deferred — weight + WASM for marginal gain; revisit if creators demand it. |
| Voiceover | P3 | Second audio lane (`getUserMedia` → mix at lower gain, duck music 0.35 while active). Needs mic permission UX + iOS testing; parked to P3. |
| ffmpeg.wasm transcode | — | **Rejected.** ~30MB WASM, minutes on mobile CPUs, no need: `MediaRecorder` mp4-first (Safari 17+/Chrome — the only container Instagram Reels accepts: MP4/MOV H.264 + AAC); webm fallback is gallery/WhatsApp-only and must be labeled as such in the UI, never implied Instagram-ready. |

## 4. IA: 4-step flow (replaces current 3 tabs)

`Photos → Music → Style → Preview & Export`, same `Tabs` + `ResponsiveModal` shell, `sm:max-w-3xl`:

1. **Photos** (keep grid, add): order badges stay (= play order), filmstrip reorder row, per-photo sheet (duration/anim/filter/caption), Select-all/Clear kept, counter `n/12`, Next disabled until ≥2.
2. **Music** (new screen, §2.2): search + chips + rows with inline ▶ + upload + trim strip + volume/fade + smart-start.
3. **Style** (decluttered): Template row (3 one-tap cards) → Transition → Animation → Filters → Text → Ratio → speeds (photo/transition sliders + total `≈ Ns` live). Each group collapsible, defaults pre-set.
4. **Preview & Export** (fix + harden): canvas preview **with music** + play/pause + mute toggle + progress + visibility-guard note ("keep this tab visible during export") + result `<video controls playsInline>` + Download + Share + credit line.

Sticky bottom bar on mobile (Drawer): `Back | ≈12.5s · 6 photos | Next/Export` — user always knows cost + next action.

## 5. Architecture (files; smallest diff that holds)

```
reel/
  presets.ts          # + REEL_RATIOS, FILTERS, TEMPLATES, TEXT_STYLES; tracks move OUT
  tracks.ts           # NEW: manifest types + loadTrackManifest() + smartStart(peaks)
  audioEngine.ts      # NEW: shared preview/export audio graph (gain/fade/trim, ~150 lines)
  waveform.tsx        # NEW: peaks canvas + trim handles + time labels
  musicPicker.tsx     # NEW: search/chips/rows/upload/trim-strip composition
  timeline.tsx        # NEW (P1): filmstrip reorder + per-photo sheet trigger
  reelRenderer.ts     # EXTEND: opts { cuts?, anims?, filters?, overlays?, ratio?, trim? }
  ReelCreatorModal.tsx# ORCHESTRATE: useReducer state, 4 steps, preview-with-music
public/reel-music/
  manifest.json + *.mp3 (preview cuts) + LICENSES.md
scripts/reel-music.mjs # OPTIONAL dev script: mp3 → peaks JSON + manifest validate (requires a local ffmpeg binary; NOT zero-dep — Node stdlib cannot decode MP3). Peaks are optional: the client computes them in-browser when missing.
```

- **State:** single `useReducer` (`photos[], order, music{...}, style{...}, perPhoto{}`) — replaces 10+ `useState`s; draft persistence = serialize reducer state.
- **Audio engine (one owner):** preview and export share `buildMixGraph(trackUrl, {trim, volume, fades})`. Preview attaches to `AudioContext.destination`; export attaches to `MediaStreamDestination` (existing mux pattern stays).
- **Renderer deltas:** `paintAt` gains `cutIndex` lookup for per-cut transition/anim/filter + text pass after slide composite. `coverDraw` unchanged. `REEL_FPS=30`, `8Mbps` kept; 720p toggle halves canvas (perf gate).
- **No store/router/backend changes.** Analytics stays inside the existing allowlist: extend the already-allowed `reel_export` payload (`trackId, trimLen, template, ratio, filter`) only — `node-server-1/src/routes/analytics.ts` `ALLOWED_TYPES` is an exact `Set` that 400s unknown types, and backend edits are out of scope. Preview/template funnels are measured via payload flags, not new event types.

## 6. Mobile-first engineering checklist (must-pass before review)

- [ ] ≥44px every tap target (buttons already `min-h-[44px]` — extend to trim handles w/ invisible slop, chips, thumbs' reorder arrows).
- [ ] Drawer: `pb-[env(safe-area-inset-bottom)]`, sticky action bar, content scrolls under it; no horizontal page scroll at 360px.
- [ ] Export guard: `document.visibilitychange` → **abort export** with toast "Export stopped — keep this tab visible" (pausing is unsound: `MediaRecorder` timestamps + live WebAudio desync when rAF stalls; never pause/resume mid-take). The same "keep this tab visible" hint shows before export starts.
- [ ] Pre-export check: `isReelExportSupported()` messaging *before* user configures (step 1 banner on unsupported browsers, not step 4 surprise).
- [ ] Perf: decode images at display size for grid (`loading=lazy` kept) + full-res only at export; `720p` auto-suggest when `deviceMemory≤4` or 1080p frame >40ms (measure first preview second).
- [ ] Motion: `prefers-reduced-motion` → animation **and** transitions → `none`; waveform/progress still update (information, not motion).
- [ ] Offline: service-worker cache `manifest.json` + selected mp3 on pick (workbox range-compatible — test; else document online-required for music).
- [ ] Errors: 404 track → auto-skip + toast + muted export (today's silent path becomes explicit); mic denied (P3) → voiceover lane disabled, music unaffected.

## 7. Open-source inventory (use / reuse-pattern / reject)

| Item | License | Verdict |
|---|---|---|
| FreePD music | CC0 | **USE** — seed romantic/lofi/cinematic beds, no credit needed |
| Incompetech (Kevin MacLeod) | CC-BY | **USE** — party/upbeat depth; credit UI mandatory |
| Pixabay Music downloads | Pixabay Content License (free, self-host) | **USE** — wedding/devotional breadth; keep license txt |
| wavesurfer.js + Regions | MIT | **PATTERN-REUSE, no dep** — drag-trim interaction copied into native `waveform.tsx`; adopt lib only on trim-fail metric |
| dnd-kit sortable + TouchSensor | MIT | **DEFERRED dep** — arrow-reorder first; add iff reorder demand metric hits |
| Radix Slider/Tabs, Vaul Drawer, lucide, sonner | MIT/ISC | **ALREADY INSTALLED — use** (replace raw `<input range>` with Radix Slider for a11y + thumb size) |
| tone.js / aubio.js / essentia.js (beat/onset) | MIT/GPL-ish — check per file | **REJECT P0–P2** — BPM-tap + manifest bpm covers auto-cut; revisit P3 |
| ffmpeg.wasm | MIT | **REJECT** — weight + mobile CPU; MediaRecorder path holds |
| Howler.js | MIT | **REJECT** — single shared `AudioElement` + one `GainNode` covers preview/export; no sprite/3D needs |

## 8. Phased delivery (review gate after each)

- **P0 — Song selection that works (the ask).** `manifest.json` + 12 self-hosted tracks + `tracks.ts` + `musicPicker.tsx` + `waveform.tsx` + `audioEngine.ts` (preview+export share) + fix silent preview + volume/fade/trim + upload parity + credits. *Accept:* airplane-test — pick any track, hear it in preview, trim 12s chorus, export mp4/webm with audible music, credit line shown. Tests: manifest loader + `smartStart` + clamp unit tests; extend `reelPresets.test.ts`.
- **P1 — Timeline control.** `timeline.tsx`, per-photo duration/anim, per-cut transitions, reorder arrows, reducer state. *Accept:* reorder 6 photos keyboard-only, per-photo durations reflected in `≈ Ns` total + export. Tests: reducer + total-duration-with-per-photo math.
- **P2 — Competitive polish.** Templates, filters, text, ratios, cover, drafts, Radix Slider swap, 720p gate. *Accept:* one-tap Wedding template → styled 9:16 reel; draft resumes after close. Tests: template-apply + draft round-trip.
- **P3 — Beat-fit + voiceover (only if P0–P2 land).** BPM-tap auto-cut, voiceover lane with ducking. Separate review.

## 9. Risks & mitigations

- **CORS kills music mux** → same-origin/R2-with-`Access-Control-Allow-Origin:*` only; `decodeAudioData` fetch preflight in loader surfaces breakage at pick-time, not export-time.
- **iOS Safari <17 / in-app browsers (Instagram/WhatsApp webview)** → pre-check banner + "Open in Safari/Chrome" hint; webm fallback kept.
- **Autoplay policy** → all audio starts inside tap handlers (keep existing "play in click tick" pattern in `renderReelToFile`).
- **Repo bloat** → mp3s capped (~2MB P0); full-length audio streams from R2, never git. `node --check`-equivalent (`tsc --noEmit`) before push per repo rules.

## 10. What to review (for the maintainer)

1. P0 tracklist + licenses (swap any mood before we cut mp3s).
2. Native-trim vs wavesurfer call (§2.3) — default is native; say the word to flip.
3. Arrow-reorder-first vs dnd-kit-day-one (§3) — default defers the dep.
4. Whether P3 (beat-fit/voiceover) stays in scope at all.
