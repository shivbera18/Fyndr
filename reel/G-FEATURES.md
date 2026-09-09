# Reel execution — round 2 (G1–G7)

Parent plan: `reel_improvement_plan.md` (merged #88). Round 1 (F1–F5) shipped the
catalog loader, picker, trim/mix, timeline, and polish — see `reel/FEATURES.md`.
This round implements the seven remaining competitor-standard gaps, all
client-side, zero new npm deps. One plan PR + one code PR per feature, each
through the independent-review loop before merge. P3 stays dropped.

| # | Feature | Scope | Plan PR | Code PR | Status |
|---|---|---|---|---|---|
| G1 | Picker search + mood chips | F2-deferred: sticky search input + mood chips over `CatalogTrack.mood`, filters active preview/upload rows | | | todo |
| G2 | Per-photo captions | F5-cut: caption field per photo in tray sheet, renderer text pass per hold, draft-persisted, empty = off | | | todo |
| G3 | Export hardening | Abort export on tab-hide with toast (§6), failed-track auto-skip + explicit muted-export toast | | | todo |
| G4 | Sticky summary action bar | `Back / ≈12.5s · 6 photos / Next-Export` sticky bar in Drawer + `safe-area-inset-bottom` (§4, §6) | | | todo |
| G5 | Offline music | `public/sw.js` precaches `manifest.json` + bundled mp3s; picker serves stale catalog offline (§6) | | | todo |
| G6 | Seed CC0 catalog | Vendor ~2MB CC0 preview cuts (FreePD) + manifest entries; attribution UI already wired (plan §2.1/§10.1) | | | todo |
| G7 | Trim keyboard support | Plan §2.3: focusable trim handles, ←/→ nudge, keyboard parity with pointer drag in `waveform.tsx` | | | todo |

Rules: client-side only, no new npm dep without metric, every PR gets an independent
reviewer (`gh pr review --comment`, never self-approve), merge with regular merge commits,
Vercel green before merge.
