# Reel execution — round 2 (G1–G7)

Parent plan: `reel_improvement_plan.md` (merged #88). Round 1 (F1–F5) shipped the
catalog loader, picker, trim/mix, timeline, and polish — see `reel/FEATURES.md`.
This round implements the seven remaining competitor-standard gaps, all
client-side, zero new npm deps. One plan PR + one code PR per feature, each
through the independent-review loop before merge. P3 stays dropped.

| # | Feature | Scope | Plan PR | Code PR | Status |
|---|---|---|---|---|---|
| G1 | Picker search + mood chips | Sticky search + mood chips over `CatalogTrack.mood`; none/upload pinned, Escape guard | #105 | #106 | done |
| G2 | Per-photo captions | Name-keyed tray inputs, holds-only lower-third, draft-persisted, cover excluded | #107 | #108 | done |
| G3 | Export hardening | Abort on tab-hide/close with reason toasts (§6), honest muted toast | #109 | #110/#111 | done |
| G4 | Sticky summary action bar | Footer-slot bar: Back/summary/Continue-Export + safe-area; replaces per-step Next buttons | #112 | #113 | done |
| G5 | Offline music | SW audio route: manifest SWR + mp3 cache-first with 206 slicing; stub harness | #114 | #115 | done |
| G6 | Seed catalog | 7 Commons cuts (6×CC-BY KM + 1×CC0 Chopin, ~3.4MB) + manifest peaks + seed tests | #116 | #117 | done |
| G7 | Trim control a11y | 44px ranges, commit-only live announcements, aria-hidden canvas (ranges already keyboard-ok) | #118 | #119 | done |

Rules: client-side only, no new npm dep without metric, every PR gets an independent
reviewer (`gh pr review --comment`, never self-approve), merge with regular merge commits,
Vercel green before merge.
