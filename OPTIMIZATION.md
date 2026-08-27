# Fyndr Image Processing & Face Pipeline — Technique Exploration & Net-Time Optimization
Date 2026-08-27 | A1.Flex 6 GB target | LFW bench 99.41% @342 ms

## 1. Which techniques to use

### Detector (single image, 640px preview)
| Model | WIDER hard | FDDB | 320 ms | MB | PROS | CONS |
|---|---|---|---|---|---|---|
| **SCRFD-320 (current, det_500m.onnx 2.5 MB)** | 90.2% | 96.1% | **18 lit / 180 meas** | 2.5+13.6=16 active | balanced, 500 MFlops, NMS, `BENCHMARK.md:193` | Python overhead 6× |
| YuNet 320 (OpenCV 0.3 MB) | 88.0% | 95.2% | **8** | 0.3 | fastest, int8, `BENCHMARK.md:223` | -2 pp recall tiny faces |
| RetinaFace R50 | 91.4% | 96.9% | 35 | 30 | best landmarks | 12× size |
| MTCNN | 85% | 95.0% | 45 | 2 | classic | cascaded, slow |
| YOLO5Face 320 | 90.5% | 95.8% | 15 | 10 | YOLO | 10 MB |

**Keep SCRFD-320** for 6 GB — 18 ms lit vs YuNet 8 ms not worth 2 pp loss on tiny wedding faces. Filter `score<0.6`/`size<45px`/`blur<80` drops 25% before embed (`ML_MODEL.md:1`).

### Recognizer (112×112 aligned crop → 512-d L2)
| Model | LFW 6k | dim | ms | MB | Train |
|---|---|---|---|---|---|
| **w600k_mbf (current, MobileFaceNet, buffalo_s)** | 99.78% lit / 99.41% meas | 512 | 35 lit / 210 meas | 13.6 | WebFace600K |
| SFace 128 | 99.60% | 128 | 12 | 6 | WebFace | edge, 4 pp faster |
| ArcFace R100 | 99.82% | 512 | 50 | 45 | MS1MV2 | 120 MB |
| AdaFace/MagFace R100 | **99.83% best** | 512 | 50 | 45 | WebFace12M | 120 MB |

Gap 0.05 pp = 3 errors/6k. **Keep w600k_mbf** on 6 GB — R100 needs 800 MB RAM vs 400 MB, `buffalo_l.zip` 281 MB download. Upgrade only if queue >2 h.

### Alignment & Quality Gates (before embed — saves 30%)
`det_500m` → 5 landmarks → `cv2.estimateAffine` → 112×112, `mean 127.5 std 128`. Then: `det_score<0.6` drop, `min(w,h)<45` drop, `Laplacian var<80` blur drop, `yaw>30`/`pitch>25` optional. Re-rank `0.7*cos+0.2*det+0.1*size/2048`, dedup `photo_id` keep max, threshold slider `Strict 0.42 / Balanced 0.34 / Loose 0.30`.

---

## 2. How images should be processed

```mermaid
flowchart LR
    A[Phone 45MP 8 MB JPEG] --> B{presign?}
    B -- R2 presign 3600s --> B1[PUT s3.direct 300 KB]
    B -- Node multer --> C[Node /photo pLimit]
    C --> D[libvips/sharp 640px preview 300 KB]
    D --> E[SHA256 hash stream]
    E --> F{Photo.findOne event,hash?}
    F -- hit --> G[dedup 207 + markDone]
    F -- miss --> H[enqueue FyndrJob + photoId=ObjectId]
    H --> I[FormData image+event_id+photoId → Flask /get_embedding]
    I --> J[Flask: cv2.imread → FaceAnalysis.get 320 → align 112 → w600k_mbf → L2]
    J --> K[faiss_store.add npy+index atomic]
    K --> L[Photo.save {name, event_id, hash, embedding:JSON, status:done}]
    L --> M[markDone + FAISS searchable 5 ms]
```

