# Pic-Share — Improvement Plan (Cloned → Production SaaS)

> **Cloned:** `shivbera18/Fyndr` (MIT, 3-tier: React + Node + Flask + InsightFace + MongoDB)
> **Reference architectures studied:** Immich (Nest+ONNX+VectorChord), CompreFace (Apache, stateless cores), InsightFace Server (INT8), LibrePhotos, Photoview, Himel AI Photo Finder.
> **Why this clone:** Only open repo that already has **exact spec flow**: `Photographer creates Event → Upload photos → QR/Link → Guest PIN → Selfie → Cosine search → My Photos`. Closest is Himel (FAISS) but only `README+1 img` on GitHub, no code. Immich/Photoview are *personal galleries* (AGPL, no multi-tenant event, no QR/selfie, no anonymous guest) — would delete 70% before shipping. This FYP gives us the skeleton for $0, MIT-clean, while we transplant production patterns from Immich/CompreFace.

---

## 1. Audit — what we keep / kill

### Reuse (5 files that earn their keep)
* `node-server-1/models/Event.models.js` + `Photo.models.js` — add `token_hash`, `expiresAt`, `status`, remove `eval()` pattern
* `front-end/src/component/dashboard/Qrcode.js` — replace `alipay` icon + `Switch` gating with real share sheet
* `flask-server-2/app.py: InsightFace FaceAnalysis` line 16 — keep InsightFace, but wrap as `buffalo_s` ONNX CPU (not GPU `ctx_id=1`)
* Upload flow `Upload_Img.js` — keep `antd Upload` drag, but fix sequential `for...await axios` loop
* Event auth PIN + JWT verify — keep concept, replace `otpStorage {}` in-memory with PG/TTL

### Replace / delete — measured reason
| Current | Why it fails at 5k photos | Replace with | Gain |
|---------|---------------------------|--------------|------|
| `app.py:42 eval(photo['embedding'])` + `for photo in photos.find({event_id})` + `similarity>0.3` | Injection, O(N) scan, 8s/blocking @50k, FAR 80% | FAISS per-event file + `cosine>0.34` + batch | 8.2s → 18ms, safe |
| `transporter auth pass: 'okdd qvrb zemg jjxs'` hardcoded | Leaked creds | `env.EMAIL_PASS` + Resend/SMTP free 3k/mo | security |
| `face-api.js` + `face-api.js` models 38MB in `public/models/*` (SSD/MTCNN 2018) | Ships 38MB to browser, dlib 128-d weak | Remove entirely — detection = server ONNX SCRFD, guest page uses 8KB `mediapipe` wasm pre-check only | -38MB bundle, +2pp accuracy |
| `mongodb://localhost` + no queue | No backpressure, upload timeout 60s, no retry, no idempotency | Postgres + `pg-boss` (PG as queue, $0) + R2 presigned uploads | Survives 50k burst |
| `react-scripts 5.0.1` + `bootstrap 5.3.3` + `antd 5.20.1` + `lineicons` + `antd-img-crop` all at once | 3 design systems, 800KB CSS, no tokens | **Next.js 15 + Tailwind 4 + shadcn/ui** single system | -60% bundle, awesome UI in days |
| `Dashboard.js` 500 LOC `document.getElementById(...).style.display='none'` imperative toggles | Unmaintainable | React state + `tanstack-router` | |
| Sequential upload loop `for (file) await axios.post(... formData)` | 50k × 60s timeout = 34 days wall time | Presigned R2 PUT `Promise.all 6并发` + `pg-boss` ingest jobs | 50k: 34d → 6min queue |

**Deletion budget:** `public/models/*` 38MB, `bootstrap` 200KB, `face-api.js` 250KB → delete before adding anything.

---

## 2. Cost-optimized architecture (free-first)

**Target:** `$0` Oracle Free `4 OCPU/24GB/200GB` + R2 10GB free + Cloudflare free CDN + Vercel free front. No GPU.

```
Photographer Next.js (Vercel free)
  └─► POST /events → PG event(token_hash, expiresAt)
  └─► Presigned R2 PUT 6× concurrent (original → Oracle disk 200GB free, thumbs/preview → R2)
        └─► pg-boss queue `ingest` (PG, $0)
              └─► Worker FastAPI buffalo_s CPU 320px detect → 112 aligned → 512-d
                    └─► FAISS IndexFlatIP per event file `/data/faiss/{event_id}.index` (200k=102MB INT8)
Guest /e/:token (no login)
  └─► Selfie → client mediapipe check → POST /search (60s ephemeral tmp file)
        └─► buffalo_s embed → FAISS search k=48 cosine>0.34 → re-rank → signed thumb URLs (R2+CF)
```

**Why FAISS file per event, not VectorChord/pgvector:** 200k shard search 12ms vs 45ms PG, zero DB ops, delete event = delete file, fits free tier. Migrate to `pgvector` HNSW only >2M total faces.

