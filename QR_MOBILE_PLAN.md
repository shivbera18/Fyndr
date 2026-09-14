# QR Mobile Visibility Fix — Plan (Fyndr)

> Status: **Draft for Review** · Author: `shivbera18` · Date: 2026-05-13
> Scope: **Show QR code option is not visible in mobile view** (photographer dashboard → InEvent). This is the **plan PR** for the fix. The implementation PR will follow **only after this plan is approved via the review loop** defined in `pr-review-guidelines.md` (adversarial `code-reviewer` sub-agent, `gh pr review --comment`, zero-defect).

---

## 1. Summary

Guests access the event via a QR code that the photographer shares from **Dashboard → InEvent**. On **mobile ( < 768px )** the “Guest QR Code / QR Code” entry is effectively invisible: the **desktop header actions are `hidden md:flex`** and the **mobile sticky action bar (`fixed bottom-0 z-30`) sits under `BottomNav` (`fixed bottom-0 z-40`)** with no bottom padding, so the QR button is painted but **covered and untappable**. The fix makes the QR entry reliably visible and tappable on mobile without duplicating UI or adding a dependency, while keeping the desktop header as-is.

Guideline established here: every fix ships behind the existing **feature-flag** discipline (`FEATURE_FLAGS_PLAN.md` — no finished-feature code touches `main` without a flag or a `md:hidden`/`hidden md:flex` gate that a test proves).

---

## 2. Goals

- On **mobile (320–767px)** the QR action is **visible above the fold or within one tap**, not hidden behind `BottomNav`, with a **44×44px** tap target and correct contrast (`CLAUDE.md`).
- On **desktop (≥768px)** the existing header button (`hidden md:flex` at `InEvent.tsx:809`) stays the **single** QR entry — no duplicate sticky bar on desktop.
- No layout shift on desktop, no scroll-jank on mobile (no extra blur repaints), and no new dependency.
- Deterministic in tests: mobile vs desktop visibility is asserted via **jsdom + `matchMedia` breakpoint** or via **responsive class assertions** (`hidden md:flex` vs `md:hidden`), not screenshots.

## 3. Non-Goals

- Redesigning the entire photographer dashboard or `BottomNav` navigation (out of scope).
- Making the standee-download or analytics buttons the focus — only QR visibility is the P0.
-_runtime per-user feature flag for QR — QR is a core, non-flagged photographer action (flag stays `reel`-only).

---

## 4. Current State Mapping

| Surface | File | Mobile (<md) | Desktop (≥md) | Bug |
|---------|------|-------------|--------------|-----|
| **Header actions** (Back, Analytics, Monetization, **Guest QR Code**, Table standee, Delete) | `front-end/src/component/dashboard/InEvent.tsx:809-851` | `class="hidden md:flex …"` → **hidden** on mobile | `md:flex` → visible | QR hidden on mobile by design, but mobile fallback is broken (next row) |
| **Mobile sticky action bar** (Back, Analytics, **QR Code**, Delete) | `InEvent.tsx:1518-1550` | `class="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t p-3 flex …"` → **visible**, but `z-30` < `BottomNav` `z-40` and both `fixed bottom-0`, so **BottomNav covers the sticky bar** on `/dashboard` (where `isDashboardRoute` true) | Same `fixed bottom-0` but QR already in header, so duplication + overlap on desktop | Root cause: **z-index collision + no bottom offset + no `md:hidden`** |
| **BottomNav** | `front-end/src/component/navbar/BottomNav.tsx:45-74` | `fixed bottom-0 z-40` on dashboard routes (`/dashboard`, `/events`, etc.) — **InEvent lives inside Dashboard at `/dashboard`, so BottomNav is mounted** | Same `fixed bottom-0` — also covers sticky bar on desktop, but header QR is the intended entry | Covers the only mobile QR entry |
| **Page padding** | `InEvent.tsx:791` (`space-y-8` wrapper) + `Dashboard.tsx` (`min-h-screen flex flex-col`) | **No `pb-*`** for fixed bars → last photo grid is also hidden behind the two fixed bars | Same | Content underlap — user must scroll past photos that are actually behind the bar |
| **QR modal** | `InEvent.tsx:1553-1564` (`ResponsiveModal`) | `Drawer` on mobile via `Vaul`, `Dialog` on desktop — **modal itself works** once the trigger is tappable | `Dialog` — works | Not the bug; trigger is |

