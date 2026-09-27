# Smell Report — Fyndr landing (`feat/cinematic-hero`)

MAX_SCORE = 10. Score: **4/10 — STRONG**. Clustered template smells: center stack + tile grids + icon toppers repeat across every section.

## Heuristics

| # | Odor | Score (1=absent, 0=detected) | Key finding |
|---|---|---|---|
| 1 | Tech gradient | 1 | No blue-violet gradient; emerald accent is domain-chosen (live-scan affordance) |
| 2 | Generic tech hue | 1 | Emerald reads as "go/live" for events, not generic SaaS purple |
| 3 | Feature tile grid | 0 | Roles, steps, use-cases, testimonials, pricing all uniform icon/title/text grids |
| 4 | Accent rail | 1 | None present |
| 5 | Unearned blur | 0 | Glass tokens exist but inner panels stack blur-on-blur with no depth scale |
| 6 | Stat monument | 0 | Metrics band is four bare numbers with no proof story |
| 7 | Icon topper | 0 | Rounded-square icon above nearly every card heading |
| 8 | Bounce everywhere | 1 | Motion is ease-out only; no elastic abuse |
| 9 | Default type | 1 | Instrument Serif display + Inter body is prompt-specified and committed |
| 10 | Center stack | 0 | Every section header is centered max-w-2xl; no compositional variation |

Score: 5 absent = 5/10... weighted for clustering (tile+topper+stack co-occur in 6 sections) → **4/10 STRONG**.

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Layout | `Home.tsx` section headers (~8 sites) | All centered `text-center max-w-2xl mx-auto` | Editorial left-aligned headers with mono index (`01 — Features`) alternating with one centered moment | Center stack repeated 8× is structural sameness |
| 2 | HIGH | Layout | `Home.tsx` roles/steps/use-cases/testimonials/pricing | Uniform grids of equal cards | Hierarchy: lead card spans 2 cols, varied density, ranked proof order | Tile grid repeated 5× flattens priority |
| 3 | MEDIUM | Surface | `Home.tsx` card headers | `size-11 rounded-xl bg-*/10` icon topper on every card | Remove toppers; carry meaning in title copy + one inline glyph max per section | Icon topper is template filler |
| 4 | MEDIUM | Surface | `Home.tsx:644` metrics band | Four oversized mono numbers | Proof strip: number + one-line case clause, smaller scale | Stat monument proves nothing alone |
| 5 | MEDIUM | Surface | `theme.css` glass tokens | Single blur level everywhere | Two-level depth: `glass-landing` (4px, chrome) vs `glass-landing-soft` (10px, reading surfaces) | Blur without a depth decision is unearned |
| 6 | LOW | Motion | `CameraCloudFlow.tsx` | Fixed 450/850/1250ms drive + always-on pulse dots | Reduced-motion instant path (exists) + pause pulse when idle | Minor; mostly compliant already |

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| `CinematicHero.tsx` | Replace Instrument Serif | Prompt-specified and committed with scale; has project reason (wedding editorial) |
| `Home.tsx` emerald accent | Swap to champagne gold | Emerald carries go/live/face-found semantics; gold reads bridal-cliché |
| `DemoCard.tsx` browser chrome | Remove traffic-light dots | Real product artifact (guest gallery URL bar); belongs here |

## Verification

- Read `Home.tsx` (1291 lines), `CinematicHero.tsx`, `CameraCloudFlow.tsx`, `bento-grid.tsx`, `conic-border-card.tsx`, `theme.css` in full.
- `grep` for `text-center`, `size-11 rounded-xl`, `grid-cols-`, `animate-pulse`, `backdrop-blur` across landing files.
- Did not render screenshots (preview server unreachable from sandbox); findings are source-evidenced.

## Verdict

**Needs changes** — structural repetition (stack + tiles + toppers) is the identity problem; fix via relayout/refine, not recolor.
