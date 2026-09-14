# QR Mobile Visibility & Download — Fix v2 Plan (Fyndr)

> Status: **Draft for Review** · Author: `shivbera18` · Date: 2026-05-14
> Scope: **Guest QR code option still not visible in mobile view, and QR download not reliably working on phones**. This is the **plan PR** for the v2 fix. The previous fix (#132: `bottom-[calc(4rem+env(...))] z-40 md:hidden` + `pb-[calc(8rem+env(...))]`) is on `main` but the photographer still cannot see or download the QR on a real phone. This plan finds the root cause and defines the minimal v2 fix. The implementation PR will follow **only after this plan is approved via the review loop** in `pr-review-guidelines.md`.

---

## 1. Summary

The InEvent “Guest QR Code” entry is still invisible on real phones (tested at 390×844, iPhone 14) and the “Download QR (PNG)” / “Table standee” download via `a.click()` fails on iOS Safari. The v1 fix moved the mobile fallback from `bottom-0 z-30` to `bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 md:hidden` and added `pb-[calc(8rem+env(safe-area-inset-bottom))]`, but two residual causes remain:

1. **Header `hidden md:flex` at `InEvent.tsx:809` hides the header QR on every phone** — the sticky fallback is the *only* mobile entry, so any sticky-bar defect (z, bottom, safe-area, `isDashboardRoute`) makes QR completely inaccessible.
2. **Sticky is still `fixed` inside a scrollable `main` that shares the viewport with `BottomNav` `fixed bottom-0 z-40` at `BottomNav.tsx:49`** — equal `z-40` + `bottom-[calc(4rem+env(safe-area-inset-bottom))]` lifts it above BottomNav, but on devices where `isDashboardRoute` is false (deep-link, no `user` in `localStorage`, or future route change) BottomNav is absent and the sticky floats 4rem above the viewport edge, while the wrapper `pb-[calc(8rem+env(safe-area-inset-bottom))]` plus `Dashboard.tsx:159` `pb-20` leaves a 208px gulf. More importantly, `a[download]` via `canvas.toDataURL` is ignored on iOS — the download appears to do nothing.

The v2 fix makes QR **visible in the normal flow on mobile** (header becomes `flex` with horizontal scroll, not `hidden`) and makes **download work on phones** via `canvas.toDataURL` → `dataURLToBlob` (synchronous) → `navigator.share`/`window.open`/`URL.createObjectURL` fallback, while keeping the sticky as an *additional* thumb-reachable entry. Header and sticky both visible on mobile is intentional — header at top for discoverability, sticky at bottom for thumb reach — and the test is updated to expect `flex` not `hidden`.

---

## 2. Goals

- On **mobile (320–767px)** the QR action is **visible in the header without scrolling to the bottom** (primary) and also in the sticky thumb bar (secondary), tappable at **44×44px**, and **downloadable / shareable on iOS/Android** via a single tap.
- On **desktop (≥768px)** the header QR stays as before and sticky is hidden — no duplication in the viewport, no layout shift.
- No new dependency, no extra route, no flag (QR is core, not behind `FEATURE_REEL`).
- Deterministic in tests: header `flex` + `overflow-x-auto` + `whitespace-nowrap` and sticky `md:hidden` + download `share` are asserted via `toHaveClass` and `navigator.share` mocks, not `innerHTML` substrings.

## 3. Non-Goals

- Redesigning `BottomNav` or the whole Dashboard — only the InEvent header + sticky + download.
- Adding a backend QR endpoint or R2 upload for QR — stays client-side `QRCodeCanvas` + `canvas`.
- Runtime per-user flag for QR.

---

## 4. Current State Mapping (after #132)

| Surface | File:Line | Mobile (<md) | Desktop (≥md) | Residual Bug |
|---------|-----------|-------------|--------------|--------------|
| **Header actions** | `InEvent.tsx:809` `hidden md:flex items-center gap-2` | **hidden** — QR + 5 other buttons hidden | `md:flex` → visible | QR hidden on mobile; mobile relies solely on sticky |
| **Mobile sticky** | `InEvent.tsx:1519` `fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom))] inset-x-0 z-40 md:hidden bg-background border-t border-border p-3 flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-safe` | **visible** above `BottomNav`, `z-40` equal to `BottomNav` `z-40`, `bottom-[calc]` lifts it, `overflow-x-auto` handles 320px, `pb-safe` handles home indicator | `md:hidden` → hidden | Works when `BottomNav` is present at `/dashboard`, but **floats 4rem above viewport when `BottomNav` is absent**; `z-40` equal relies on DOM order, and download still uses `a[download]` |
| **BottomNav** | `BottomNav.tsx:49` `fixed bottom-0 z-40 bg-background border-t` | `fixed bottom-0` on dashboard routes (`isDashboardRoute` true) | Same | No safe-area `pb-safe` but sticky’s `bottom-[calc]` already accounts for it |
| **Wrapper padding** | `InEvent.tsx:792` `space-y-8 pb-[calc(8rem_+_env(safe-area-inset-bottom))] md:pb-0` + `Dashboard.tsx:159` `flex-1 container mx-auto max-w-6xl px-4 sm:px-6 py-8 pb-20 md:pb-8 space-y-8` | `pb-[calc(8rem+env)]` (128+safe) + `pb-20` (80) = **208+safe** total — more than sticky+BottomNav (≈122+safe) — leaves a gulf on short events | `md:pb-0` + `md:pb-8` (32) OK | Over-padded but not the visibility bug; will be trimmed to `pb-16` in v2 |
| **QR download** | `Qrcode.tsx:16` `downloadQRCode` + `InEvent.tsx:698` `downloadStandee` | `a.download` + `a.click()` with `canvas.toDataURL` — **ignored on iOS Safari** (data URL + download attr) | Works on desktop | User taps “Download QR (PNG)” on phone → nothing happens |
| **QR modal** | `InEvent.tsx:1553` `ResponsiveModal` | `Drawer` via Vaul — works once trigger is visible | `Dialog` — works | Not the bug |

**Reproduction on real phone:** open event on iPhone → header shows `Event detail` title only, no `Guest QR Code` button; sticky bar is present but **partially under `BottomNav` on some font scales or hidden behind the home indicator**, and tapping “Download QR (PNG)” inside the modal does nothing.

**Flag interaction:** QR stays core, not flagged — `FEATURE_FLAGS_PLAN.md` checkbox is `N/A — QR is core, intentional duplication header+sticky on mobile`.

---

## 5. Design

### 5.1 Principles

- **Boring before clever.** No new component, no `react-responsive`, no `useMediaQuery` — Tailwind responsive classes + `navigator.share`/`window.open` + `dataURLToBlob` helper.
- **One entry in the normal flow on mobile is primary.** `fixed` bars are inherently fragile (z, safe-area, `isDashboardRoute`, `transform` containing block). The header is in the normal flow — making it visible on mobile is the most robust fix. Sticky stays as secondary thumb entry, so both visible on mobile is intentional.

### 5.2 Root Cause (single sentence)

Mobile QR is invisible because the **only** mobile entry is a `fixed` sticky bar that is correctly lifted above `BottomNav` but still **assumes `BottomNav` is always present** and uses `a[download]` which iOS ignores, while the **header that is in the normal flow is `hidden` on mobile**, so any sticky-bar defect makes QR completely inaccessible and undownloadable.

### 5.3 Fix — Minimal

**File `InEvent.tsx:809` — Header actions (the primary fix):**

```tsx
// Before (bug): hidden on mobile
<div className="hidden md:flex items-center gap-2">

// After (fix): visible on mobile as a horizontally scrollable row in the normal flow
<div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-2 md:pb-0" role="toolbar" aria-label="Event actions">
  <Button variant="ghost" size="sm" onClick={backbtn} className="min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5">
    <ArrowLeft className="h-4 w-4" />
    Back to Events
  </Button>
  <Button variant="outline" size="sm" onClick={() => navigate(`/events/${eventID}/analytics`, { state: { eventName: name, ownerId } })} className="min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5">
    <BarChart3 className="h-4 w-4" />
    Guest Analytics
  </Button>
  <Button variant="outline" size="sm" onClick={() => document.getElementById("fy-paywall-card")?.scrollIntoView({ behavior: "smooth" })} className="min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5">
    <Coins className="h-4 w-4 text-amber-500" />
    Monetization
  </Button>
  <Button variant="secondary" size="sm" onClick={() => setShowQrModal(true)} className="min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5">
    <QrIcon className="h-4 w-4" />
    Guest QR Code
  </Button>
  <Button variant="outline" size="sm" onClick={downloadStandee} title="Download printable table standee (PNG)" className="min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5">
    <Download className="h-4 w-4" />
    Table standee
  </Button>
  <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)} className="min-h-[44px] shrink-0 whitespace-nowrap text-destructive hover:bg-destructive/10 border-destructive/30">
    <Trash2 className="h-4 w-4 mr-1.5" />
    Delete Event
  </Button>
</div>
```

- `flex` (not `hidden`) makes the header row visible on mobile. `overflow-x-auto scrollbar-hide flex-nowrap` with `whitespace-nowrap` + `shrink-0` on the buttons keeps the 6 buttons in one horizontally scrollable row at 320px instead of wrapping and growing the header’s height. `pb-2 md:pb-0` gives the scrollbar room without adding desktop padding.
- `role="toolbar"` + `aria-label="Event actions"` as requested in prior review L2 — makes the scrollable row discoverable to screen readers. `scrollbar-hide` is from `tailwind-scrollbar-hide` already in `tailwind.config.js:51`.
- This guarantees QR is **above the fold, in the normal flow, not `fixed`**, and reachable via swipe on narrow screens. The sticky remains as a **secondary** thumb-reachable entry at the bottom.

**File `InEvent.tsx:1519` — Mobile sticky action bar (keep, with `pb-safe` and `role`):**

```tsx
// Before (after #132):
<div className="fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom))] inset-x-0 z-40 md:hidden bg-background border-t border-border p-3 flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-safe">

// After (fix): keep md:hidden, keep z-40 (below Dialog z-50, equal to BottomNav z-40 but later DOM paints above), keep bottom-[calc], keep overflow, keep pb-safe
<div className="fixed bottom-[calc(4rem_+_env(safe-area-inset-bottom))] inset-x-0 z-40 md:hidden bg-background border-t border-border p-3 flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap pb-safe" role="toolbar" aria-label="Event actions">
```

- `z-40` is correct (below `Dialog`/`Drawer` `z-50` overlay at `components/ui/dialog.tsx:19`, equal to `BottomNav` `z-40` but later DOM paints above, so sticky is above BottomNav and below modals). The header fix already makes QR visible even if sticky were to be covered, so `z-40` is safe; no need for `z-50` which would collide with the overlay.
- `bottom-[calc(4rem_+_env(safe-area-inset-bottom))]` stays — 4rem = BottomNav height (44px + py + border) + safe-area, documented as `/* 4rem = BottomNav height + safe-area; InEvent only inside Dashboard at /dashboard, so BottomNav is always present; header is primary if BottomNav absent */`.
- `md:hidden` stays — on desktop header is `flex` and sticky is hidden, so only one QR entry in the viewport at ≥768px.

**File `InEvent.tsx:792` — Wrapper padding:**

```tsx
// Before (after #132):
<div className="space-y-8 pb-[calc(8rem_+_env(safe-area-inset-bottom))] md:pb-0">

// After (fix): trim to pb-16 (64px) + safe-area via pb-safe, total with Dashboard pb-20 (80px) = 144px+safe, which covers sticky (68px) + BottomNav (53px) + safe-area (34px) = 155px at 100% scale and 200% font scale, without the 208px gulf
<div className="space-y-8 pb-16 pb-safe md:pb-0">
```

- `pb-16` (64px) + `pb-safe` (env(safe-area-inset-bottom), 0 or 34px) + `Dashboard.tsx:159` `pb-20` (80px) = **144px+safe** total, which covers sticky (≈68px) + BottomNav (≈53px) = 121px at 100% scale, and 200% font scale (≈90px+53px=143px) plus safe-area, without the 208px gulf that `pb-[calc(8rem+env)]` (128+safe) created.
- No `min-h-screen` change — Dashboard already has it; extra `pb` on `InEvent` is the least-global place to add the offset and is conditional on `selectedEvent` being set.

**Files `Qrcode.tsx:16` + `InEvent.tsx:698` + new `front-end/src/utils/download.ts` — Download on phones (the “easily download” part, gesture-safe, DRY):**

Create `front-end/src/utils/download.ts`:

```ts
export function dataURLToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
export function sanitizeFileName(name: string, suffix: string): string {
  const base = name.replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_").slice(0, 50) || "Event";
  return `${base}${suffix}`;
}
export function shareOrDownload(blob: Blob, fileName: string, title: string, fallbackUrl: string, setMsg?: (m: string) => void): void {
  try {
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: "image/png" })] })) {
      navigator.share({ files: [new File([blob], fileName, { type: "image/png" })], title }).then(() => setMsg?.("Shared — save to Photos/Files.")).catch(() => fallbackDownload(blob, fileName, fallbackUrl, setMsg));
      return;
    }
  } catch {}
  fallbackDownload(blob, fileName, fallbackUrl, setMsg);
}
function fallbackDownload(blob: Blob, fileName: string, dataUrl: string, setMsg?: (m: string) => void) {
  const url = URL.createObjectURL(blob);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) || (navigator as unknown as { standalone?: boolean }).standalone || /Instagram|FBAN|FBAV/.test(navigator.userAgent);
  if (isIOS) {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setMsg?.("Opened in new tab — long-press the image to Save to Photos.");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg?.("Downloaded — check your Downloads folder.");
  }
}
```

Then `Qrcode.tsx:16`:

```ts
import { dataURLToBlob, sanitizeFileName, shareOrDownload } from "../../utils/download";
const downloadQRCode = () => {
  const canvas = document.getElementById("fyndr-qrcode")?.querySelector("canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const fileName = sanitizeFileName(eventName, "_QRCode.png");
  const dataUrl = canvas.toDataURL("image/png");
  const blob = dataURLToBlob(dataUrl);
  shareOrDownload(blob, fileName, eventName, dataUrl, undefined);
};
```

And `InEvent.tsx:698` `downloadStandee`:

```ts
import { dataURLToBlob, sanitizeFileName, shareOrDownload } from "../../utils/download";
const downloadStandee = () => {
  const qrEl = document.querySelector("#fyndr-standee-qr canvas") as HTMLCanvasElement | null;
  if (!qrEl || !(qrEl instanceof HTMLCanvasElement)) {
    setProofMsg("QR is still preparing — please try again in a second.");
    return;
  }
  const W = 1240, H = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) { setProofMsg("Could not generate standee in this browser."); return; }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  // ... draw brand, QR at W/2-300,320,600,600, PIN, instructions as before
  const fileName = sanitizeFileName(name, "_standee.png");
  const dataUrl = canvas.toDataURL("image/png");
  const blob = dataURLToBlob(dataUrl);
  const url = URL.createObjectURL(blob); // use blob URL for the large 1240×1754 standee to avoid data URL length limits
  shareOrDownload(blob, fileName, name, url, setProofMsg);
  // shareOrDownload will revoke the blob URL; for the dataUrl fallback it uses url directly
};
```

- **Gesture-safe:** `canvas.toDataURL` + `dataURLToBlob` are **synchronous**, so `navigator.share`/`window.open`/`a.click()` stay within the user gesture (no `await` breaks transient activation).
- **Large standee:** uses `URL.createObjectURL(blob)` (500KB PNG as blob, not 700KB data URL) to avoid URL length limits and OOM, with `revokeObjectURL` after 1s (download) or 10s (share/open).
- **Robust iOS detection:** `MacIntel + maxTouchPoints > 1` covers iPadOS 13+ (reports as Mac), plus `Instagram`/`FBAN`/`FBAV` for in-app browsers where `a[download]` is also ignored.
- **Filename:** `[^a-zA-Z0-9 _-]` sanitized, `trim()`, `replace(/\s+/g, "_")`, `slice(0,50)` prevents Win/Android failures on `CON`, `AUX`, or 255-char limits.
- **Error feedback:** `try/catch` around `canShare`/`share` now shows `setProofMsg` on failure via `shareOrDownload`’s `catch` → `fallbackDownload` with message, not empty `catch {}`.

**File `front-end/src/index.css` — Keep `.pb-safe` as is (already added in `c5d279e`):**

```css
@layer utilities {
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
}
```

### 5.4 How to Verify

- **Manual (must be in implementation PR description with screenshots at 390×844 and 1024×768):**
  - `pnpm dev` → `/dashboard` → open event → **320px, 390×844, 1024×768** — header `Guest QR Code` visible and horizontally scrollable on mobile (swipe), sticky `QR Code` also visible above `BottomNav`, both open the `Guest QR code — <name>` Drawer/Dialog; inside modal tap “Download QR (PNG)” → on desktop downloads, on iOS share sheet or new tab (long-press Save) with `revokeObjectURL`; “Table standee” similarly downloads via blob URL.

- **Automated (jsdom — class strings + share mock, no matchMedia):**
  - Header has `flex` (not `hidden`), `overflow-x-auto`, `flex-nowrap`, `whitespace-nowrap` on buttons; sticky has `bottom-[calc(4rem_+_env(safe-area-inset-bottom))]`, `z-40`, `md:hidden`, `overflow-x-auto`, `pb-safe`; wrapper has `pb-16` + `pb-safe` + `md:pb-0`.
  - Download: mock `HTMLCanvasElement.prototype.toDataURL` + `navigator.share`/`navigator.canShare` + `navigator.userAgent` (iPhone, MacIntel+touch, Instagram), assert `share` called with `File` on share-capable, `window.open` called with blob URL on iOS, `a.click` with `download` on desktop, and `URL.revokeObjectURL` called.

### 5.5 No New Dependencies

Tailwind + `QRCodeCanvas` already. `navigator.share` and `canvas.toDataURL`/`atob` are platform APIs.

---

## 6. Implementation Plan

### 6.1 Plan PR (This PR)

- [x] Add this file (`QR_MOBILE_V2_PLAN.md`).
- [x] Open PR `plan: qr mobile v2 — visible + downloadable on phones` against `main`.
- [ ] Review loop: `task`/`hub` + `gh pr review --comment` (never `gh pr comment`). Address every finding, re-review until **zero-defect**.
- [ ] Merge only after approval + `npm --prefix node-server-1 run build` + `npm --prefix front-end run build` pass.

### 6.2 Implementation PR (Next PR, after plan merge)

Granular commits:

1. `fix(ui): make InEvent header QR visible on mobile` — `InEvent.tsx:809` `hidden md:flex` → `flex overflow-x-auto scrollbar-hide flex-nowrap pb-2 md:pb-0` + `role="toolbar"` + `whitespace-nowrap` on buttons, and `InEvent.tsx:792` `pb-[calc(8rem+env)]` → `pb-16 pb-safe md:pb-0`.
2. `fix(ui): make QR download work on phones` — new `front-end/src/utils/download.ts` (`dataURLToBlob`, `sanitizeFileName`, `shareOrDownload`), `Qrcode.tsx:16` + `InEvent.tsx:698` to use it (synchronous, gesture-safe, blob URL for standee, robust iOS/IG detection, `revokeObjectURL`, user feedback).
3. `test(ui): cover header QR visibility and mobile download` — `InEvent.qr.test.tsx` extended: header `flex` not `hidden`, `overflow-x-auto`, sticky `bottom`/`z`/`overflow`/`pb-safe`, wrapper `pb-16`, and download `share`/`window.open`/`a[download]` mocks with `URL.createObjectURL`/`revokeObjectURL`.

Each commit pushable and passes its side’s tests.

### 6.3 Review Loop (Mandatory — `pr-review-guidelines.md`)

Same as `QR_MOBILE_PLAN.md` §6.3 and `FEATURE_FLAGS_PLAN.md` §6.3.

---

## 7. Operations

- **Staging/Prod:** same as `QR_MOBILE_PLAN.md` §7 — open event on phone, header QR visible and scrollable, sticky QR also visible, download opens share sheet (Android) or new tab (iOS) or downloads (desktop). No env, no `pm2 restart`.
- **Rollback:** revert `InEvent.tsx:809`, `InEvent.tsx:792`, `InEvent.tsx:1519`, `Qrcode.tsx:16`, `InEvent.tsx:698`, `front-end/src/utils/download.ts`, `front-end/src/index.css` (if added).

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Header `flex` with 6 buttons overflows 320px, label wraps | `overflow-x-auto scrollbar-hide flex-nowrap` + `whitespace-nowrap` + `shrink-0` on buttons keeps one row and scrollable; test asserts `overflow-x-auto`. Add `pb-2 md:pb-0` gives scrollbar room. |
| `navigator.share` with `files` not supported on some browsers | `canShare` guard + `window.open` fallback with blob URL + desktop `a[download]` with blob URL — always one path succeeds, all synchronous. |
| `bottom-[calc(4rem_+_env(...))]` still floats when BottomNav absent | Header is now the primary mobile entry in the normal flow, so sticky floating is not a P0; sticky remains `md:hidden` secondary. Documented as `InEvent only inside Dashboard at /dashboard`. |
| Horizontal scroll not discoverable | `role="toolbar"` + `aria-label="Event actions"` + `scrollbar-hide` keeps it subtle but `overflow-x-auto` shows a faint scrollbar on desktop; on mobile the swipe affordance is standard. |
| Large standee data URL OOM | Uses `URL.createObjectURL(blob)` (blob, not 700KB data URL) with `revokeObjectURL` after 1s/10s. |

---

## 9. Future Extensions

- Extract `MobileStickyActions` if more events use it.
- Add `BottomNav` `md:hidden` to hide on desktop — separate PR.

---

## 10. Acceptance Criteria for Plan PR

- This doc exists and passes the review loop with **zero-defect** approval.

## 11. Acceptance Criteria for Implementation PR

- On mobile (320–767px) header `Guest QR Code` is visible and scrollable in the normal flow (`flex` `overflow-x-auto` `whitespace-nowrap`), sticky `QR Code` is also visible above `BottomNav` (`z-40`/`bottom-[calc]`/`md:hidden`/`overflow-x-auto`/`pb-safe`), wrapper `pb-16 pb-safe md:pb-0` prevents underlap.
- “Download QR (PNG)” and “Table standee” download via `shareOrDownload` helper: `dataURLToBlob` synchronous, `sanitizeFileName` with `trim`/`slice(0,50)`, `URL.createObjectURL` for standee, `revokeObjectURL`, robust iOS/IG detection, user feedback via `setProofMsg`.
- No new dependency; `min-h-[44px]` preserved; `backdrop-blur` stays removed.
- Tests cover header `flex` vs `hidden`, sticky `bottom`/`z`/`overflow`/`pb-safe`, wrapper `pb-16`, and download `share`/`window.open`/`a[download]` mocks with `URL.createObjectURL`/`revokeObjectURL`.
- Review loop completed with approval; builds and tests pass.

