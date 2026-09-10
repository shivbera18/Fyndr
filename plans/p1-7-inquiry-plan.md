# P1-7 Booking-Inquiry CTA — plan Rev 1 (approved)

> Status: Rev 1 addresses all 11 adversarial findings (analytics registration, PII sanitize, short booking dedupe, legacy Mongo kind query, Collect_event parity, gate satisfaction, CSV append order, separate rate limits, index cleanup, 44px tap targets).
> Parent: `IMPROVEMENTS.md` §P1-7.

## 0. Problem
Guest pages show a WhatsApp-only "Book Studio ↗" link (`CameraCaptureWithMask.tsx:555-564`,
`Collect_event.tsx:149-153`). Guests without WhatsApp (or who won't leave the gallery) have no
inquiry path, and photographers get no structured record — WhatsApp chats are not in the
leads CSV, so booking interest never enters the funnel P0-3 built.

## 1. Goal
A guest taps "Book Studio" on `/collect/:eventId` or `/camera` → submits name + phone + optional
message → photographer receives it in the existing event leads CSV (`InEvent.tsx`) alongside gate leads.

## 2. Scope & Implementation Details

### 2.1 Backend: Lead model (`node-server-1/src/models/Lead.ts`)
- Add fields:
  - `kind`: `{ type: String, enum: ["gate", "booking"], default: "gate" }` (NO separate index — compound `{ event_id: 1, createdAt: -1 }` covers scans).
  - `message`: `{ type: String, trim: true, maxlength: 500 }`.

### 2.2 Backend: Leads Route (`node-server-1/src/routes/leads.ts`)
- `POST /leads`:
  - Validate optional `kind` (`"gate"` default, `"booking"` allowed, other values → 400).
  - Validate optional `message` (trim, string, ≤500 chars).
  - Separate hourly caps: 200/hr for gate, 50/hr for booking (`kind: "booking"`) so booking floods cannot DOS photo downloads.
  - Dedupe logic:
    - For `kind === "gate"`: 24-hour dedupe against `{ event_id, phone: cleanPhone, kind: { $in: ["gate", null] }, createdAt: { $gt: 24h } }`.
    - For `kind === "booking"`: 2-minute debounce against `{ event_id, phone: cleanPhone, kind: "booking", createdAt: { $gt: 2min } }` (prevents double-clicks while preserving legitimate follow-up inquiries).
  - **Sanitize response (Fix IDOR/PII leak)**:
    - 200 Dedupe: `res.status(200).send({ ok: true, deduped: true })` (NO lead document returned).
    - 201 Created: `res.status(201).send({ ok: true, deduped: false })`.
- `POST /events/:id/leads`:
  - Add `kind message` to the `.select()`.

### 2.3 Backend: Analytics (`node-server-1/src/routes/analytics.ts` & `node-server-1/src/models/AnalyticsEvent.ts`)
- Add `"booking_inquiry"` to `ALLOWED_TYPES` set in `analytics.ts`.
- Add `"booking_inquiry"` to `AnalyticsEvent.ts` schema enum array.

### 2.4 Frontend: Shared `InquiryModal` (`front-end/src/component/collect_images/InquiryModal.tsx`)
- Props: `open: boolean`, `onOpenChange: (v: boolean) => void`, `eventId: string`, `studioName: string`, `initialName?: string`, `initialPhone?: string`.
- Initialize name/phone from props or `sessionStorage` (`fyndr_guest_name`, `fyndr_guest_phone`).
- Textarea for message (optional, max 500 chars, counter).
- On success:
  - Set `sessionStorage.setItem("fy-lead-" + eventId, "1")` so high-intent booking guests are not re-prompted by the download gate.
  - Save contact to `sessionStorage` (`fyndr_guest_name`, `fyndr_guest_phone`).
  - Fire `trackEvent(eventId, "booking_inquiry")`.
  - Show success state with WhatsApp fallback link ("Or chat directly on WhatsApp ↗").

### 2.5 Frontend: Mount Points (`CameraCaptureWithMask.tsx` & `Collect_event.tsx`)
- Replace the anchor-based "Book Studio ↗" with a `<button type="button">` with `min-h-[44px]` tap target.
- Clicking opens `InquiryModal`.

### 2.6 Frontend: Owner CSV Export (`InEvent.tsx`)
- Header: append to the end: `name,phone,photos_found,captured_at,kind,message` (keeps backward compatibility for existing CSV parsers).
- In `csvCell`: harden formula injection guard against multiline messages (flatten newlines `s.replace(/[\r\n]+/g, ' ')` before formula escape `/^[=+\-@]/.test(s)`).
- Toast: show inquiry count if any (`Downloaded N leads (including M booking inquiries)`).

## 3. Edge cases
- Pre-deployment gate leads: matched cleanly via `{ $in: ["gate", null] }`.
- Guests entering formulas: stripped/escaped in CSV cell formatter.
- Attacker attempting PII enumeration via phone numbers: response only returns `{ ok: true, deduped: true }` without personal info.

## 4. Verification
- Backend: test leads validation, 2-minute booking dedupe, PII response sanitization, analytics event tracking.
- Frontend: test modal rendering, submission with name/phone/message, lead gate session storage set, and CSV export format.
- Build: `npm run build` green on both backend and frontend.
