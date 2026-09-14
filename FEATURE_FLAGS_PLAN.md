# Feature Flag Plan — Fyndr

> Status: **Draft for Review** · Author: `shivbera18` · Date: 2026-05-13
> This is the **plan PR** for the feature-flag system. The implementation PR will follow **only after this plan is approved via the review loop** defined in `pr-review-guidelines.md`.

---

## 1. Summary

Ship a **tiny, env-driven feature-flag system** that lets us hide unfinished work (first consumer: **Make a Reel**) behind a flag that can be flipped **without a code change** — an env var toggle + rebuild/redeploy. No new dependencies, no LaunchDarkly, no DB migration. Front-end and back-end each get a single registry file and a single helper; everything else is a one-liner gate.

Guideline established here: **every new unfinished feature MUST be gated from day one**, and the review loop below is mandatory for both the plan and the implementation. Enforcement: a PR-template checkbox (see §5.4).

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
| Front-end build | CRA `react-scripts`, `REACT_APP_API_URL` / `REACT_APP_ML_URL` baked at `npm run build` | Add `REACT_APP_FEATURE_REEL` same mechanism; must also be wired in `docker-compose.*.yml` (see §7) |
| Back-end config | `node-server-1/src/config.ts` reads `process.env.*` with defaults | Add `FEATURE_REEL` with same pattern; must also be wired in `docker-compose.*.yml` (see §7) |
| Routing | `front-end/src/App.js` defines `Route path='/reel/:eventId'` + `CameraCaptureWithMask.tsx` "Create Reel" button | Gate both — route → `Navigate to="/" replace` when OFF |
| Backend reel support | `node-server-1/src/routes/music.ts` — `GET /api/music/shorts-search`, `GET /api/music/audio` | Gate with `404 { error: "feature disabled" }` as **first line** of each handler (see §5.3) |
| Existing flags | **None** — `gates.ts` is paywall sessionState, not a feature flag | New dedicated registry files |

---

## 5. Design

### 5.1 Principles (from `AGENTS.md` / `CLAUDE.md`)

- **Delete before add, boring before clever.** Plain object + function, no class, no SDK.
- **No new dep without metric.** Flag check is `=== "true"`; no new package.
- **Taste: 6-month maintainability.** One registry per side, alphabetical, typed.

### 5.2 Flag Registry — Single Source of Truth

**Front-end:** `front-end/src/config/featureFlags.ts` — **canonical implementation below is the contract**.

```ts
export type FlagId = "reel"; // union grows with each feature

export interface FlagDef { id: FlagId; envKey: string; defaultEnabled: boolean; }

export const FLAGS: Record<FlagId, FlagDef> = {
  // Make a Reel — creator, music, shorts audio (first consumer)
  reel: { id: "reel", envKey: "REACT_APP_FEATURE_REEL", defaultEnabled: false },
};

// Frontend: CRA inlines process.env at build time, so unit tests cannot flip
// env by mutating process.env + resetModules. Tests MUST use the overrides
// param or mock the module. No direct process.env reads in components.
export function isFeatureEnabled(id: FlagId, overrides?: Partial<Record<FlagId, boolean>>): boolean {
  if (overrides && id in overrides) return overrides[id] as boolean;
  const def = FLAGS[id];
  const raw = process.env[def.envKey];
  if (raw === undefined) return def.defaultEnabled;
  return raw === "true";
}
```

**Back-end:** `node-server-1/src/config/featureFlags.ts` — identical `FlagId` / `FlagDef` / `FLAGS` shape but `envKey: "FEATURE_REEL"`, `defaultEnabled: false`. Back-end helper is:

```ts
// Back-end: reads process.env fresh on every call (not build-time inlined),
// so tests flip env by mutating process.env and calling the helper again.
// No overrides param needed — that keeps the surface smaller. If we ever need
// per-request context, add overrides then. For now symmetry is intentionally
// broken for the right reason: different build semantics.
export function isFeatureEnabled(id: FlagId): boolean {
  const def = FLAGS[id];
  const raw = process.env[def.envKey];
  if (raw === undefined) return def.defaultEnabled;
  return raw === "true";
}
```