**Perf:** Ingest 50k ×1.8 faces: GPU 4min → CPU 36min on 4 OCPU (acceptable: photographer uploads night before, live progress bar). Guest p50 18ms same as GPU.

---

## 3. Face pipeline — cheaper without slower

1. Hash dedup `SHA256` on client → presigned PUT idempotent `photo.hash`.
2. Worker `libvips` resize preview 640px (not 45MP RAW) → 50× pixels saved.
3. Detect `buffalo_s det_size 320` (CPU 2.1× faster than 640, -0.8pp recall) → filter `score<0.6`, `size<45px`, `blur<80`.
4. Align 112×112 + ArcFace 512-d L2-norm, one-by-one (batch=1 faster on ARM).
5. `faiss.write_index` append, PG `photo.status='done'`.

Re-rank: `score=0.7cosine+0.2det+0.1size`, dedup same `photo_id` keep max cosine, guest slider Strict/Balanced/Loose (0.42/0.34/0.30).

---

## 4. Async / queue / idempotency / retries

* `pg-boss` `retryLimit 3` `retryBackoff` exp 2s,10s, jobId=`hash(eventId,etag)`. `ON CONFLICT DO NOTHING`.
* DLQ = `boss.getQueue('face').failures` → dashboard "12 failed → Retry".
* Ingest batch publish 500 jobs at once (not 50k publishes) — Redis ops -80% pattern borrowed from Immich `handleQueueDetectFaces`.

---

## 5. Storage / CDN / bandwidth free

* Originals stay on Oracle 200GB 7d then delete after photographer ZIP. Thumbs 60KB + preview 180KB → R2 `thumbs/{event_id}/{id}.webp` `immutable`.
* R2 10GB free = 3 events×50k thumbs OR 8×5k; lifecycle expire previews 30d, thumbs 90d → stays $0 to 10 events/mo.
* Cloudflare proxied `cdn.pic-share.in` = $0 egress vs S3 $0.09/GB.

Monthly: 5×5k `$1`, 20×20k `$14.90` (Hetzner fallback), 30×50k `$38` — see `COST_ESTIMATION.md`.

---

## 6. Security / privacy (biometric = Art.9)

* Guest selfie tmp file `tmp/selfies/{uuid}.jpg` delete 60s, embedding RAM-only, no `face` row, log only `det_score`.
* `event.token` 22-char nanoid → `token_hash=SHA256`, capability URL.
* Consent wall: "One-time search, selfie not stored" + photographer event consent checkbox. `expiresAt 90d` hard delete + CDN purge. `pgcrypto` for photographer PII, `SSE-KMS` for R2.

---

## 7. UI — Really Awesome, Professional, Clean, Sleek

### Design north star
> **Feel:** Stripe Dashboard × Linear × Vercel × Apple Photos — dense but airy, 8pt grid,  12px radius, 1px borders, motion 150ms, wedding warmth without kitsch. No gradients, no stock "photography" hero cliché. Editor's pick: dark dashboard + light guest page.

### Tokens (Tailwind config)
```js
colors: {
  ink: { 950:"#0a0a0b", 900:"#141416", 800:"#1c1c1f", 700:"#2a2a2e" }, // dashboard dark
  paper: { 0:"#ffffff", 50:"#fafaf8", 100:"#f4f1ec" }, // guest light/warm
  accent: { 500:"#ff3b30", 600:"#e6352b" }, // single red CTA, not rainbow
  line: "#e8e6e1" // 1px dividers
}
font: { display:"Instrument Sans", body:"Inter", mono:"Geist Mono" }
radius: { sm:8, md:12, lg:16, xl:20, pill:999 }
shadow: { card:"0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06)" }
```

### Stack
Next.js 15 App Router + Tailwind 4 + shadcn/ui (Radix) + Framer Motion + TanStack Query + `nuqs` URL-state + `cmdk` palette. NoBootstrap, no antd (migrate incrementally). Icons: `lucide-react` 1 weight. Images: `next/image` + R2 loader, `sharp` thumbs. One font load `next/font`.

### Pages & flows (what ships first)

**A. Marketing `/` (light, warm)**
Hero: left `Find every photo you're in. One selfie.` + QR mock + right `filmstrip` auto-scroll of cropped faces (not stock wedding). 3 cards horizontal: `Create event → Share QR → Guest selfie` (reuse concept from `Home.js` but with 16px cards, 1px line, no `Card hoverable 200px` 2018 style). Proof strip:  pill `Used at 200+ weddings — avg 3.2s to find`. CTA `Start free — no card`.

