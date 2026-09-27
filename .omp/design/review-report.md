# Review Report — Fyndr landing (`feat/cinematic-hero`)

MAX_SCORE = 50. Score: **27/50**. First impression carries (film + serif); hierarchy and interaction trail.

## Heuristics

| # | Lens | Score (/10) | Key finding |
|---|---|---|---|
| 1 | First impression | 8 | Wedding film + editorial serif is a real point of view |
| 2 | Hierarchy | 4 | Eight identical centered headers; no ranked proof order |
| 3 | Color voice | 7 | Emerald = go/live/face-found; neutrals tinted warm; no tech gradient |
| 4 | Type voice | 6 | Serif display committed; mono telemetry overused as decoration |
| 5 | Interaction feel | 2 | Demo + matcher + flow are live; focus states, error paths, zoom untested |

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Layout | `Home.tsx` headers | 8× `text-center max-w-2xl mx-auto` | Editorial indexed headers, one centered moment max | Hierarchy failure; eye never re-orients |
| 2 | MEDIUM | Surface | `Home.tsx` cards | Icon topper on every card | Strip toppers; meaning in copy | Template filler flattens voice |
| 3 | MEDIUM | Writing | `Home.tsx` mono labels | `font-mono` on stats, tags, telemetry, badges | Mono only for live status/numbers; prose labels in sans | Mono everywhere reads terminal, not editorial |
| 4 | MEDIUM | Interaction | `Home.tsx` controls | Focus/zoom untested | `:focus-visible` + 200% zoom pass | Floor, not polish |
| 5 | LOW | Motion | `CameraCloudFlow.tsx` | Fixed timers + idle pulse | Pause idle pulse | Cosmetic |

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| `CinematicHero.tsx` film | Still autoplay | Subject is physical (weddings); muted + hidden + reduced-motion path |
| `Home.tsx` pricing grid | Break into editorial | Comparison tables need stable scan lanes; grid is the right pattern here |
| `Home.tsx` emerald | Recolor to gold | Emerald carries live-state semantics; gold is bridal cliché |

## Verification

- Full-file reads of `Home.tsx`, `CinematicHero.tsx`, `CameraCloudFlow.tsx`, UI primitives, `theme.css`.
- `tsc` clean, `CI=true` build green, 15/15 landing tests.
- No live render (sandbox); visual claims are source-evidenced.

## Verdict

**Needs changes** — deslop via relayout (headers + ranked grids) then refine (toppers, mono discipline, focus).