**Visual proof (to be added in implementation PR description):** screenshots at 390×844 (iPhone) and 768+ showing `Guest QR Code` in header vs `QR Code` in sticky bar above `BottomNav`.

**Flag interaction:** QR is **not** behind `FEATURE_REEL`. The recent flag work (`App.js` reel route, `CameraCaptureWithMask` Create Reel) is unrelated, but the fix **must not** put QR behind the reel flag — the plan explicitly forbids it (see §5.3).

---

## 5. Design

### 5.1 Principles (from `AGENTS.md` / `CLAUDE.md`)

- **Delete before add, boring before clever.** No new component, no `react-responsive`, no `useMediaQuery` lib — pure Tailwind responsive classes + a single `pb-*` token.
- **Tailwind 3.4.4 + Radix + Vaul only.** No extra dependency without metric (`COST_ESTIMATION.md`).
- **Tap targets ≥44×44px, no ceremony.** Existing `min-h-[44px]` stays; fix only ensures it is not covered.

### 5.2 Root Cause (single sentence)

Mobile QR is **rendered but not visible** because the only mobile QR trigger lives in a `fixed bottom-0 z-30` sticky bar that is **painted under** the dashboard `BottomNav` `fixed bottom-0 z-40`, while the desktop header that contains the other QR trigger is `hidden` on mobile.

### 5.3 Fix — Minimal, Responsive-Class-Only

**File `InEvent.tsx` — Mobile sticky action bar (`~1518`):**

```tsx
// Before (bug):
<div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2">

// After (fix — additive, no desktop change):
<div className="fixed bottom-16 inset-x-0 z-40 md:hidden bg-background border-t border-border p-3 pb-safe flex gap-2">
```

- `bottom-16` (4rem ≈ 64px) lifts the bar **above** `BottomNav` (≈60px tall: `min-h-[44px]` + `py-1` + `border-t`). Use `bottom-16` rather than `bottom-[64px]` to stay on Tailwind scale.
- `z-40` matches `BottomNav` (or `z-50` if the reviewer insists on explicitly above — either is correct; `z-40` plus `bottom-16` already avoids overlap, so `z-40` is minimal).
- `md:hidden` hides the **entire** sticky bar on desktop — desktop already has `hidden md:flex` header, so no duplication and no desktop overlap.
- Drop `backdrop-blur` (per `BottomNav` comment “blur on a fixed bar repaints every scroll frame” — `BottomNav` deliberately uses `bg-background` solid; the sticky bar should match).
- Optional `pb-safe` (`env(safe-area-inset-bottom)`) for iPhone home-indicator — additive, one line in `index.css` if not already present.

**File `InEvent.tsx` — Page wrapper (`~791`):**

```tsx
// Before:
<div className="space-y-8">

// After:
<div className="space-y-8 pb-32 md:pb-8">
```

- `pb-32` (8rem) on mobile reserves space for **BottomNav (≈60px) + sticky bar (≈60px) + `p-3`**, so the last photo row is not hidden. `md:pb-8` restores the original `space-y-8` rhythm on desktop where the sticky bar is `md:hidden`.
- No `min-h-screen` change — Dashboard already has it; extra `pb` on `InEvent` is the least-global place to add the offset.

