# QR Mobile Visibility Fix — Plan (Fyndr)

> Status: **Draft for Review** · Author: `shivbera18` · Date: 2026-05-13
> Scope: **Show QR code option is not visible in mobile view** (photographer dashboard → InEvent). This is the **plan PR** for the fix. The implementation PR will follow **only after this plan is approved via the review loop** defined in `pr-review-guidelines.md` (adversarial `code-reviewer` sub-agent, `gh pr review --comment`, zero-defect).

---

## 1. Summary

Guests access the event via a QR code that the photographer shares from **Dashboard → InEvent**. On **mobile (<768px)** the “Guest QR Code / QR Code” entry is effectively invisible: the **desktop header actions are `hidden md:flex` at `InEvent.tsx:809`** and the **mobile sticky action bar at `InEvent.tsx:1519` (`fixed bottom-0 z-30`) sits under `BottomNav` at `BottomNav.tsx:49` (`fixed bottom-0 z-40`)** with no bottom padding, so the QR button is painted but **covered and untappable**. The fix makes the QR entry reliably visible and tappable on mobile without duplicating UI or adding a dependency, while keeping the desktop header as-is.

Guideline established here: every fix ships behind the existing **feature-flag** discipline (`FEATURE_FLAGS_PLAN.md` — no finished-feature code touches `main` without a flag or a `md:hidden`/`hidden md:flex` gate that a test proves). QR is **core, not flagged** — the flag stays `reel`-only (see §5.3).

---

## 2. Goals

- On **mobile (320–767px)** the QR action is **visible above BottomNav, tappable, and opens the QR modal**, with a **44×44px** tap target and correct contrast (`CLAUDE.md`).
- On **desktop (≥768px)** the existing header button (`hidden md:flex` at `InEvent.tsx:809`) stays the **single** QR entry — no duplicate sticky bar on desktop.
- No layout shift on desktop, no scroll-jank on mobile (no extra blur repaints), and no new dependency.
- Deterministic in tests: mobile vs desktop visibility is asserted via **responsive class strings** (`hidden md:flex` vs `md:hidden`, `bottom-*`, `pb-*`), not via `matchMedia` breakpoint mocks that jsdom cannot evaluate for Tailwind `md` (768px).

## 3. Non-Goals

- Redesigning the entire photographer dashboard or `BottomNav` navigation (out of scope).
- Making the standee-download or analytics buttons the focus — only QR visibility is the P0.
- Runtime per-user feature flag for QR — QR is a core, non-flagged photographer action (flag stays `reel`-only).

---

## 4. Current State Mapping

| Surface | File | Mobile (<md) | Desktop (≥md) | Bug |
|---------|------|-------------|--------------|-----|
| **Header actions** (Back, Analytics, Monetization, **Guest QR Code**, Table standee, Delete) | `front-end/src/component/dashboard/InEvent.tsx:809-851` | `class="hidden md:flex …"` → **hidden** on mobile | `md:flex` → visible | QR hidden on mobile by design, but mobile fallback is broken (next row) |
| **Mobile sticky action bar** (Back, Analytics, **QR Code**, Delete) | `front-end/src/component/dashboard/InEvent.tsx:1519-1550` | `class="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2"` → **visible**, but `z-30` < `BottomNav` `z-40` and both `fixed bottom-0`, so **BottomNav covers the sticky bar** on `/dashboard` (where `isDashboardRoute` true and `selectedEvent` is set) | Same `fixed bottom-0` but QR already in header, so duplication + overlap on desktop | Root cause: **z-index tie (equal or lower) + no bottom offset + no `md:hidden` + no bottom padding** |
| **BottomNav** | `front-end/src/component/navbar/BottomNav.tsx:32-49` | `fixed bottom-0 z-40` on dashboard routes (`/dashboard`, `/events`, `/create-event`, `/analytics`, `/settings`, `/account`) — **InEvent lives inside Dashboard at `/dashboard` with `selectedEvent` state, so `location.pathname === "/dashboard"` and BottomNav is mounted** | Same `fixed bottom-0` — also covers sticky bar on desktop, but header QR is the intended entry | Covers the only mobile QR entry |
| **Page padding** | `front-end/src/component/dashboard/InEvent.tsx:791` (`<div className="space-y-8">` wrapper) + `front-end/src/component/dashboard/Dashboard.tsx:159` (`<main className="flex-1 container … py-8 pb-20 md:pb-8 space-y-8">`) | InEvent has **no own `pb`**, Dashboard has `pb-20` (80px) for BottomNav alone → last photo row + sticky bar still hidden behind the two fixed bars | Dashboard `md:pb-8` (32px) is enough when sticky is hidden | Content underlap — user must scroll past photos that are actually behind the bar |
| **QR modal** | `front-end/src/component/dashboard/InEvent.tsx:1553-1564` (`ResponsiveModal`) | `Drawer` on mobile via `Vaul`, `Dialog` on desktop — **modal itself works** once the trigger is tappable | `Dialog` — works | Not the bug; trigger is |