**Key:** Preview `libvips` 10 ms, hash `createReadStream` streaming (not `readFileSync`), `pLimit(2)` for 6 GB (was 6), `event_id` validate + `Photo` unique `{event_id,hash}` (not global). Single `axios` with `photoId` pre-generated — old double `get_embedding` duplicated FAISS.

**Formats:** Keep original JPEG in `node-server-1/uploads/{Date.now()}-{originalname}` for `express.static`, serve via `R2` presign if `R2_ENDPOINT` set. Store WebP thumbnail 320px for gallery (not yet, add `sharp`).

---

## 3. What data to store

```js
Photo { _id, name, event_id: String indexed, upload_by, embedding: String JSON 512, hash: String, status: queued|done|failed, timestamps:createdAt, index: {event_id,hash} unique sparse + {event_id,createdAt} }
Event { _id, event_name, pin, created_id, event_photo, expiresAt: +90d, status: active|expired|deleted, timestamps }
FyndrJob { event_id, photo_hash, photo_name, status: queued|processing|done|failed, attempts, lastError, timestamps, index: {event_id,photo_hash} unique }
FAISS: /tmp/fyndr_faiss/{sanitizedEvent}.index (FlatIP) + {sanitizedEvent}.npy (source of truth 39 MB/20k) + {sanitizedEvent}.meta.json [{photo_id,id}] atomic via `os.replace`
```

**Current:** `embedding` String `JSON.stringify(embedding)` 2 kB/photo → 100 MB/50k (fine). Future: `Binary` or quantized int8 → 50 MB/50k. Keep `hash` for dedup, `status` for DLQ.

**Do not store:** `1k3d68.onnx` 143 MB, `2d106det`, `genderage` — pruned.

---

## 4. How faces are extracted & matched for the first image

**Upload first photo** `POST /photo` `upload.array('name',100)` with `event_id`, 1 JPEG 640px:

1. **Hash** streaming `sha256` → `hash`.
2. **Dedup** `Photo.findOne({event_id,hash})` miss (first) → `enqueue(event_id,hash,filename)` → `Job {queued}`.
3. **Pre-generate** `photoId = ObjectId()` → `FormData(image stream, event_id, photoId)` → `axios POST http://127.0.0.1:5001/get_embedding` (30 s timeout, 15 MB limit).
4. **Flask `app.py:200` `/get_embedding`:** `load_image_from_bytes` (PIL) → `app_insight.get(img)` `det_size 320` → largest face `embedding / norm` → `faiss_add(event_id, photoId, embedding)` (validate 512-d, `npy`+`index`, dedup `photo_id`), return `{embedding}`.
5. **Node saves** `Photo({_id: photoId, name, event_id, embedding: JSON.stringify, hash, status:done})` → `markDone(event_id,hash)` → keep file in `uploads/`.
6. **Search:** Guest selfie `POST /match_faces` `image+event_id+threshold 0.34` → `app_insight.get` → query 512 → `faiss_search(event_id, query, k=48, thr 0.34)` (exact FlatIP, 9.65 ms/20k numpy or 1.2 ms FAISS) → map `photo_id` → `Photo.findOne({_id: pid})` → `[{id,name,similarity}]` `sims_mean 0.617 vs -0.006` gap 0.62. First photo now searchable: 1 vector index, 1 `Photo`.

**Cold start:** `ntotal=1`, `stats()` returns 1. No warm-up. If `HAS_INSIGHT=False` (Oracle aarch64 missing wheel), `mock_embedding` `md5→seed→512` gives `sims 0.001 vs 0.000` → Top48 random, `BENCHMARK.md:4.1` 47% accuracy — must guard `if not HAS_INSIGHT: 400`.

---

## 5. Net total time — keep low for *new photo → searchable*, not per-step

### Bottleneck per photo (measured 342 ms `benchmark/run_lfw.py:81` vs lit 55 ms):
`load 15 + detect 180 + align 5 + embed 210 + norm 2 + faiss add 5 + Photo.save 10 + markDone 5 = 432 ms`. Lit `18+5+35=58` + `io_binding` + `cv2` contiguous → 55 ms.