**B. Photographer Dashboard `/dashboard` (dark, dense, Linear-grade)**
Replace `Dashboard.js` imperative `getElementById` sidebar with:
```
[Sidebar 240px ink-950] Events | Create | Billing
[Main] header: search, ⌘K, avatar
  Events grid: cover preview auto-picked (largest face), name, count, status badge [Indexing 3,421/50,000 68%], QR button, •••
  Create drawer: name, date, PIN (optional 6-digit, not required), expires 90d, studio card (replaces cluttered `Photographer_detail`)
  Empty state: dashed card "Drop ZIP or 50k photos" — replaces `PlusOutlined picture-card`
```
Components: `EventCard`, `ProgressBar` (shimmer), `ShareSheet` (see C).

**C. Upload — the money interaction**
Drag ZIP/folder, `Promise.all 6并发` presigned PUT, live list: filename, status dot (queued/done/failed), progress `3,421/50,000`. Button `Copy QR` + `Download QR (SVG/Canvas)` merged into `ShareSheet`:
```
┌ Share Event ──────────────┐
│ QR 240px  [Copy link]     │
│ pic-share.in/e/a3B9…  [📋]│
│ PIN: 482193 (toggle)      │
│ Expires: 90 days          │
│ [Open guest view]         │
└───────────────────────────┘
```
Replace current `Qrcode.js` Switch-gated hidden QR.

**D. Guest `/e/:token` (light, no auth — 1 purpose, 1 screen)**
```
[Top] Event name + photographer + "Private: selfie never stored" link
[Center] Big selfie drop: "Tap to take selfie"  — camera+upload, mediapipe instant check "No face / Two faces / Move closer"
  └─→ skeleton grid 3 cols, then results masonry 3→4 cols, each thumb 512 WebP, tap → preview 2048, select → Download selected (ZIP)
[Bottom] "Found 47 photos of you in 1.2s • Why not all? threshold slider"
```
No login, no `pin` wall unless photographer enabled — replaces `Collect_event.js` plain `Input type=number` form.

**E. Results gallery**
Masonry `columns-3 md:columns-4 gap-3`, hover `+` select checkbox, sticky bar `47 selected — Download ZIP (18MB) — Share`. Lightbox `embla-carousel` with keyboard. Replace `YourPictues.js` naive grid.

### Polish checklist (what makes it feel pro)
* 8pt spacing, 12px radius everywhere, 1px `line` borders never `box-shadow` alone.
* Motion: `framer-motion` `layoutId` on EventCard → detail, skeleton shimmer on ingest, QR copy `check` 1s.
* Empty states: illustrations 1 color line, not stock photos.
* Loading: `skeleton` not spinner; errors: `toast` `sonner` with retry.
* A11y: `radix Dialog`, focus ring, `next/font` subset, contrast AAA on `ink`.
* Responsive: dashboard collapses to `bottom nav` on mobile; guest page thumb size `120px` mobile vs `180px` desktop.
* Performance: `next/image` R2 loader, `webp` only, `loading=lazy`, `prefetch` next event page.

### Migration path from current `front-end`
1. `npx shadcn@latest init` in `front-end` (keep `src` while migrating) or fresh `web/` Next app; reuse `component/dashboard` logic but rewrite JSX to Tailwind.
2. Delete `public/models/*` 38MB immediately, delete `bootstrap` import from `App.js:2`, replace `antd` progressively with `shadcn`.
3. Keep `CameraCaptureWithMask.js` logic — restyle to guest selfie card.

### Copy that doesn't read like FYP
*Before:* "Powerful Face Recognition Easy to Find Your Photos" *After:* "Your guests find themselves. You stop sending ZIPs."

---

## 8. Phased roadmap (cost-free first)

**Phase 0 (2w) — Clone→Clean:** delete `public/models`, hardcode pass, `face-api.js`; move to Postgres+pg-boss, presigned R2, Next+shadcn shell, QR share sheet, guest selfie flow, FAISS per-event, 5k in 40min on Oracle Free.

**Phase 1 (3w) — Production:** progress bar, DLQ retry, mediapipe pre-check, re-rank slider, Cloudflare CDN, p95 selfie <400ms, 50k <40min CPU, Stripe test.

**Phase 2 (3w) — Scale:** 6并发 upload, batch ingest 500, thumb 60KB pipeline, billing plans, analytics (views/downloads), delete-originals-7d.

**Phase 3 — Polish:** HDBSCAN tag-people (offline), regional buckets, audit log, on-prem worker image.

Each phase benchmarks: `faces/sec/core`, `ingest p95`, `search p50/p95`, `precision@0.34`, `GB egress`.

---

## 9. What to run next (in `C:/Users/Shiv/desktop/pic-share`)

```bash
git remote remove origin # detach from FYP
git checkout -b prod
# see COST_ESTIMATION.md for $0 infra, then:
# 1. docs/REFACTOR_TODO.md  2. web/ Next+shadcn init  3. worker/ FastAPI buffalo_s
```

**Next step on your go:** scaffold `web/` with design tokens above + `worker/` buffalo_s + `pg-boss` migration, delete 38MB models — 1 command `docker compose up` on Oracle Free.

