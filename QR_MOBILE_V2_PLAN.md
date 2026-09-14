# QR Mobile Visibility & Download — Fix v2 Plan (Fyndr)

> Status: **Draft for Review** · Author: `shivbera18` · Date: 2026-05-14
> Scope: **Guest QR code option still not visible in mobile view, and QR download not reliably working on phones**. This is the **plan PR** for the v2 fix. The previous fix (#132: `bottom-[calc(4rem+env(...))] z-40 md:hidden` + `pb-[calc(8rem+env(...))]`) is on `main` but the photographer still cannot see or download the QR on a real phone. This plan finds the root cause and defines the minimal v2 fix. The implementation PR will follow **only after this plan is approved via the review loop** in `pr-review-guidelines.md`.

---

## 1. Summary

The InEvent “Guest QR Code” entry is still invisible on real phones (tested at 390×844, iPhone 14) and the “Download QR (PNG)” / “Table standee” download via `a.click()` fails on iOS Safari. The v1 fix moved the mobile fallback from `bottom-0 z-30` to `bottom-[calc(4rem+env(...))] z-40 md:hidden` and added `pb-[calc(8rem+env(...))]`, but two residual causes remain:

1. **Header `hidden md:flex` at `InEvent.tsx:809` hides the header QR on every phone** — the sticky fallback is the *only* mobile entry, so any sticky-bar defect (z, bottom, overflow, safe-area) makes QR completely inaccessible.
2. **Sticky is still `fixed` inside a scrollable `main` that has no `transform` but shares the viewport with `BottomNav` `fixed bottom-0 z-40` at `BottomNav.tsx:49`** — equal `z-40` + `bottom-[calc(4rem+env(...))]` lifts it above BottomNav, but on devices where `isDashboardRoute` is false (deep-link, no `user` in `localStorage`, or future route change) BottomNav is absent and the sticky floats 4rem above the viewport edge, while the wrapper `pb-[calc(8rem+env(...))]` leaves a 128px+ gulf. More importantly, `a[download]` via `canvas.toDataURL` is ignored on iOS — the download appears to do nothing.

The v2 fix makes QR **unconditionally visible in the normal flow on mobile** (header becomes `flex` with horizontal scroll, not `hidden`) and makes **download work on phones** via `canvas.toBlob` + `URL.createObjectURL` + `navigator.share`/`window.open` fallback, while keeping the sticky as an *additional* thumb-reachable entry.

---

## 2. Goals

- On **mobile (320–767px)** the QR action is **visible without scrolling to the bottom**, tappable at **44×44px**, and **downloadable / shareable on iOS/Android** via a single tap (no `a[download]` that iOS ignores).
- On **desktop (≥768px)** the header QR stays as before — no duplication, no layout shift.
- No new dependency, no extra route, no flag (QR is core, not behind `FEATURE_REEL`).
- Deterministic in tests: header `flex` vs `hidden` and sticky `md:hidden` + download fallback are asserted via class and share-API mocks, not screenshots.

## 3. Non-Goals

- Redesigning `BottomNav` or the whole Dashboard — only the InEvent header + sticky + download.
- Adding a backend QR endpoint or R2 upload for QR — stays client-side `QRCodeCanvas` + `canvas`.
- Runtime per-user flag for QR.

---

## 4. Current State Mapping (after #132)

| Surface | File:Line | Mobile (<md) | Desktop (≥md) | Residual Bug |
|---------|-----------|-------------|--------------|--------------|
| **Header actions** | `InEvent.tsx:809` `hidden md:flex` | **hidden** — QR + 5 other buttons hidden | `md:flex` → visible | QR hidden on mobile; mobile relies solely on sticky |
| **Mobile sticky** | `InEvent.tsx:1519` `fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-40 md:hidden bg-background … overflow-x-auto` | **visible** above `BottomNav`, `z-40` equal to `BottomNav` `z-40`, `bottom-[calc]` lifts it, `overflow-x-auto` handles 320px | `md:hidden` → hidden | Works when `BottomNav` is present at `/dashboard`, but **floats 4rem above viewport when `BottomNav` is absent** (e.g., `isDashboardRoute` false, no `user`, or direct `/events/:id`); also `z-40` equal to `BottomNav` relies on DOM order, and `a[download]` download fails on iOS |
| **BottomNav** | `BottomNav.tsx:49` `fixed bottom-0 z-40` | `fixed bottom-0` on dashboard routes (`isDashboardRoute` true) | Same | No safe-area `pb-safe`; but sticky’s `bottom-[calc(...)]` already accounts for it |
| **Wrapper padding** | `InEvent.tsx:792` `space-y-8 pb-[calc(8rem_+_env(safe-area-inset-bottom))] md:pb-0` + `Dashboard.tsx:159` `pb-20 md:pb-8` | `pb-[calc(8rem+env)]` (128+safe) + `pb-20` (80) = **208+safe** total — actually more than sticky+BottomNav (≈122+safe) — leaves a gulf on short events | `md:pb-0` + `md:pb-8` (32) OK | Over-padded but not the visibility bug |
| **QR download** | `Qrcode.tsx:16` + `InEvent.tsx:698` `downloadStandee` | `a.download` + `a.click()` with `canvas.toDataURL` — **ignored on iOS Safari** (data URL + download attr) | Works on desktop | User taps “Download QR (PNG)” on phone → nothing happens |
| **QR modal** | `InEvent.tsx:1553` `ResponsiveModal` | `Drawer` via Vaul — works once trigger is visible | `Dialog` — works | Not the bug |

**Reproduction on real phone (from user report):** open event on iPhone → header shows `Event detail` title only, no `Guest QR Code` button; sticky bar is present but **partially under `BottomNav` on some font scales or hidden behind the home indicator on others**, and tapping “Download QR (PNG)” inside the modal does nothing.

**Flag interaction:** QR stays core, not flagged — `FEATURE_FLAGS_PLAN.md` checkbox is `N/A — QR is core`.

---

## 5. Design

### 5.1 Principles

- **Boring before clever.** No new component, no `react-responsive`, no `useMediaQuery` — Tailwind responsive classes + `navigator.share`/`window.open` fallback.
- **One entry in the normal flow on mobile.** `fixed` bars are inherently fragile (z, safe-area, `isDashboardRoute`, `transform` containing block). The header is in the normal flow — making it visible on mobile is the most robust fix.

### 5.2 Root Cause (single sentence)

Mobile QR is invisible because the **only** mobile entry is a `fixed` sticky bar that is correctly lifted above `BottomNav` but still **assumes `BottomNav` is always present** and uses `a[download]` which iOS ignores, while the **header that is in the normal flow is `hidden` on mobile**, so any sticky-bar defect makes QR completely inaccessible and undownloadable.

### 5.3 Fix — Minimal, Two-File

**File `InEvent.tsx:809` — Header actions (the primary fix):**

```tsx
// Before (bug): hidden on mobile
<div className="hidden md:flex items-center gap-2">

// After (fix): visible on mobile as a horizontally scrollable row in the normal flow
<div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-2 md:pb-0">
```

- `flex` (not `hidden`) makes the header row visible on mobile. `overflow-x-auto scrollbar-hide flex-nowrap` with `whitespace-nowrap` on the buttons (already `min-h-[44px]`) lets the 6 buttons (Back, Analytics, Monetization, **Guest QR Code**, Table standee, Delete) scroll horizontally at 320px instead of wrapping and growing the header’s height. No `md:` prefix needed — the same row works on desktop (`md:flex` was already `flex` on desktop, now it’s `flex` everywhere).
- This guarantees QR is **above the fold, in the normal flow, not `fixed`, not covered by `BottomNav`**, and reachable via swipe on narrow screens. The sticky remains as a **secondary** thumb-reachable entry for convenience, but is no longer the *only* mobile entry.

**File `InEvent.tsx:1519` — Mobile sticky action bar (keep, but also make it robust):**

```tsx
// Before (after #132):
<div className="fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom))] inset-x-0 z-40 md:hidden bg-background border-t border-border p-3 flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-safe">

// After (fix): keep md:hidden, keep z-40 (below Dialog z-50, equal to BottomNav z-40 but later DOM paints above), keep bottom-[calc], keep overflow, but add explicit aria and keep pb-safe
<div className="fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom))] inset-x-0 z-40 md:hidden bg-background border-t border-border p-3 flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-safe" role="toolbar" aria-label="Event actions">
```

- No change to `z-40` vs `z-50` debate — `z-40` is correct (below `Dialog`/`Drawer` `z-50` overlay, equal to `BottomNav` `z-40` but later DOM paints above, so sticky is above BottomNav and below modals). The header fix already makes QR visible even if sticky were to be covered, so `z-40` is safe.
- `bottom-[calc(4rem_+_env(safe-area-inset-bottom))]` stays — 4rem = BottomNav height (44px + py + border) + safe-area, documented in the comment `/* 4rem = BottomNav height + safe-area; InEvent only inside Dashboard at /dashboard */` added in `376f14d`.
- `md:hidden` stays — no duplication on desktop (header is `flex` on desktop, sticky is `md:hidden`).
- Add `role="toolbar"` + `aria-label` as requested in prior review L2.

**File `InEvent.tsx:792` — Wrapper padding (keep, but document):**

```tsx
// Before (after #132):
<div className="space-y-8 pb-[calc(8rem_+_env(safe-area-inset-bottom))] md:pb-0">

// After: keep — 8rem = sticky (4rem) + BottomNav (4rem) + safe-area, on top of Dashboard pb-20 (80px) for BottomNav alone would be double-counted, but InEvent is the *only* place with the sticky, so the extra 8rem is intentional.
// No change — just add comment in code: `/* 8rem = sticky + BottomNav + safe-area */`
```

- The previous plan’s `pb-[calc(8rem+env(...))]` (128+safe) plus `Dashboard pb-20` (80) = 208+safe is indeed more than the minimal 122+safe, but it ensures the last photo and `Show more` button at `1504` are not hidden behind the two fixed bars even at 200% font scale. The gulf on short events (0 photos) is acceptable — short events show “No photos yet” card, not a blank gulf. Keep as is.

**Files `Qrcode.tsx:16` + `InEvent.tsx:698` — Download on phones (the “easily download” part):**

```ts
// Before:
const a = document.createElement("a");
a.download = `${name}_QRCode.png`;
a.href = canvas.toDataURL("image/png");
a.click();

// After (fix — keep desktop path, add mobile share/open fallback):
const downloadQRCode = async () => {
  const canvas = document.getElementById("fyndr-qrcode")?.querySelector("canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const fileName = `${eventName.replace(/\s+/g, "_")}_QRCode.png`;
  // Try Web Share API with file (iOS 17+, Android) — lets user save to Photos/Files
  try {
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: "image/png" })] })) {
      await navigator.share({ files: [new File([blob], fileName, { type: "image/png" })], title: eventName });
      return;
    }
  } catch {}
  // Fallback: data URL + download attr (desktop) or open in new tab (iOS where download is ignored)
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  // iOS Safari ignores download attr for data URLs — open the image so user can long-press Save
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator as unknown as { standalone?: boolean }).standalone) {
    window.open(url, "_blank");
  } else {
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
```

- Same pattern for `downloadStandee` at `InEvent.tsx:698` (the printable standee PNG) — share `canvas` blob via `navigator.share`, else `toDataURL` + `window.open` on iOS, else `a.click()`.
- No new dependency — `canvas.toBlob` and `navigator.share` are platform APIs.

**File `front-end/src/index.css` — Keep `.pb-safe` as is (already added in `c5d279e`).**

### 5.4 How to Verify

- **Manual (must be in implementation PR description with screenshots):**
  - `pnpm dev` → `/dashboard` → open event → **320px, 390×844, 1024×768** — header `Guest QR Code` visible and horizontally scrollable on mobile (swipe), sticky `QR Code` also visible above `BottomNav`, both open the `Guest QR code — <name>` Drawer/Dialog; inside modal tap “Download QR (PNG)” → on desktop downloads, on iOS opens image in new tab (long-press Save) or system share sheet.

- **Automated (jsdom — class strings + share mock):**
  - Header has `flex` (not `hidden`), `overflow-x-auto`, `flex-nowrap`; sticky has `bottom-[calc(4rem_+_env(safe-area-inset-bottom))]`, `z-40`, `md:hidden`, `overflow-x-auto`; wrapper has `pb-[calc(8rem_+_env(safe-area-inset-bottom))]`.
  - Download: mock `HTMLCanvasElement.prototype.toBlob` + `navigator.share`/`navigator.canShare`, assert `share` called with `File` on mobile UA, else `a.click`/`window.open` fallback.

### 5.5 No New Dependencies

Tailwind + `QRCodeCanvas` already. `navigator.share` and `canvas.toBlob` are platform APIs.

---

## 6. Implementation Plan

### 6.1 Plan PR (This PR)

- [x] Add this file (`QR_MOBILE_V2_PLAN.md`).
- [x] Open PR `plan: qr mobile v2 — visible + downloadable on phones` against `main`.
- [ ] Review loop: `task`/`hub` + `gh pr review --comment` (never `gh pr comment`). Address every finding, re-review until **zero-defect**.
- [ ] Merge only after approval + `npm --prefix node-server-1 run build` + `npm --prefix front-end run build` pass.

### 6.2 Implementation PR (Next PR, after plan merge)

Granular commits:

1. `fix(ui): make InEvent header QR visible on mobile` — `InEvent.tsx:809` `hidden md:flex` → `flex overflow-x-auto scrollbar-hide flex-nowrap`.
2. `fix(ui): make QR download work on phones` — `Qrcode.tsx:16` + `InEvent.tsx:698` `toBlob` + `navigator.share` + `window.open` fallback for iOS.
3. `test(ui): cover header QR visibility and mobile download` — `InEvent.qr.test.tsx` extended: header `flex` not `hidden`, `overflow-x-auto`, and download `share` mock.

Each commit pushable and passes its side’s tests.

### 6.3 Review Loop (Mandatory — `pr-review-guidelines.md`)

Same as `QR_MOBILE_PLAN.md` §6.3 and `FEATURE_FLAGS_PLAN.md` §6.3.

---

## 7. Operations

- **Staging/Prod:** same as `QR_MOBILE_PLAN.md` §7 — open event on phone, header QR visible and scrollable, sticky QR also visible, download opens share sheet (Android) or new tab (iOS). No env, no `pm2 restart`.
- **Rollback:** revert `InEvent.tsx:809`, `Qrcode.tsx:16`, `InEvent.tsx:698`.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Header `flex` with 6 buttons overflows 320px, label wraps | `overflow-x-auto scrollbar-hide flex-nowrap` + `whitespace-nowrap` on buttons (already `min-h-[44px]`) keeps one row and scrollable; test asserts `overflow-x-auto`. |
| `navigator.share` with `files` not supported on some browsers | `canShare` guard + `window.open` fallback + desktop `a.click()` path — always one path succeeds. |
| `bottom-[calc(4rem_+_env(...))]` still floats when BottomNav absent | Header is now the primary mobile entry in the normal flow, so sticky floating is not a P0; sticky remains `md:hidden` secondary. |

---

## 9. Future Extensions

- Extract `MobileStickyActions` if more events use it.
- Add `BottomNav` `md:hidden` to hide on desktop — separate PR.

---

## 10. Acceptance Criteria for Plan PR

- This doc exists and passes the review loop with **zero-defect** approval.

## 11. Acceptance Criteria for Implementation PR

- On mobile (320–767px) header `Guest QR Code` is visible and scrollable in the normal flow, sticky `QR Code` is also visible above `BottomNav` (`z-40`/`bottom-[calc]`/`md:hidden`/`overflow-x-auto`), wrapper `pb-[calc(8rem+env)]` prevents underlap.
- “Download QR (PNG)” and “Table standee” download via `share` on phones and `a.click()` on desktop (iOS opens new tab).
- No new dependency; `min-h-[44px]` preserved; `backdrop-blur` stays removed.
- Tests cover header `flex` vs `hidden`, sticky `bottom`/`z`/`overflow`, and download `share` mock.
- Review loop completed with approval; builds and tests pass.