- Env var truthy check is **strict**: `raw === "true"` (lowercase). Anything else (unset → `defaultEnabled`, `"false"`, `"1"`, `"True"`, `"TRUE"`) is `false`. This allows a future flag with `defaultEnabled: true` (kill-switch, e.g. `reel` graduating to always-on) to be disabled by explicitly setting `FEATURE_REEL=false`, while unset preserves the default.
- Flags are **typed union**, so `isFeatureEnabled("typo")` is a compile error.

> **Why no `useFeatureFlag` hook in v1:** A thin hook that just calls `isFeatureEnabled` adds indirection with no reactivity (flags are build-time constants, not state). Components call `isFeatureEnabled("reel")` directly. If we add a runtime `GET /api/flags` fetch in §9, then a `useFeatureFlag` hook that merges server value becomes justified.

### 5.3 Gating Matrix — "Make a Reel" (v1 Consumer)

| Surface | When flag OFF | When flag ON |
|---------|---------------|--------------|
| `CameraCaptureWithMask` "Create Reel" button | Not rendered (no empty placeholder that shifts layout) | Rendered as today |
| `App.js` `/reel/:eventId` route | `Navigate to="/" replace` — deep link hidden as if feature does not exist; test asserts redirect to `"/"` (see H1 — `NotFound` only if eventId is structurally invalid, not for flag-off) | Lazy `ReelPage` as today |
| `node-server-1/src/routes/music.ts` search+audio | `404 { error: "feature disabled" }` — **first line** of each handler, before any `if (q.length < 2) return 400` or other validation, prevents leaking "q required" vs "disabled" distinction and avoids unnecessary `yt-dlp` work | Existing 200/429/502 logic unchanged |
| Future flags | Same pattern: gate entry point (button + route) + any backend endpoint that is meaningless without UI | — |

Guard ordering is part of the contract: `if (!isFeatureEnabled("reel")) return res.status(404).send({ error: "feature disabled" });` must be the first statement in each music handler.

No middleware global mount — each route file checks at the top of the handler and early-returns. Keeps the flag local to the feature's file; no hidden global.

### 5.4 How to Add a New Flag (3-step checklist — must be in the PR template)

1. Add entry to `FLAGS` in both registries (`front-end/src/config/featureFlags.ts`, `node-server-1/src/config/featureFlags.ts`) — one line + envKey + comment description above the entry.
2. Gate entry points: UI button/route + backend handler(s) — `if (!isFeatureEnabled("x")) return …` (backend: first line).
3. Add/extend test that asserts OFF hides route/button and returns 404, and ON shows it. Env example (`.env.example`) updated.

PR template (`.github/pull_request_template.md`) will contain:

```md
- [ ] If this PR adds user-visible surface, is it gated by a feature flag per `FEATURE_FLAGS_PLAN.md` §5.4? (or N/A with reason)
```

### 5.5 Defaults & Environments

| Env | `FEATURE_REEL` (backend) | `REACT_APP_FEATURE_REEL` (frontend) | Effect |
|-----|--------------------------|-------------------------------------|--------|
| Local dev | unset or `"true"` in `node-server-1/.env` / `front-end/.env` | Developer opts in explicitly via `.env` | Reel visible locally when iterating |
| Vercel preview | n/a (backend not on Vercel) | `"true"` in preview env | QA sees reel without touching prod |
| Production (Vercel frontend + Oracle backend + Docker) | `"false"` or unset on Oracle + `docker-compose.prod.yml`; `"false"` or unset on Vercel | prod hidden by default; flip to `"true"` + **redeploy/rebuild** to launch | Safe to merge unfinished work to `main` — stays hidden |

Documented toggle procedure (see §7) — **no code change to ship/hide**, just env + redeploy/rebuild (CRA requires rebuild for frontend flags).

### 5.6 Testing Strategy