**50k wedding:**
- Single core 0.432 s ×50k = 21,600 s = 6 h wall.
- `pLimit(6)` ideal 55 ms → 27 min wall (`BENCHMARK.md:5.3`), measured 402 ms → 55 min/6c, 2.8 h/2c on 6 GB.
- Queue `FyndrJob` `processing` 3 retries keeps net searchable despite 5% no-face.

**Do not optimize step alone — optimize net:**

| Technique | Step saved | Net saved (50k/6c) | 6 GB | Impl |
|---|---|---|---|---|
| **R2 presign `POST /presign` 3600s** (`utils/r2.js`) | Node BW 0 ms (direct S3 PUT) | 10 min BW | yes | `getSignedUrl` `PutObjectCommand`, allowlist `image/jpeg|png|webp`, key validate `..` |
| **Preview 640px `sharp` wasm** | 10 ms vs 45MP | 10 min | yes | `sharp` before hash |
| **Hash stream** (`createReadStream` not `readFileSync`) | 20 ms block | 16 min event-loop | yes | fixed `index.js:344` |
| **pLimit 2 not 6** on 6 GB | OOM 0 vs 6 | 2× wall but stable | yes | `pLimit(2)` |
| **Single ML call with `photoId`** (current) | 200 ms double | 2.7 h | yes | done `index.js:356` |
| **`onnxruntime` io_binding + batch 8** | 342→90 ms | 40 min | yes | `session.io_binding()` |
| **Prune `1k3d68` 143 MB** | load 200 ms | 2 min cold | yes | `rm` unused |
| **FAISS `npy`+`index` atomic, per-event shard** | rebuild 0 vs 96 ms | 1 min search | yes | `faiss_store.py:30` |
| **INT8 / HNSW** (future) | 9.65→0.6 ms/query | 0.5 min | no | `faiss.IndexHNSW` |
| **Queue `claimNext` + DLQ `listFailed/retry`** | 0 duplicated | 5 min retries | yes | `mongoQueue.js:20` |

**Recommended 6 GB net pipeline (55→27 min after opt):**
1. Client `GET /presign` → `PUT` 640px directly to R2 (bypass Node).
2. Node receives `key` → `enqueue` + streaming `sha256` → `Photo` `{queued}` immediate 207.
3. Worker `pLimit(2)` batch 8 `FormData` → Flask 320 → `faiss_add` `npy`+`index` atomic → `Photo` `done` + `markDone`.
4. `GET /queue/stats?event_id` polls, `GET /match_faces` 1.2 ms FAISS.

**First-image net:** `POST /photo` 1 file → 432 ms to searchable (vs 86 s for 200 `benchmark/run_lfw.py:81`). Keep sync for <100 photos (event creation), async for 50k via `enqueue` + `claimNext`.

---

## 6. Options matrix for 6 GB

| Option | Detector | Recognizer | Acc lit | ms meas | RAM | Disk | $0? | When |
|---|---|---|---|---|---|---|---|
| **A current** | SCRFD-320 | w600k_mbf | 99.78% | 342 | 400 MB | 16 MB | yes | **default A1.Flex 6 GB** |
| B fast | YuNet 0.3 MB | SFace 6 MB | 99.60% | 90 | 200 MB | 6 MB | yes | QR kiosk |
| C best | SCRFD-640 | AdaFace R100 | 99.83% | 600 | 800 MB | 120 MB | yes but 8 h/50k/1c | >$100 wedding |
| D mock | — | hash | 47% | 0.4 | 50 MB | 0 | yes | tests only |

**Keep A**, fix `io_binding` before chasing C (+0.05 pp). B for browser WASM.

Repro: `python benchmark/download_lfw.py` (180 MB) + `python benchmark/run_lfw.py` (200 pairs 3 min, ` --full` 15 min) → `benchmark/results.json` + `BENCHMARK.md`.
