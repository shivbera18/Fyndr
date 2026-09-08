# Reel execution — feature list

Parent plan: `reel_improvement_plan.md` (merged #88). One plan PR + one code PR per
feature, each through the independent-review loop before merge. P3 dropped (see plan §10.4).

| # | Feature | Scope | Plan PR | Code PR | Status |
|---|---|---|---|---|---|
| F1 | Track catalog foundation | `public/reel-music/manifest.json`, `reel/tracks.ts` (no LICENSES file — license lives in manifest) | #92 | #93 | done |
| F2 | Music picker UI | `reel/musicPicker.tsx` (search, moods, inline preview, upload) | — | — | todo |
| F3 | Trim + mix engine | `reel/waveform.tsx`, `reel/audioEngine.ts`, preview-with-music + export mux fix | — | — | todo |
| F4 | Timeline control | `reel/timeline.tsx`, per-photo duration/anim, per-cut transitions | — | — | todo |
| F5 | Competitive polish | templates, gated filters, text, ratios, cover, drafts | — | — | todo |

Rules: client-side only, no new npm dep without metric, every PR gets an independent
reviewer (`gh pr review --comment`, never self-approve), merge with regular merge commits.