- **Front-end:** `front-end/src/config/__tests__/featureFlags.test.ts` — truth table for env parsing: `undefined → defaultEnabled`, `"true" → true`, `"false"/"1"/"True"/"" → false`; verifies `defaultEnabled: true` flag would be disabled by `"false"`. Component tests **must** use `overrides` param or `jest.mock("config/featureFlags")` — never `process.env.REACT_APP_* = "true"; jest.resetModules()` because CRA inlines the value at build time.
- **Back-end:** `node-server-1/src/config/__tests__/featureFlags.test.ts` + route tests for `music.ts` — back-end reads `process.env` fresh each call, so tests flip by mutating `process.env.FEATURE_REEL` and calling the helper/handler again (no `overrides` param). With `FEATURE_REEL=false` expect 404 from music routes **before** any 400 validation; with `true` expect existing behaviour.
- **Split-brain assertion:** After toggling, verify both sides (§7 verification).
- **No flaky env leakage:** each test saves/restores `process.env` value for the specific key it touches; frontend tests pass `overrides` and never mutate global env.

### 5.7 No New Dependencies

Pure `process.env` + optional `overrides` param (frontend only). No LaunchDarkly, no Unleash.

---

## 6. Implementation Plan

This plan itself is a PR. The code PR that follows **must** follow the steps and review loop below — this section is the **guideline the implementer must obey**.

### 6.1 Plan PR (This PR)

- [x] Add this file (`FEATURE_FLAGS_PLAN.md`).
- [x] Open PR `plan: feature flag system` against `main`.
- [ ] Review loop: delegate to **adversarial sub-agent reviewer** via `task`/`hub`, `gh pr review --comment` (never `gh pr comment`). Address every finding, re-review until **zero-defect** (`--approve` with explicit "no remaining issues").
- [ ] Merge only after approval + **build still passes** (`npm --prefix node-server-1 run build` + `npm --prefix front-end run build` — docs-only PRs also run builds to guard against precedent drift per `pr-review-guidelines.md`).

### 6.2 Implementation PR (Next PR, after plan merge)

Ordered, granular commits (low-risk docs/env first; `pm2` normalized per `DEPLOYMENT.md`):

1. `feat(flags): add frontend and backend flag registries + env examples` — `front-end/src/config/featureFlags.ts` + `node-server-1/src/config/featureFlags.ts` + tests + `.env.example` entries + `docker-compose.dev.yml` / `docker-compose.prod.yml` `api.environment` / `web.environment` wiring for `FEATURE_REEL` / `REACT_APP_FEATURE_REEL` (see §7). Passes both builds independently.
2. `feat(reel): gate make-a-reel behind FEATURE_REEL` — `App.js` `Navigate to="/" replace` guard + `CameraCaptureWithMask` button gate + `music.ts` first-line 404 guard, with OFF/ON tests on both sides (including that 404 precedes 400).

Each commit must be pushable and pass its side's build/tests independently (ponytail: smallest diff that still works).

### 6.3 Review Loop for Implementation PR (Mandatory — `pr-review-guidelines.md`)

1. Implement, push branch, open PR.
2. **You (orchestrator) MUST NOT review your own code.** Launch a **fresh reviewer sub-agent** with the diff (`git diff origin/main...branch`) and the guidelines file.
3. Reviewer posts a **formal GH review** via `gh pr review --comment` or `--request-changes` (never `gh pr comment`), structured per `pr-review-guidelines.md` §4: file+line, severity, why it fails, exploit/failure mode.
4. Orchestrator fixes **every** finding, pushes, re-triggers reviewer.
5. Repeat until reviewer explicitly states **no remaining issues** and `--approve`s. Only then `gh pr merge --merge --delete-branch`.
6. Pre-merge verify: `npm --prefix front-end run build` (or `tsc --noEmit`), `npm --prefix node-server-1 run build`, `npm --prefix front-end test -- --watchAll=false`, `node --test dist/...` for flags.

---

## 7. Operations — How to Toggle