**Visual proof (to be added in implementation PR description):** screenshots at **390×844** (iPhone 12) and **1024×768** showing `Guest QR Code` in header vs `QR Code` in sticky bar above `BottomNav`.

**Flag interaction:** QR is **not** behind `FEATURE_REEL`. The recent flag work (`App.js` reel route, `CameraCaptureWithMask` Create Reel) is unrelated, and this fix **must not** put QR behind the reel flag — plan §5.3 explicitly forbids it and the PR template checkbox requires `N/A — QR is core` with reason.

---

## 5. Design

### 5.1 Principles (from `AGENTS.md` / `CLAUDE.md`)

- **Delete before add, boring before clever.** No new component, no `react-responsive`, no `useMediaQuery` lib — pure Tailwind responsive classes + a single `pb-*` token + one `pb-safe` utility.
- **Tailwind 3.4.4 + Radix + Vaul only.** No extra dependency without metric (`COST_ESTIMATION.md`).
- **Tap targets ≥44×44px, no ceremony.** Existing `min-h-[44px]` stays; fix only ensures it is not covered.

### 5.2 Root Cause (single sentence)

Mobile QR is **rendered but not visible** because the only mobile QR trigger lives in a `fixed bottom-0 z-30` sticky bar at `InEvent.tsx:1519` that is **painted under** the dashboard `BottomNav` at `BottomNav.tsx:49` (`fixed bottom-0 z-40`), while the desktop header that contains the other QR trigger at `InEvent.tsx:809` is `hidden` on mobile.

### 5.3 Fix — Minimal, Responsive-Class-Only

**File `front-end/src/component/dashboard/InEvent.tsx:1519` — Mobile sticky action bar:**

```tsx
// Before (bug) — bottom-0 z-30, blur, no md:hidden, overflows at 320px:
<div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2">

// After (fix — additive, no desktop change):
<div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-50 md:hidden bg-background border-t border-border p-3 flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap">
```

- `bottom-[calc(4rem+env(safe-area-inset-bottom))]` lifts the bar **above** `BottomNav` (4rem = 64px ≈ BottomNav’s `min-h-[44px]` + `py-1` + `border-t` + gap) **plus** the iOS home-indicator safe area. Using `calc` with `env(safe-area-inset-bottom)` is correct on devices with and without a home indicator (safe-area is `0px` when absent). This replaces the guessed `bottom-16` with a measured offset that accounts for safe-area.
- `z-50` is **strictly above** `BottomNav` `z-40` (and equal to `Dialog/Drawer` `z-50`, but the sticky bar is `md:hidden` so it never competes with the QR modal on desktop; on mobile the modal is a `Drawer` that overlays the bar, so equal `z-50` is safe — the Drawer’s portal is later in the DOM and will paint above).
- `md:hidden` hides the **entire** sticky bar on desktop — desktop already has `hidden md:flex` header at `InEvent.tsx:809`, so no duplication and no desktop repaint cost.
- `bg-background` (opaque) replaces `bg-background/95 backdrop-blur` — matches `BottomNav.tsx:48` comment “ponytail: solid bg, no backdrop-blur — blur on a fixed bar repaints every scroll frame” and removes the per-frame blur cost.
- `overflow-x-auto scrollbar-hide flex-nowrap` with `whitespace-nowrap` on the buttons (existing `flex-1 min-h-[44px]` keeps tap target) prevents overflow at **320px**: 4 buttons (`Back` `Analytics` `QR Code` `Delete`) stay in one row and scroll horizontally rather than wrapping and growing the bar’s height (which would invalidate the `bottom-16` offset).

