# Concerns — review-agent findings, triaged for personal-use Fyndr

Personal use, no adversarial traffic. Rule: fix what causes **data loss,
crashes, or silent wrong behavior** now. Everything that is only exploitable
by a deliberate attacker goes here for later. Nothing below is forgotten —
each item names the file:line and the trigger for fixing it.

## Fix now (correctness, not security)

These bite during normal personal use. All fixed on main.

- **Worker retry exhaustion before slow PUT lands** (`ingestWorker.ts:44-57`,
  `mongoQueue.ts:17-29`, `photos.ts:279-295`). `claimNext` burns an attempt
  per 2s tick; a 50MB direct PUT outlasts 3 claims → stub + G3 object deleted
  while bytes are still uploading. Fixed: young Jobs (<10min, both stubs
  absent) are skipped without consuming an attempt; `/photo/complete` revives
  a failed Job when bytes are present.
- **Stage trusts client hash, never re-verified** (`photos.ts:185-254`).
  A wrong hash (bug, retry, corrupt file) poisons dedupe silently. Fixed:
  worker re-hashes fetched bytes before `markDone`; mismatch fails the Job
  with `hash mismatch (claimed … got …)` instead of completing wrong.
- **Orphan Job + presigned key on non-11000 stub-save failure**
  (`photos.ts:268-270`). `markFailed` without stub cleanup leaves a Job that
  points at nothing. Fixed: one-line `Job.deleteOne` after `markFailed`.
- **`/complete` conflates missing vs outage** (`r2.ts:84-95`,
  `photos.ts:288-289`). Any throw → `{ok:false}` → client re-PUTs during an
  R2 outage. Fixed: `headObject` tri-state (`true`/`false`/`null`);
  `null` → 503, client falls back to multer instead of re-PUT looping.
  Also checks local temp now, so multer stubs stop false-negativing.
- **Falsy stage counted as success** (`Upload_Img.tsx:349`).
  `!stage || stage.duplicate` → phantom success on empty body. Fixed:
  only a real `duplicate:true` counts; falsy stage falls back to multer.
- **Gallery/delete silent failures** (`useEventPhotos.ts:57-72`,
  `InEvent.tsx:246-260`). No `res.ok` check, bare `catch{}` → 500 renders
  as an empty gallery / failed delete with zero feedback. Fixed: gallery
  surfaces `Gallery failed to load (HTTP …)` with Retry; delete toasts on
  failure instead of swallowing.
- **`getObjectBytes` unbounded, no timeout** (`r2.ts:66-81`). Multi-GB
  object OOMs the worker and pins the 2s poll. Fixed: 50MB guard (matches
  stage/multer caps) + `AbortSignal.timeout(30000)` like `putObjectBytes`.
- **`pollOnce` overlaps itself** (`ingestWorker.ts:44-49`). Bare 2s
  `setInterval`, no in-flight guard — slow ML stacks concurrent batches.
  Fixed: `inFlight` flag, tick skipped while a poll runs.
- **Multer `Date.now()` temp collisions** (`upload.ts:24-27`). 100-file
  batch in the same ms overwrites temps. Fixed: 6-hex random suffix.
- **Refresh token in URL** (`admin.ts:146`). GET-style revoke URL lands in
  server/proxy logs. Fixed: `axios.post(url, null, {params:{token}})`.
- **500s echo internals** (`admin.ts:98,122,135,155,165,182`,
  `ops.ts:32,48,63,81`). Raw `e.message`/stack to clients. Fixed: generic
  `internal error` client-side, detail stays in logs.

## Intentional — left as-is (fix if exposed to strangers)

- **No auth on `/admin/*` (`requireAdmin` dead, `app.ts:44`), open PII
  (`/admin/users`, `/admin/drive`, `/admin/queue`), destructive admin ops,
  G3 weight/unlink/balancing, `login-passthrough` Set-Cookie forward.**
  Personal single-operator instance; the admin page is the operator. Fix
  when multi-user or public: `router.use(requireAdmin)` + validate
  `userId` type + delete `login-passthrough`.
- **`DELETE /delete-image` has no ownership check** (`photos.ts:299-307`).
  Only the operator uses the dashboard. Fix when shared: require
  `created_id == owning Event.created_id`.
- **Generic `POST /presign` mints arbitrary keys** (`ops.ts:68-83`). No
  frontend caller (stage is the sole minter); harmless while the API is
  private. Fix when public: delete it or scope to validated `event_id` +
  server keygen.
- **`tokenFor` falls back to any photographer's Drive**
  (`driveStore.ts:68-101`) and **Drive OAuth takes raw `user_id`**
  (`drive.ts:37-147`). Convenient for one household; cross-writes only
  matter with untrusted users. Fix when shared: scope to
  `[created_id, uploadBy]`, derive identity from session, find-don't-ensure
  in delete paths.
- **`syncDeleteEventFromDrive` ensure-then-delete**
  (`driveStore.ts:245-246`). Same single-operator reasoning. Fix with #8:
  find-only in delete path.
- **Drive folders keyed by mutable name, `driveFileId` keyed by filename,
  legacy parent-less delete** (`driveStore.ts:116-218`). Rename/collision
  edge cases in a personal Drive. Fix on real collision: include
  `event_id`, pass root parent.
- **OAuth nonce never consumed, `JWT_SECRET` dev-default, missing
  `DRIVE_TOKEN_KEY` crashes callback outside try** (`drive.ts:45-71`,
  `config.ts:13`, `driveCrypto.ts:6`). Single-user, short-lived states.
  Fix when public: single-use nonce store, fail-closed secrets, startup
  validation.
- **Session password in `sessionStorage`, optimistic authed, no rate
  limit.** Brute force is irrelevant while the instance is private. Fix
  when exposed: validate-then-set, HttpOnly session, rate-limit the gate.
- **`/download` buffers whole object, counts before bytes confirmed, no
  auth** (`photos.ts:410-430`). Fine at personal scale. Fix under load:
  stream/range-proxy, verify-then-count, owner/PIN gate.
- **Cosmetic**: progress undercount/backward step (`Upload_Img.tsx`),
  `207` retry re-sends stored files, `h-7/h-8` tap targets, token
  refresh per photo (no cache), Drive re-link token sprawl, hardcoded
  `drive.file` scope note.