- **Local:** `echo REACT_APP_FEATURE_REEL=true >> front-end/.env`, `echo FEATURE_REEL=true >> node-server-1/.env`, `pnpm dev` restart. For Docker local: same keys in `docker-compose.dev.yml` `web.environment` / `api.environment` or root `.env` consumed by compose.
- **Vercel (frontend):** Dashboard → Project → Settings → Environment Variables → `REACT_APP_FEATURE_REEL=true` (set for Preview and/or Production separately) → **Redeploy** (CRA bakes env at build time).
- **Oracle (backend):** `ssh fyndr "nano ~/pic-share/node-server-1/.env"` set `FEATURE_REEL=true`, `ssh fyndr "pm2 restart all && pm2 save"` (normalized — matches `DEPLOYMENT.md`).
- **Docker (prod):** `docker-compose.prod.yml` — `api.environment: - FEATURE_REEL=${FEATURE_REEL:-false}` and `web.environment: - REACT_APP_FEATURE_REEL=${REACT_APP_FEATURE_REEL:-false}` (or `.env` at compose root). Changing the value requires `docker compose -f docker-compose.prod.yml up --build -d` to bake the frontend flag.
- **Verification (must do both sides after toggle — guards against split-brain):** `curl http://localhost:5000/api/music/shorts-search?q=test` should 404 when OFF, 200/502 when ON; front-end `/reel/<eventId>` should redirect to `/` when OFF (check via `curl -i http://localhost:3000/reel/test-event` or browser nav). If one side still 404/redirect after toggle, the other side's env was not propagated (Vercel redeploy missed or `pm2 restart all` not run or compose not rebuilt).

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Flag check scattered, gate missed | Registry + checklist in §5.4 + PR template checkbox; reviewer explicitly audits gating matrix (§5.3) |
| Env typo enables in prod (`"True"` vs `"true"`) | Strict `=== "true"` check, documented; test covers case variants; unset respects `defaultEnabled` (§5.2) |
| CRA build-time flags confuse "flip without deploy" expectation | Docs state clearly: flip env + **redeploy/rebuild** required; future runtime endpoint listed as §9 |
| Backend 404 vs 503 confusion (music also 503 when yt-dlp missing) | Flag OFF is **404 feature disabled** (distinct from 503 engine missing, 502 search failed); guard is first line so 404 precedes 503 |
| Split-brain (frontend ON, backend OFF or vice versa) | §7 verification curls both sides; Docker compose wiring explicitly required (C1) |
| Docker compose env not propagated | C1 fix: compose files must declare `environment:` passthrough; doc and code PR include it |

---

## 9. Future Extensions (Not v1)

- `GET /api/flags` (public, cached, `Cache-Control: public, max-age=60`) + `front-end` fetch on load + hook that merges server value over build-time default → true runtime toggle without rebuild. Keep registry shape stable so this is additive. At that point, `useFeatureFlag` becomes justified.
- Per-user targeting: extend `isFeatureEnabled(id, context)` with `userId`/`eventId` and a DB-backed allowlist — only if needed.
- Admin UI to flip flags — out of scope until more than ~5 flags.

---

## 10. Acceptance Criteria for Plan PR

- This doc exists and the PR passes the review loop with **zero-defect** approval (`gh pr review --approve` stating no remaining issues).
- `npm --prefix node-server-1 run build` and `npm --prefix front-end run build` pass (even for docs-only, per guideline).

## 11. Acceptance Criteria for Implementation PR

- Flag registries exist and are typed; `isFeatureEnabled` respects `defaultEnabled` and strict `=== "true"` semantics, with frontend `overrides` param and backend fresh-env read.
- "Create Reel" button hidden and `/reel/:eventId` redirects to `/` when `FEATURE_REEL` is off; music endpoints return 404 as **first** handler line when off; all visible/200 when on.
- `docker-compose.*.yml` wired for the flag; `.env.example` updated.
- Tests cover OFF and ON for both front-end and back-end, including flag-vs-validation ordering and `defaultEnabled` truth table.
- PR template checkbox added.
- Review loop completed with approval; builds and tests pass.