**File `front-end/src/component/dashboard/InEvent.tsx:791` — Page wrapper:**

```tsx
// Before:
<div className="space-y-8">

// After:
<div className="space-y-8 pb-16 md:pb-0">
```

- `pb-16` (4rem = 64px) on mobile reserves space for the **sticky bar alone** (≈64px). `Dashboard.tsx:159` already provides `pb-20` (80px) for `BottomNav`, so total mobile bottom padding becomes `pb-20` (outer `main`) + `pb-16` (inner `InEvent`) = **144px**, which covers **BottomNav (≈60px) + sticky bar (≈60px) + `p-3` (12px)** with a small safety margin, and **does not** create the 208px gulf that `pb-32` would (`pb-20` + `pb-32` = 208px). `md:pb-0` on `InEvent` restores the original `space-y-8` rhythm on desktop where the sticky bar is `md:hidden` and `Dashboard` already has `md:pb-8` (32px) for `BottomNav`.
- No `min-h-screen` change — Dashboard already has it; extra `pb` on `InEvent` is the least-global place to add the offset and is conditional on `selectedEvent` being set (so the `my events` grid does not get extra padding).

**File `front-end/src/index.css:114` — Safe-area utility (required, not optional):**

```css
@layer utilities {
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
}
```

- Tailwind 3.4.4 has no built-in `pb-safe`. Without this definition the `pb-safe` class in the sticky bar is a no-op and iOS home-indicator clipping remains. The utility is one line, additive, and matches the `calc(…+env(safe-area-inset-bottom))` bottom offset (the bar’s `bottom` lifts it, `pb-safe` would pad its inner content if needed — but the primary fix is the `bottom-[calc(...)]`; `pb-safe` is kept as a utility for future use and does not hurt).

**File `front-end/src/component/navbar/BottomNav.tsx` — No change required**, but the plan documents the mount assumption: `BottomNav` renders only if `user && isDashboardRoute` (`Dashboard.tsx`’s `InEvent` is rendered **inside** `Dashboard` at `location.pathname === "/dashboard"` with `selectedEvent` state, so `isDashboardRoute` is `true` and `BottomNav` is always present when the sticky bar is). If a future route ever renders `InEvent` outside `/dashboard` (e.g., `/events/:id`), the `bottom-[calc(...)]` offset would float the sticky bar with no bar beneath it — the `pb-16` would then look excessive; the test below guards this by asserting the pathname assumption.

**What is explicitly NOT changed:**

- Header `hidden md:flex` at `InEvent.tsx:809` stays — QR remains single-entry per breakpoint (no duplicate visible buttons at the same width: `hidden md:flex` (≥768px) vs `md:hidden` (<768px) are mutually exclusive by construction, so at exactly 768px only the header is visible).
- No new state, no `useEffect` for `window.innerWidth`, no `isFeatureEnabled("reel")` around QR — QR is core, not flagged, and the PR template will be checked as `N/A — QR is core, not a new feature`.

### 5.4 How to Verify the Fix (manual + automated)

