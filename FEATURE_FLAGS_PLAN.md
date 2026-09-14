# Feature Flag Plan — Fyndr

> Status: **Draft for Review** · Author: `shivbera18` · Date: 2026-05-13
> This is the **plan PR** for the feature-flag system. The implementation PR will follow **only after this plan is approved via the review loop** defined in `pr-review-guidelines.md`.

---

## 1. Summary

Ship a **tiny, env-driven feature-flag system** that lets us hide unfinished work (first consumer: **Make a Reel**) behind a flag that can be flipped **without a code change** — an env var toggle + rebuild/redeploy. No new dependencies, no LaunchDarkly, no DB migration. Front-end and back-end each get a single registry file and a single helper; everything else is a one-liner gate.

Guideline established here: **every new unfinished feature MUST be gated from day one**, and the review loop below is mandatory for both the plan and the implementation.

---

## 2. Goals

- Disable unfinished features in prod while keeping them testable in dev/staging.
- Zero-cost, zero-infra: env vars only, CRA (`REACT_APP_*`) + Express (`process.env`) + `pm2`/Vercel/Docker.
- One flag addition = ~3 lines (registry + env fallback), one gate = ~1 line.
- **Make a Reel** is the first flagged feature (button, route, backend music endpoints).
- Deterministic in tests: flags are injectable/mocked, never read directly from `process.env` in components.

## 3. Non-Goals

- Per-user / per-tenant targeting, percentage rollouts, A/B, remote config UI — not needed until we have a real targeting requirement.
- Runtime toggle without redeploy (would need a polling endpoint or DB). Documented as a **future extension**, not v1.
- Analytics-gated flags (e.g., "show if event has > N photos") — out of scope.

---

## 4. Current State Mapping

| Area | Today | Flag Touch Points |
|------|-------|-------------------|
| Front-end build | CRA `react-scripts`, `REACT_APP_API_URL` / `REACT_APP_ML_URL` baked at `npm run build` | Add `REACT_APP_FEATURE_REEL` (and future flags) same mechanism |
| Back-end config | `node-server-1/src/config.ts` reads `process.env.*` with defaults | Add `FEATURE_REEL` with same pattern |
| Routing | `front-end/src/App.js` defines `Route path='/reel/:eventId'` + `CameraCaptureWithMask.tsx` "Create Reel" button | Gate both |
| Backend reel support | `node-server-1/src/routes/music.ts` — `GET /api/music/shorts-search`, `GET /api/music/audio` | Gate with 404 when flag off |
| Existing flags | **None** — `gates.ts` is paywall sessionState, not a feature flag | New dedicated registry files |

---

## 5. Design

### 5.1 Principles (from `AGENTS.md` / `CLAUDE.md`)

- **Delete before add, boring before clever.** Plain object + function, no class, no SDK.
- **No new dep without metric.** Flag check is `=== "true"`; no `p-limit` style add.
- **Taste: 6-month maintainability.** One registry per side, alphabetical, typed.

### 5.2 Flag Registry — Single Source of Truth

**Front-end:** `front-end/src/config/featureFlags.ts`

```ts
export type FlagId = "reel"; // union grows with each feature

export interface FlagDef { id: FlagId; envKey: string; defaultEnabled: boolean; description: string; }

export const FLAGS: Record<FlagId, FlagDef> = {
  reel: {
    id: "reel",
    envKey: "REACT_APP_FEATURE_REEL",
    defaultEnabled: false, // unfinished in prod → off unless explicitly enabled
    description: "Make a Reel — creator, music, shorts audio",
  },
};

// Build-time env read, but swappable in tests via override param.
export function isFeatureEnabled(id: FlagId, overrides?: Partial<Record<FlagId, boolean>>): boolean { … }
export function useFeatureFlag(id: FlagId): boolean { … } // thin hook over isFeatureEnabled
```

**Back-end:** `node-server-1/src/config/featureFlags.ts` — identical shape but envKey `FEATURE_REEL`, default `false`, helper `isFeatureEnabled(id)`.