**File `BottomNav.tsx` — No change required**, but reviewer must **audit** that `isDashboardRoute` indeed includes `InEvent`’s mount point (`/dashboard` when `selectedEvent` is set). If the route check ever narrows to `/dashboard` exact-match only for a future tab, the overlap would silently reappear — the plan therefore adds a **test that asserts the overlap condition** (see §5.6).

**What is explicitly NOT changed:**

- Header `hidden md:flex` stays — QR remains single-entry per breakpoint (no duplicate visible buttons at the same width).
- No new state, no `useEffect` for `window.innerWidth`, no `isFeatureEnabled("reel")` around QR — QR is core, not flagged.

### 5.4 How to Verify the Fix (manual + automated)

- **Manual (must be in implementation PR description):**
  - `pnpm dev` → open `http://localhost:3000/dashboard` → open an event → resize to **390×844** (or Chrome Device Toolbar iPhone) → assert **“QR Code” secondary button is visible, tappable, and opens the QR modal**; scroll to bottom → last photo not hidden.
  - Resize to **1024×768** → assert header **“Guest QR Code”** visible, sticky bar **hidden**, `BottomNav` still visible but not covering content (desktop `pb-8`).

- **Automated (jsdom):**
  - Unit: `InEvent` renders `Guest QR Code` inside `hidden md:flex` and `QR Code` inside `fixed bottom-16 md:hidden` — assert class strings (prevents class regression).
  - Integration: mock `window.matchMedia` at 390px and 1024px, render `Dashboard` with `selectedEvent`, assert QR trigger is in the accessibility tree and **not** `aria-hidden`, and `BottomNav` does not obscure it (assert `BottomNav` + sticky bar have distinct `bottom-*` or that `getComputedStyle` z-index ordering is `sticky >= bottomNav` or `sticky bottom-16`).

### 5.5 No New Dependencies

Tailwind responsive utilities + existing `ResponsiveModal` (Drawer/Dialog). No `react-responsive`, no extra hook.

### 5.6 Testing Strategy

- **Front-end:** `front-end/src/component/dashboard/__tests__/InEvent.test.tsx` (new or extended) — 2 tests: **mobile** (`window.innerWidth = 390`) → `QR Code` button in `fixed bottom-16 md:hidden` is visible & opens modal; **desktop** (`innerWidth = 1024`) → `Guest QR Code` in `hidden md:flex` is visible, mobile sticky bar is `hidden` (or not in DOM with `md:hidden` at that breakpoint via class assertion). Also assert `pb-32` wrapper class on `InEvent` root.
- **Existing tests:** `InEventLeads.test.tsx`, `InEventPin.test.tsx` must still pass — they render `InEvent` with mocked `selectedEvent`; the fix is CSS-only, no prop change.
- **No flaky viewport tests:** use `window.matchMedia` mock + `className` assertions rather than pixel-perfect screenshot.

---

## 6. Implementation Plan

This plan itself is a PR. The code PR that follows **must** follow the steps and review loop below — this section is the **guideline the implementer must obey**.

### 6.1 Plan PR (This PR)

- [x] Add this file (`QR_MOBILE_PLAN.md`).
- [x] Open PR `plan: qr mobile visibility fix` against `main`.
- [ ] Review loop: delegate to **adversarial sub-agent reviewer** via `task`/`hub`, `gh pr review --comment` (never `gh pr comment`). Address every finding, re-review until **zero-defect** (`--approve` with explicit “no remaining issues”).
- [ ] Merge only after approval + `npm --prefix node-server-1 run build` + `npm --prefix front-end run build` (or `tsc --noEmit`) pass — docs-only still runs builds per `pr-review-guidelines.md`.

### 6.2 Implementation PR (Next PR, after plan merge)

Ordered, granular commits (low-risk first):

