# Fyndr — Upgrade Plan: Features, Reliability, Scale

> From working MVP (mock embeddings, single Oracle box, `pnpm dev`) → production SaaS that survives wedding season. Every item has a *why* and a *when not to*.

## Baseline (today, `0e178c5`)
- **Works:** Register → Create Event (PIN) → Upload → Flask mock `hash→512-d` → Mongo `photo.embedding String` + `eval` loop → Guest selfie `similarity 1.0` → Download. `pm2` 3 services, `ssh fyndr`, `cloud.md` vault.
- **Debt:** `face-api.js` 38MB removed but still in history before squash; `eval` brute O(N), sequential upload loop, `face-api.js` models deleted, `antd+bootstrap` mix, no queue, no CDN, no real `buffalo`, no payments, no tests, no observability.

## Pillars & Principles
1. **Guest p50 <500ms** > photographer ingest <40min 50k on CPU.
2. **$0 stays $0** until 10 paying photographers — add infra only when `queue wait >2h` or `p50 >700ms`.
3. **Delete before add:** 38MB models, `bootstrap`, `eval` gone before any new lib.
4. **One DB, one queue, one CDN** until proven.

---

## Phase 1 — Hardening (2 weeks, must)

| Upgrade | Why | How (lean) | Done when |
|---------|-----|------------|-----------|
| **Real embeddings `buffalo_s` CPU** | Mock `1.0` is demo-only, MR-ALL 89% vs 91% matters at 1.8 faces/photo | `onnxruntime` `buffalo_s` `det 320` on Oracle `4 OCPU`, keep mock fallback `HAS_INSIGHT` | `wedding.jpg` vs different person <0.3 |
| **FAISS per-event `IndexFlatIP`** | Brute `eval` 8s@50k → 18ms, no `VectorChord` cost | `faiss-cpu` `write_index` `/data/faiss/{event}.index`, `photo.embedding` file not `String` | `match_faces` 200k in <30ms |
| **pg-boss queue (PG, $0)** | 50k `for await axios` = timeout | `pg-boss` `publish('face', {eventId,photoId})` `retry 3` `jobId=hash` | 50k ZIP 6 concurrent presigned PUT, progress `3421/50000` |
| **R2 + Cloudflare CDN** | 3GB thumbs/event × egress $ | R2 10GB free + `cdn.fyndr.in` `immutable`, originals 7d delete on Oracle disk | `curl -I` `cf-cache-status: HIT` |
| **Presigned upload** | `multer disk` 50MB limit | `S3Client presign PUT` 6× `Promise.all` | 50k no `EADDRINUSE` |
| **.env + isVerified:true** | `535 BadCredentials` | already done, add `RESEND_API_KEY` free 3k/mo | Register no email block |

## Phase 2 — Reliability (3 weeks, SLOs)

| Upgrade | SLO | Implementation |
|---------|-----|----------------|
| **Backups** | RPO 24h, RTO 1h | `mongodump --archive | rclone copy drive:Fyndr/backups/` daily cron + `age` encrypt; `pm2 save` + `systemctl enable mongod` |
| **Retries & Idempotency** | 0 duplicate photos | `photo.hash+event` `UNIQUE`, `jobId=hash`, DLQ UI `12 failed → Retry`, `pm2 logs` → `sonner` toast |
| **Observability** | p95 visible | `prom-client` `/metrics` + `Grafana` free tier or `pm2 monit` + `LOG_LEVEL`, alert `queue >1000` |
| **Tests** | 1 happy path | `vitest` 1 e2e `register→upload→match` + `k6` 50k synthetic (already `LOCAL_SETUP.md` curl), not per-function suites |
| **CI** | `main` green | GitHub Actions `CI=false npm run build` + `mongosh ping` |

## Phase 3 — Awesome UI (2 weeks, Stripe/Linear)

- **Design tokens** already in `plot.md`: `ink 950`, `paper 0`, `accent #ff3b30`, `Instrument Sans+Inter`, `radius 12`.
- **Migrate** `front-end` → `web/` `Next.js 15 + Tailwind 4 + shadcn` (keep `src` while migrating). Delete `bootstrap` import, replace `antd Upload` with `shadcn Dropzone`, `Qrcode.js` → `ShareSheet` (240px QR, copy link, PIN toggle, expires).
- **Guest `/e/:token`** light, 1 purpose: big selfie drop + `mediapipe` 8KB wasm pre-check `No face/Two faces` before upload → masonry `3→4 cols` + `Download ZIP` sticky.
- **Dashboard** dark `EventCard` cover auto-picked largest face, `ProgressBar` shimmer, `⌘K` palette.

## Phase 4 — Features (MoSCoW)

**Must:**
- Stripe `checkout` + `webhook` plans (500 photos free, 5k ₹499, 50k ₹1999), `event.expiresAt` 90d.
- Photographer analytics: views/downloads per event, top photos.
- Guest `threshold` slider Strict/Balanced/Loose (0.42/0.34/0.30).

**Should:**
- Real `buffalo_m` GPU spot `g4dn.xlarge $0.35/h` Sat nights only (auto scale on `pg-boss` depth).
- HDBSCAN `tag-people` offline (not on critical path).

**Could:**
- Regional `eu` bucket, `pgcrypto` per-photographer KMS.
- ZIP streaming from R2, not via API.

**Won't (until 100 photographers):**
- Qdrant/Milvus, Kafka, K8s, `VectorChord`, video transcoding, CLIP, mobile apps.

## Phase 5 — Scale Triggers (when to pay)

| Metric | Free holds until | Pay trigger → what |
|--------|------------------|--------------------|
| Queue wait Sat 6pm | <2h on 4 OCPU | `g4dn spot` 4h = $1.40 |
| Search p95 | <700ms FAISS 200k | `pgvector HNSW ef=64` |
| R2 10GB | 8×5k events | B2 $6/TB |
| PG 0.5GB | 250k faces | Self-host PG on Oracle (already) |

## Timeline

- **W1-2:** Phase1 hardening + `pnpm dev` → single command ✅ (done)
- **W3-5:** Phase2 reliability + backups + k6 50k
- **W6-7:** Phase3 Next+shadcn UI + ShareSheet
- **W8-10:** Phase4 Stripe + analytics
- **Ongoing:** Phase5 scale on metric, not calendar.

## How we prove it

- `faces/sec/core` (buffalo_s 320) >8
- `ingest 50k p95` <40min CPU / <5min 4×GPU
- `search p50/p95` <30ms/<80ms FAISS 200k
- `precision@0.34` >0.94 on wedding 1k labeled
- `cost/10k` < $0.20 CPU, egress $0 via CF

*One metric per phase, no new service without a graph that moved.*