- **Manual (must be in implementation PR description with screenshots at 390×844 and 1024×768):**
  - `pnpm dev` → open `http://localhost:3000/dashboard` → open an event → resize to **390×844** (or Chrome Device Toolbar iPhone 12) → assert **“QR Code” secondary button is visible, tappable, and opens the QR modal** (`Guest QR code — <name>` Drawer); scroll to bottom → last photo grid is fully visible, not hidden behind the bars.
  - Resize to **1024×768** → assert header **“Guest QR Code”** visible, sticky bar **hidden** (`display:none` via `md:hidden`), `BottomNav` still visible but not covering the header QR.

- **Automated (jsdom — class string assertions only, no `matchMedia` breakpoint mock for Tailwind):**
  - Unit: `InEvent`’s desktop header actions container has `hidden md:flex`; sticky bar has `fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-50 md:hidden bg-background border-t` and `overflow-x-auto scrollbar-hide flex-nowrap`; wrapper has `pb-16 md:pb-0`. These are string-presence assertions that prevent class regression and work in jsdom where `md` media queries are not evaluated.
  - Integration: render `Dashboard` with `selectedEvent` mocked and assert the QR trigger is in the accessibility tree (`getByRole("button", { name: /QR Code/i })`) and that `BottomNav` (`aria-label="Mobile Navigation Bar"`) is present — proving both are mounted but the sticky bar’s `bottom-[calc(...)]` and `z-50` place it above.

### 5.5 No New Dependencies

Tailwind responsive utilities + existing `ResponsiveModal` (Drawer/Dialog) + one `@layer utilities .pb-safe`. No `react-responsive`, no extra hook.

### 5.6 Testing Strategy

- **Front-end:** `front-end/src/component/dashboard/__tests__/InEvent.qr.test.tsx` (new) — 3 tests: **mobile class** → sticky bar has `z-50`, `md:hidden`, `bottom-[calc` and `overflow-x-auto`; wrapper has `pb-16`; **desktop class** → header has `hidden md:flex`; **accessibility** → `QR Code` button is `getByRole` visible. No `window.matchMedia` at 390/1024 — Tailwind `md` is not evaluated in jsdom, so the test does not mock `matchMedia` (that would be vacuous).
- **Existing tests:** `InEventLeads.test.tsx`, `InEventPin.test.tsx` must still pass — they render `InEvent` with mocked `selectedEvent`; the fix is CSS-only, no prop change, so they should pass without update.
- **No flaky viewport tests:** use `className` string assertions rather than pixel-perfect screenshots or `matchMedia`.

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

1. `fix(ui): make InEvent QR visible on mobile` — `InEvent.tsx:1519` mobile sticky bar: `fixed bottom-0 z-30 bg-background/95 backdrop-blur` → `fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 md:hidden bg-background` + `overflow-x-auto scrollbar-hide flex-nowrap` + wrapper `InEvent.tsx:791` `space-y-8` → `space-y-8 pb-16 md:pb-0` + `index.css` `.pb-safe` utility. No logic change.
2. `test(ui): cover QR mobile vs desktop visibility` — `InEvent.qr.test.tsx` with 3 class-assertion tests as in §5.4, plus `pb-16` wrapper assertion.

Each commit must be pushable and pass its side’s build/tests independently.

### 6.3 Review Loop for Implementation PR (Mandatory — `pr-review-guidelines.md`)

1. Implement, push branch, open PR.
2. **You (orchestrator) MUST NOT review your own code.** Launch a **fresh reviewer sub-agent** with the diff (`git diff origin/main...branch`) and the guidelines file.
3. Reviewer posts a **formal GH review** via `gh pr review --comment` or `--request-changes` (never `gh pr comment`), structured per `pr-review-guidelines.md` §4: file+line, severity, why it fails, exploit/failure mode.
4. Orchestrator fixes **every** finding, pushes, re-triggers reviewer.
5. Repeat until reviewer explicitly states **no remaining issues** and `--approve`s. Only then `gh pr merge --merge --delete-branch`.
6. Pre-merge verify: `npm --prefix front-end run build` (or `tsc --noEmit`), `npm --prefix node-server-1 run build`, `npm --prefix front-end test -- --watchAll=false` (InEvent).