1. `fix(ui): make InEvent QR visible on mobile` — `InEvent.tsx` mobile sticky bar: `bottom-0 z-30 backdrop-blur` → `bottom-16 z-40 md:hidden border-t` (drop blur) + wrapper `space-y-8` → `space-y-8 pb-32 md:pb-8`. No logic change.
2. `test(ui): cover QR mobile vs desktop visibility` — `InEvent.test.tsx` (or `InEvent.qr.test.tsx`) with 2 viewport tests as in §5.4, plus `pb-32` class assertion.

Each commit must be pushable and pass its side’s build/tests independently.

### 6.3 Review Loop for Implementation PR (Mandatory — `pr-review-guidelines.md`)

1. Implement, push branch, open PR.
2. **You (orchestrator) MUST NOT review your own code.** Launch a **fresh reviewer sub-agent** with the diff (`git diff origin/main...branch`) and the guidelines file.
3. Reviewer posts a **formal GH review** via `gh pr review --comment` or `--request-changes` (never `gh pr comment`), structured per `pr-review-guidelines.md` §4: file+line, severity, why it fails, exploit/failure mode.
4. Orchestrator fixes **every** finding, pushes, re-triggers reviewer.
5. Repeat until reviewer explicitly states **no remaining issues** and `--approve`s. Only then `gh pr merge --merge --delete-branch`.
6. Pre-merge verify: `npm --prefix front-end run build` (or `tsc --noEmit`), `npm --prefix node-server-1 run build`, `npm --prefix front-end test -- --watchAll=false` (InEvent + App).

---

## 7. Operations — How to Verify After Deploy

- **Staging (Vercel preview):** open event on iPhone (or 390px) → QR visible above `BottomNav`, opens `Guest QR code — <name>` modal; scroll to last photo → not hidden.
- **Prod (Oracle + Vercel):** same manual check at `https://app.fyndr.in/dashboard`. No env toggle — QR is core, not flagged.
- **Rollback:** revert `InEvent.tsx` one-line class changes; no DB migration.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `bottom-16` not enough on some devices (e.g., BottomNav grows with font scale) | Use `bottom-16` (4rem) which already covers `BottomNav`’s `min-h-[44px]` + padding; test at 320px width + 200% font scale. If reviewer measures a collision, bump to `bottom-20` (5rem) — one token. |
| Desktop sticky bar still renders and repaints on scroll | `md:hidden` ensures it is `display:none` on ≥768px, so no repaint cost on desktop (matches BottomNav’s solid `bg-background` principle). |
| Future `BottomNav` height change reintroduces overlap | Test asserts `bottom-16` and `md:hidden` class strings — any height change that breaks the offset will fail the test and force a plan update. |
| QR modal trigger duplicated (header + sticky) on some breakpoint (e.g., exactly 768px) | Header is `hidden md:flex` (≥768px flex), sticky is `md:hidden` (<768px flex) — mutually exclusive by construction; test asserts both breakpoints. |

---

## 9. Future Extensions (Not v1)

- `BottomNav` `md:hidden` (hide entirely on desktop where header navigation exists) — separate PR, not needed to fix QR.
- `pb-safe` for iPhone home indicator — one line (`padding-bottom: env(safe-area-inset-bottom)`) if QA reports clipping on notched devices.
- Extract `MobileStickyActions` as a shared component if more Events use the same pattern — only when a second consumer appears.

---

## 10. Acceptance Criteria for Plan PR

- This doc exists and the PR passes the review loop with **zero-defect** approval (`gh pr review --approve` or COMMENT with explicit “no remaining issues”).

## 11. Acceptance Criteria for Implementation PR

- On mobile (320–767px) the InEvent QR entry is visible and tappable above `BottomNav`, with no content hidden behind the bars (`pb-32`).
- On desktop (≥768px) the InEvent header QR is visible and the mobile sticky bar is hidden (`md:hidden`).
- No new dependency; `min-h-[44px]` preserved; `backdrop-blur` removed from the fixed bar.
- Tests cover mobile vs desktop visibility and the `pb-32` wrapper.
- Review loop completed with approval; builds and tests pass.

