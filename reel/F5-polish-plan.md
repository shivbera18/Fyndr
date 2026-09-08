# F5 plan — competitive polish (templates, ratios, cover, drafts, text, joins, anims, filters)

Parent: `reel_improvement_plan.md` §3–§4 (P2) + F4 carryovers (per-cut, per-photo anims).
Consumes F1–F4. Two code slices: F5a (templates, ratios+720p, cover, drafts, text/end-card,
4-step split), F5b (per-cut joins, per-photo anims, gated filters). Zero new deps.

## F5a — presentation + persistence

- **Templates** (`presets.ts` `REEL_TEMPLATES`): `Wedding Romance` (fade 0.8, zoom-in,
  warm, 9:16), `Party Energy` (slide, 1.5s/photo, vivid, 9:16), `Chill Highlights`
  (pan-left, lofi suggestion, 4:5). One-tap cards set style/speed/ratio/filter only —
  never auto-switch music (catalog may be empty); each card names a suggested mood.
- **Ratios** (`9:16` default, `1:1`, `4:5`): `ReelRenderOptions` gains optional
  `width`/`height` (default 1080×1920); `coverDraw`/`animTransform` already take w/h.
  Preview canvas keeps `object-contain`. **720p toggle** (auto-suggest when
  `deviceMemory ≤ 4`): 720-wide ladder preserving ratio.
- **Cover**: "Use as cover" on preview scrubs `coverIndex`; `<video poster>` set from
  a one-frame `canvas.toDataURL` at selection time. Export stream unchanged.
- **Drafts**: `localStorage fyndr:reel:draft:<eventId>` `{ v:1, selected, musicId,
  trim, volume, fadeOn, durations, transition, animation, photoDur, transDur, ratio,
  filter, template }` (never blobs — custom upload not restorable, noted in UI).
  "Resume draft?" chip on open when present; cleared on successful export.
- **Text** (canvas, in `paintAt` post-pass via `opts.title`/`opts.endCard`):
  title card = event name, 3 styles (lower-third / centered / minimal), first 1.5s;
  CC-BY end-card = `"Music: <credit>"`, last 1.2s, rendered ONLY when the active
  track license is CC-BY (the attribution that survives upload — parent §2.1 Rev 1).
  Per-photo captions CUT (tray already crowded; revisit on metric).
- **4-step split**: `Photos → Music (picker + trim/volume) → Style (template,
  transition, animation, filters, text, ratio, speeds) → Preview & Export`. Moves
  existing blocks; no logic change. Sticky bottom bar keeps `Back | ≈Ns | Next`.

## F5b — per-cut joins, per-photo anims, gated filters

- **Per-cut joins**: Style-step join row (one pill per join, cycles transition type,
  absent = global). Renderer `ReelRenderOptions` gains `joins?: ReelTransition[]`
  (aligned like holds; `alignHolds`-style prefix guard reused via generic align).
  `transAt` prefers `joins[j]`.
- **Per-photo anims**: tray rows gain an anim cycle button
  (`Global → none → zoom-in → zoom-out → pan-left → pan-right`), `anims` map keyed by
  name (pruned like durations). Renderer opts gains `anims?: (ReelAnimation|undefined)[]`.
- **Gated filters** (global only): `None / Warm / Vivid / Soft / B&W / Vintage` mapped
  to `ctx.filter` strings; applied ONLY when `'filter' in ctx` (else skipped silently);
  720p toggle is the low-end mitigation (no auto-perf-switching — unneeded complexity).

## Tests

Templates apply (state snapshot); ratio math (canvas dims per ratio); draft
round-trip (save/resume/clear, custom excluded); end-card renders only for CC-BY;
joins/anims alignment; filters skipped when unsupported (mock ctx without filter);
4-step navigation order.

## Acceptance

`tsc` clean; suites green; manual: template one-tap → styled reel; 1:1 export is
square; draft resumes after close; CC-BY export carries readable end-card; join pill
changes one transition; 720p halves export time on low-end.

## Non-goals

Per-photo captions/filters, voiceover/beat-sync (dropped P3), search/chips (gated on
>20 tracks), dnd-kit (metric-gated), ffmpeg.wasm, new deps.
