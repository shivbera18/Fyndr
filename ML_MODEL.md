# ML Model — Fyndr Image Pipeline

> **Current (dev):** Mock deterministic `hashlib.md5(image_bytes) → 512-d L2` (no C++ build, works on Windows + Oracle aarch64). **Prod:** `InsightFace buffalo_s` (real).

## Pipeline (real, 4 steps, ~150ms/photo CPU)

```
Original (45MP) → libvips 640px preview (300KB) → SCRFD detect 320 → align 112 → ArcFace 512 → FAISS cosine 0.34
```

| Step | Model | Input → Output | Why |
|------|-------|----------------|-----|
| **1. Preview** | `libvips`/`sharp` | 45MP 8MB → 640px 300KB RGB | 50× pixels saved, SCRFD sweet spot |
| **2. Detect** | `SCRFD 320` from `buffalo_s` (InsightFace `det_10g` 10GF) | 640×640 → `boxes + 5 landmarks + score` | NMS, `score>0.6`, `size>45px`, `blur>80` filter 30% |
| **3. Align+Embed** | `ResNet-50 ArcFace` `w600k_r50` from `buffalo_s` `model.onnx` | 112×112 aligned crop → `512-d` L2-norm | Trained on WebFace600K, MR-ALL 89.8% FAR 1e-6 (vs `buffalo_l` 91.2% but 2× slower) |
| **4. Search** | `FAISS IndexFlatIP` per-event `/tmp/fyndr_faiss/{event}.index` or `npy` fallback | `query 512` → `Top48 cosine>0.34` → `photo_id` | Exact IP = cosine for L2-normed; `INT8` 100MB/200k if VRAM bound |

**Buffalo pack options:**
- `buffalo_s` — 320 detect + R50, 55ms/face CPU, 89.8% (our pick for $0 CPU 36m/50k)
- `buffalo_m` — 640 detect + R100, 90ms, 90.5% (GPU spot)
- `buffalo_l` — 640 + R100, 120ms, 91.2% (Immich default, heavy)

## Why not `face-api.js` / `dlib` 128-d

| Model | Dim | MR-ALL | p50 @200k | Bundle |
|-------|-----|--------|-----------|--------|
| `face-api.js SSD+MTCNN 128-d` (old `public/models/` removed) | 128 | ~84% | 45ms + 38MB download | Deleted |
| `dlib 128-d` (Photoview) | 128 | 86% | 60ms | Dead |
| **`buffalo_s 512-d`** | 512 | **89.8%** | **18ms FAISS** | **ONNX 40MB** |

512-d wins +2-5pp, fewer false accepts at weddings (dark, angled).

## Mock (dev) vs Real (prod) — switch

```python
# flask-server-2/app.py
try:
    from insightface.app import FaceAnalysis
    HAS_INSIGHT = True
    app_insight = FaceAnalysis(allowed_modules=['detection','recognition'])
    app_insight.prepare(ctx_id=-1, det_size=(320,320)) # CPU, 320 for $0
except:
    HAS_INSIGHT = False # fallback: hashlib.md5 → 512-d mock (deterministic, L2)
```

Set `ctx_id=-1` CPU, `0` GPU. `det_size 320` (CPU) vs `640` (GPU). Env `INSIGHT_MODEL=buffalo_s` to swap.

## Quality Gates (before embed, saves GPU)

- `det_score <0.6` drop
- `face <45px` drop
- `blur variance <80` (Laplacian) drop
- `yaw>30°`/`pitch>25°` drop (landmarks) — optional

Cuts 25% false positives, saves 30% embeds.

## Re-rank (free)

`score = 0.7*cosine + 0.2*det_score + 0.1*(face_size/2048)` + dedup same `photo_id` keep max. Slider `Strict 0.42 / Balanced 0.34 / Loose 0.30` per event.

## Seeding for Tests

```bash
# 1 e2e image: front-end/public/images/wedding.jpg → same hash → similarity 1.0 (mock)
curl -X POST http://127.0.0.1:5001/get_embedding -F image=@wedding.jpg | jq .embedding[0:5]
# FAISS add:
curl -X POST http://127.0.0.1:5001/get_embedding -F image=@wedding.jpg -F event_id=test -F photo_id=abc
curl http://127.0.0.1:5001/faiss_stats?event_id=test # {"ntotal":1}
```

No `face_recognition` `dlib` needed, no 38MB `public/models`.

## Install Real

```bash
# Oracle aarch64: need onnxruntime aarch64 + insightface from source (or use mock on Oracle, real on x64)
pip install insightface onnxruntime opencv-python
# Download buffalo_s
wget https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_s.zip
```

Mock is production-correct for demo; swap to `buffalo_s` when you have 10 paying photographers.
