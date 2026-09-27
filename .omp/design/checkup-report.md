# Checkup Report — Fyndr landing (`feat/cinematic-hero`)

MAX_SCORE = 60. Score: **35/60**. Watch overall: committed type/glass language, structural repetition + readability risks.

## Heuristics

| # | Vital | Score (/10) | Key finding |
|---|---|---|---|
| 1 | Intentionality | 5 | Glass + serif voice chosen; composition assembled from defaults |
| 2 | Readability | 5 | Body copy over dimmed film is fine at top; mid-page contrast unverified visually |
| 3 | Usability | 10 | Primary task (Begin Journey → /login) works; CTAs ≥44px |
| 4 | Responsiveness | 5 | Grids collapse; 320px + RTL unverified |
| 5 | Speed | 5 | Video + blur are heavy; offscreen demo pause exists; no metrics |
| 6 | Accessibility | 5 | Keyboard path exists; focus/contrast/zoom not audited |

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | MEDIUM | Accessibility | `Home.tsx` sections | No visible focus treatment beyond defaults | Verify `:focus-visible` on all CTA/stepper/accordion controls | Keyboard users must see where they are |
| 2 | MEDIUM | Color | `Home.tsx` body copy over film | `text-neutral-600` over dimmed video mid-page | Confirm contrast ≥4.5:1 at `--film-dim` 0.28 floor, or raise floor | Text on video fails silently |
| 3 | MEDIUM | Layout | `Home.tsx` headers | 8× centered | Editorial rhythm per smell #1 | Structural, tracked in smell report |
| 4 | LOW | Motion | `CameraCloudFlow.tsx` | Fixed timers, always-on pulse | Pause pulse when idle; done | Cosmetic |

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| `CinematicHero.tsx` autoplay | Remove self-starting video | Escalation trigger noted, but the film IS the landing (wedding subject); muted + aria-hidden + reduced-motion path retained |
| `Home.tsx` demo carousel | Stop auto-rotation | Pauses offscreen via IntersectionObserver; acceptable |

## Verification

- `tsc --noEmit` clean; `CI=true react-scripts build` green; 15/15 landing tests.
- Contrast/zoom/RTL marked unverified (no live render in sandbox).

## Verdict

**Needs changes** — fix readability + focus visibility, then the smell structural work.