- Env var truthy check is **strict**: `value === "true"` (lowercase). Anything else (unset, `"false"`, `"1"`) is `false`. Prevents accidental enable via presence alone.
- Flags are **typed union**, so `isFeatureEnabled("typo")` is a compile error.

### 5.3 Gating Matrix — "Make a Reel" (v1 Consumer)

| Surface | When flag OFF | When flag ON |
|---------|---------------|--------------|
| `CameraCaptureWithMask` "Create Reel" button | Not rendered (no empty placeholder that shifts layout) | Rendered as today |
| `App.js` `/reel/:eventId` route | `Navigate to="/"` (or `NotFound`) — deep link hidden; test asserts redirect | Lazy `ReelPage` as today |
| `node-server-1/src/routes/music.ts` search+audio | `404 { error: "feature disabled" }` — prevents bypassing UI gate via curl | Existing 200/429/502 logic unchanged |
| Future flags | Same pattern: gate entry point (button + route) + any backend endpoint that is meaningless without UI | — |

No middleware global mount — each route file checks `isFeatureEnabled("reel")` at the **top of the handler** and early-returns. Keeps the flag local to the feature's file; no hidden global.

### 5.4 How to Add a New Flag (3-step checklist — must be in the PR template)

1. Add entry to `FLAGS` in both registries (`front-end/src/config/featureFlags.ts`, `node-server-1/src/config/featureFlags.ts`) — one line + envKey + description.
2. Gate entry points: UI button/route + backend handler(s) — `if (!isFeatureEnabled("x")) return …`.
3. Add/extend test that asserts OFF hides route/button and returns 404, and ON shows it. Env example (`.env.example`) updated.

### 5.5 Defaults & Environments

| Env | `FEATURE_REEL` | `REACT_APP_FEATURE_REEL` | Effect |
|-----|----------------|--------------------------|--------|
| Local dev | unset or `"true"` in `node-server-1/.env` / `front-end/.env` | Developer opts in explicitly | Reel visible locally when you want to iterate |
| Vercel preview | `"true"` in preview env | QA sees reel | Testing without touching prod |
| Production (Vercel + Oracle) | `"false"` or unset | prod hidden by default; flip to `"true"` + redeploy to launch | Safe to merge unfinished work to `main` — stays hidden |

Documented toggle procedure (see §7) — **no code change to ship/hide**, just env + redeploy.

### 5.6 Testing Strategy

- **Front-end:** `front-end/src/config/__tests__/featureFlags.test.ts` — truth table for env parsing + union type. Component tests mock `isFeatureEnabled` (or set `process.env.REACT_APP_FEATURE_REEL`) to assert button hidden vs shown and route redirects. Never read `process.env` directly in components; always via helper (mockable).
- **Back-end:** `node-server-1/src/config/__tests__/featureFlags.test.ts` + route tests for `music.ts` — with `FEATURE_REEL=false` expect 404, with `true` expect existing behaviour. Helpers read `process.env` fresh each call so test can flip env without restart.
- **No flaky env leakage:** each test saves/restores `process.env` and resets module cache if needed.

### 5.7 No New Dependencies

Pure `process.env` + React hook. No LaunchDarkly, no Unleash, no `p-limit`.

---

## 6. Implementation Plan

This plan itself is a PR. The code PR that follows **must** follow the steps and review loop below — this section is the **guideline the implementer must obey**.

### 6.1 Plan PR (This PR)

- [ ] Add this file (`FEATURE_FLAGS_PLAN.md`).
- [ ] Open PR `plan: feature flag system` against `main`.
- [ ] Review loop: delegate to **adversarial sub-agent reviewer** via `task`/`hub`, `gh pr review --comment` (never `gh pr comment`). Address every finding, re-review until **zero-defect** (`--approve` with explicit "no remaining issues").
- [ ] Merge only after approval + trivial build check (`tsc --noEmit` touches only docs, so no build required).

### 6.2 Implementation PR (Next PR, after plan merge)

Ordered, granular commits:

1. `feat(flags): add frontend flag registry and hook` — `front-end/src/config/featureFlags.ts` + tests, no gating yet.
2. `feat(flags): add backend flag registry` — `node-server-1/src/config/featureFlags.ts` + tests.
3. `feat(reel): gate make-a-reel behind FEATURE_REEL` — `App.js` route guard + `CameraCaptureWithMask` button gate + `music.ts` 404 guard, with OFF/ON tests on both sides.
4. `docs(flags): env examples and toggle runbook` — `.env.example` entries + `DEPLOYMENT.md` snippet.

Each commit must be pushable and pass its side's build/tests independently (ponytail: smallest diff that still works).

### 6.3 Review Loop for Implementation PR (Mandatory — `pr-review-guidelines.md`)

1. Implement, push branch, open PR.
2. **You (orchestrator) MUST NOT review your own code.** Launch a **fresh reviewer sub-agent** with the diff (`git diff origin/main...branch`) and the guidelines file.
3. Reviewer posts a **formal GH review** via `gh pr review --comment` or `--request-changes` (never `gh pr comment`), structured per `pr-review-guidelines.md §4`: file+line, severity, why it fails, exploit/failure mode.
4. Orchestrator fixes **every** finding, pushes, re-triggers reviewer.
5. Repeat until reviewer explicitly states **no remaining issues** and `--approve`s. Only then `gh pr merge --merge --delete-branch`.
6. Pre-merge verify: `npm --prefix front-end run build` (or `tsc --noEmit`), `npm --prefix node-server-1 run build`, `npm --prefix front-end test -- --watchAll=false`, `node --test dist/...` for flags.

---

## 7. Operations — How to Toggle

- **Local:** `echo REACT_APP_FEATURE_REEL=true >> front-end/.env`, `echo FEATURE_REEL=true >> node-server-1/.env`, `pnpm dev` restart.
- **Vercel (frontend):** Dashboard → Project → Settings → Environment Variables → `REACT_APP_FEATURE_REEL=true` → Redeploy. Same for preview vs production.
- **Oracle (backend):** `ssh fyndr "nano ~/pic-share/node-server-1/.env"` set `FEATURE_REEL=true`, `pm2 restart fyndr-api`.
- **Docker:** `docker-compose.*.yml` `environment:` or `.env` at compose root — same keys.
- **Verification:** `curl http://localhost:5000/api/music/shorts-search?q=test` should 404 when OFF, 200/502 when ON; front-end `/reel/evt` should redirect when OFF.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Flag check scattered, gate missed | Registry + checklist in §5.4; reviewer explicitly audits gating matrix (§5.3) |
| Env typo enables in prod (`"True"` vs `"true"`) | Strict `=== "true"` check, documented; test covers case variants |
| CRA build-time flags confuse "flip without deploy" expectation | Docs state clearly: flip env + **redeploy/rebuild** required; future runtime endpoint listed as §9 |
| Backend 404 vs 503 confusion (music also 503 when yt-dlp missing) | Flag OFF is **404 feature disabled** (distinct from 503 engine missing, 502 search failed) |

---

## 9. Future Extensions (Not v1)

- `GET /api/flags` (public, cached) + `front-end` fetch on load + `useFlag` that merges server value over build-time default → true runtime toggle without rebuild. Keep registry shape stable so this is additive.
- Per-user targeting: extend `isFeatureEnabled(id, context)` with `userId`/`eventId` and a DB-backed allowlist — only if needed.
- Admin UI to flip flags — out of scope until more than ~5 flags.

---

## 10. Acceptance Criteria for Plan PR

- This doc exists, is linked from `AGENTS.md`/`UPGRADE_PLAN.md` if needed, and the PR passes the review loop with **zero-defect** approval.

## 11. Acceptance Criteria for Implementation PR

- Flag registries exist and are typed.
- "Create Reel" button hidden and `/reel/:eventId` redirects when `FEATURE_REEL` is off; music endpoints return 404 when off; all visible when on.
- Tests cover OFF and ON for both front-end and back-end.
- `.env.example` and toggle docs updated.
- Review loop completed with approval; builds and tests pass.