---

## 7. Operations — How to Verify After Deploy

- **Staging (Vercel preview):** open event on iPhone (or 390px) → QR visible above `BottomNav` (with safe-area lift), opens `Guest QR code — <name>` Drawer; scroll to last photo → not hidden; `pb-16` shows no 208px gulf.
- **Prod (Oracle + Vercel):** same manual check at `https://app.fyndr.in/dashboard`. No env toggle — QR is core, not flagged. Vercel preview requires redeploy for any future `REACT_APP_*` flag, but this fix is UI-only, no env.
- **Rollback:** revert `InEvent.tsx:791` and `InEvent.tsx:1519` one-line class changes + `index.css` utility; no DB migration, no `pm2 restart` beyond the normal frontend Vercel auto-deploy.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `bottom-[calc(4rem+env(safe-area-inset-bottom))]` not enough on some devices (e.g., BottomNav grows with 200% font scale) | 4rem = 64px covers `BottomNav`’s `min-h-[44px]` + `py-1` + `border-t` at 100% scale; the `calc` adds `env(safe-area-inset-bottom)` for notched devices; `overflow-x-auto` prevents sticky bar height growth at 320px. If QA at 320px/200% reports clipping, bump to `bottom-[calc(5rem+env(safe-area-inset-bottom))]` — one token. |
| Desktop sticky bar still renders and repaints on scroll | `md:hidden` ensures it is `display:none` on ≥768px, so no repaint cost on desktop (matches `BottomNav.tsx:48` solid `bg-background` principle; `bg-background` opaque replaces `bg-background/95 backdrop-blur`). |
| Future `BottomNav` height change reintroduces overlap | Test asserts `bottom-[calc(4rem+env(safe-area-inset-bottom))]` and `md:hidden` and `pb-16` class strings — any height change that breaks the offset will fail the test and force a plan update. |
| QR modal trigger duplicated (header + sticky) at exactly 768px | Header is `hidden md:flex` (≥768px flex), sticky is `md:hidden` (<768px flex) — mutually exclusive by construction; test asserts both breakpoints via class strings. |
| `BottomNav` not mounted (e.g., `isDashboardRoute` false or no user) | InEvent is only reachable via `Dashboard` at `/dashboard` with `selectedEvent` state, so `BottomNav` is always present when the sticky bar is — documented in §5.3 and tested via `Dashboard` with `selectedEvent` mock. |

---

## 9. Future Extensions (Not v1)

- `BottomNav` `md:hidden` (hide entirely on desktop where header navigation exists) — separate PR, not needed to fix QR.
- Extract `MobileStickyActions` as a shared component if more events use the same pattern — only when a second consumer appears.

---

## 10. Acceptance Criteria for Plan PR

- This doc exists and the PR passes the review loop with **zero-defect** approval (`gh pr review --approve` or COMMENT with explicit “no remaining issues”).

## 11. Acceptance Criteria for Implementation PR

- On mobile (320–767px) the InEvent QR entry at `InEvent.tsx:1519` is visible and tappable above `BottomNav` (`z-50`, `bottom-[calc(4rem+env(safe-area-inset-bottom))]`, `md:hidden`, `overflow-x-auto`), with no content hidden behind the bars (`InEvent.tsx:791` `pb-16 md:pb-0` on top of `Dashboard.tsx:159` `pb-20 md:pb-8`).
- On desktop (≥768px) the InEvent header QR at `InEvent.tsx:809` is visible and the mobile sticky bar is hidden (`md:hidden`).
- No new dependency; `min-h-[44px]` preserved; `backdrop-blur` removed, `bg-background` opaque.
- `.pb-safe` utility defined in `index.css`.
- Tests cover mobile vs desktop class visibility and the `pb-16` wrapper (string assertions, no `matchMedia` mock).
- Review loop completed with approval; builds and tests pass.

