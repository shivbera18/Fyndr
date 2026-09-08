# F5 plan — competitive polish (templates, ratios, cover, drafts, text, joins, anims, filters)

Parent: `reel_improvement_plan.md` §3–§4 (P2) + F4 carryovers (per-cut, per-photo anims).
Consumes F1–F4. Two code slices: F5a (templates, filters, ratios+720p, cover, drafts,
text/end-card, 4-step split), F5b (joins, per-photo anims). Zero new deps.

## F5a — presentation + persistence

- **Templates** (`presets.ts` `REEL_TEMPLATES`): `Wedding Romance` (fade 0.8, zoom-in,
  warm, 9:16), `Party Energy` (slide, 1.5s/photo, vivid, 9:16), `Chill Highlights`
  (pan-left, lofi suggestion, 4:5). One tap applies style/speed/ratio/filter; if the
  suggested mood exists in catalog AND current music is `none`, the first match is
  selected too (explicit tap = consent, documented on the card).
- **Filters** (`REEL_FILTERS` in presets + gating, HERE not F5b): `None / Warm / Vivid /
  Soft / B&W / Vintage` as `ctx.filter` strings, global only. Applied only when
  `'filter' in ctx`; **reset to `'none'` before the text post-pass** (never tint text).
- **Ratios** (`9:16` default, `1:1`, `4:5`): `ReelRenderOptions` gains optional
  `width`/`height` (default 1080×1920). **Bitrate scales with area**
  (`8Mbps × pixels/2073600`, floored 2Mbps). **720p toggle** (auto-suggest when
  `deviceMemory ≤ 4`): 720-wide ladder preserving ratio.
- **Cover** (poster-only — the file is unchanged, stated in UI): export-step stepper
  `Cover: i/n`; on change, pause preview, paint that slide's mid-hold to canvas,
  `toDataURL` → `<video poster>`. Never captures mid-transition blends.
- **Drafts**: `localStorage fyndr:reel:draft:<eventId>` (try/catch all access)
  `{ v:1, selected, musicId, trim, volume, fadeOn, durations, anims, joins,
  transition, animation, photoDur, transDur, ratio, filter, template }`
  (never blobs). Resume: filter `selected` against current photos AND
  `isPhotoEligible`, abort if <2 remain; `musicId:"custom"` restores as `"none"`
  + "re-upload your audio" note. "Resume draft? / Discard" chip; cleared on export.
- **Text** (canvas post-pass via `opts.title`/`opts.endCard` + `opts.totalDuration`
  passed into `paintAt` — no per-frame recompute): title = event name, 3 styles,
  first `min(1.5, total - (endCard ? 1.2 : 0))s` (never collides with end-card on
  2s reels); CC-BY end-card = `"Music: <credit>"` last 1.2s, ONLY when active track
  is CC-BY. All text: width-scaled font, word-wrap, 8% safe margins, contrast scrim.
  `await document.fonts?.ready` before recorder start when text enabled.
  Per-photo captions CUT (tray crowded; metric-gated).
- **4-step split**: `Photos → Music (picker + trim/volume) → Style (template,
  transition, animation, filters, text, ratio, speeds) → Preview & Export`. Moves
  existing blocks; sticky bar keeps `Back | ≈Ns | Next`.

## F5b — joins + per-photo anims

- **Joins** keyed by LEFT photo name (`Record<string, ReelTransition>`, pruned like
  durations — never positional, no drift on reorder/deselect). Style-step scroll row
  of pills labeled `i→i+1` + short name (`2→3: Slide`), absent = global. Renderer
  `joins?: Record<string, ReelTransition>` resolved against slide names at call time.
- **Per-photo anims**: tray rows go two-line (line 1: thumb+badge+name+arrows; line 2:
  duration pill + anim pill cycling `Global → none → zoom-in → zoom-out → pan-left →
  pan-right`). `anims` map keyed by name, pruned. Renderer `anims?: (ReelAnimation
  | undefined)[]` aligned like holds.

## Tests

Templates apply; filter skip when unsupported + text unfiltered; ratio dims +
bitrate scaling; draft round-trip (stale/eligibility/custom/quota/Discard);
end-card only for CC-BY + no-collide on 2s reel; joins survive reorder; anims align;
4-step order.

## Acceptance

`tsc` clean; suites green; manual: template one-tap; 1:1 square export; draft
resumes; CC-BY end-card readable; join pill changes one transition; 720p faster.

## Non-goals

Per-photo captions/filters, voiceover/beat-sync (dropped P3), search/chips (gated on
>20 tracks), dnd-kit (metric-gated), ffmpeg.wasm, new deps.
