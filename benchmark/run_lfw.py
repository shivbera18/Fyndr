#!/usr/bin/env python3
"""
Fyndr LFW Benchmark — compares current pipeline (buffalo_s 320 / mock) vs SOTA.
- Parses LFW 6000 pairs (facenet pairs.txt)
- Measures accuracy via 10-fold cross-validation (threshold tuning per fold)
- Measures latency (detect+embed) on CPU, FAISS search, memory
- Outputs benchmark/results.json
"""
import os, sys, time, json, hashlib, random, pathlib, itertools
from collections import defaultdict

DATA_DIR = pathlib.Path(__file__).parent / "data"
LFW_DIR = DATA_DIR / "lfw"
PAIRS_TXT = DATA_DIR / "pairs.txt"
RESULTS_JSON = pathlib.Path(__file__).parent / "results.json"

# try insightface
try:
    from insightface.app import FaceAnalysis
    HAS_INSIGHT = True
except Exception as e:
    print(f"[info] insightface not available {e}")
    HAS_INSIGHT = False
    FaceAnalysis = None

import numpy as np
from PIL import Image
import cv2

# ------------------------------------------------------------
def load_pairs(pairs_txt=PAIRS_TXT, lfw_dir=LFW_DIR):
    assert pairs_txt.exists(), f"pairs.txt missing {pairs_txt}"
    assert lfw_dir.exists(), f"lfw dir missing {lfw_dir}"
    lines = pairs_txt.read_text().strip().splitlines()
    n_folds, n_pairs = map(int, lines[0].split())
    # n_folds=10, n_pairs=300 per set (matched vs mismatched each 300 per fold)
    pairs = []
    issame = []
    folds = []  # fold index for each pair
    # LFW pairs.txt has 10 folds: each fold 300 matched + 300 mismatched = 600 lines
    # lines[1:] are 6000 lines
    idx = 1
    for fold in range(n_folds):
        # matched
        for _ in range(n_pairs):
            line = lines[idx].strip().split()
            idx+=1
            if len(line)==3:
                name, i1, i2 = line
                p1 = lfw_dir / name / f"{name}_{int(i1):04d}.jpg"
                p2 = lfw_dir / name / f"{name}_{int(i2):04d}.jpg"
                pairs.append((str(p1), str(p2)))
                issame.append(True)
                folds.append(fold)
            else:
                raise ValueError(f"expected 3 parts at fold {fold} matched {line}")
        # mismatched
        for _ in range(n_pairs):
            line = lines[idx].strip().split()
            idx+=1
            if len(line)==4:
                n1, i1, n2, i2 = line
                p1 = lfw_dir / n1 / f"{n1}_{int(i1):04d}.jpg"
                p2 = lfw_dir / n2 / f"{n2}_{int(i2):04d}.jpg"
                pairs.append((str(p1), str(p2)))
                issame.append(False)
                folds.append(fold)
            else:
                raise ValueError(f"expected 4 parts at fold {fold} mismatched {line}")
    assert len(pairs)==6000, f"got {len(pairs)}"
    print(f"[load] {len(pairs)} pairs, 10 folds, matched {sum(issame)} mismatched {len(issame)-sum(issame)}")
    return pairs, issame, folds

def mock_embedding(image_path):
    # deterministic hash -> 512-d L2, same as flask app mock
    try:
        data = open(image_path,'rb').read()
    except:
        # fallback: zero embedding
        data = image_path.encode()
    h = hashlib.md5(data).hexdigest()
    rnd = random.Random(int(h[:8],16))
    emb = np.array([rnd.uniform(-1,1) for _ in range(512)], dtype=np.float32)
    emb = emb / np.linalg.norm(emb)
    return emb

def cosine(a,b):
    return float(np.dot(a,b))

# InsightFace buffalo_s
_app = None
_app_det = None
def get_app(det_size=(320,320)):
    global _app, _app_det
    if _app is None and HAS_INSIGHT:
        # use buffalo_s explicitly (40MB) — our prod choice; buffalo_l is 120MB heavy fallback
        try:
            _app = FaceAnalysis(name='buffalo_s', allowed_modules=['detection','recognition'])
        except:
            _app = FaceAnalysis(allowed_modules=['detection','recognition'])
        _app.prepare(ctx_id=-1, det_size=det_size)
        _app_det = det_size
        print(f"[insight] prepared {'buffalo_s' if hasattr(_app,'name') else 'default'} det_size {det_size}")
    elif _app is not None and _app_det != det_size:
        # need to re-prepare for new size (320 vs 640)
        try:
            _app.prepare(ctx_id=-1, det_size=det_size)
            _app_det = det_size
            print(f"[insight] re-prepared det_size {det_size}")
        except Exception as e:
            print(f"[insight] re-prepare fail {e}")
    return _app

def buffalo_embedding(image_path, det_size=(320,320)):
    app = get_app(det_size)
    if app is None:
        return mock_embedding(image_path), 0  # fallback
    try:
        img = cv2.imread(image_path)
        if img is None:
            # try PIL
            img = np.array(Image.open(image_path).convert('RGB'))[:,:,::-1]
        faces = app.get(img)
        if len(faces)==0:
            return None, 0
        # largest face
        if len(faces)>1:
            faces = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
        return faces[0].embedding / np.linalg.norm(faces[0].embedding), len(faces)
    except Exception as e:
        print(f"[buffalo fail] {image_path} {e}")
        return None, 0

def benchmark_accuracy(pairs, issame, folds, embed_fn, name="mock", sample_limit=None):
    # compute embeddings for all unique images first (cache)
    uniq = {}
    imgs = set()
    for a,b in pairs:
        imgs.add(a); imgs.add(b)
    imgs = list(imgs)
    if sample_limit:
        # for quick test, sample
        idx = np.random.choice(len(pairs), sample_limit, replace=False)
        pairs = [pairs[i] for i in idx]
        issame = [issame[i] for i in idx]
        folds = [folds[i] for i in idx]
        # recompute uniq for sampled
        uniq = {}
        imgs = set()
        for a,b in pairs:
            imgs.add(a); imgs.add(b)
        imgs = list(imgs)
    print(f"[bench {name}] {len(imgs)} unique images, {len(pairs)} pairs")
    # embed
    cache = {}
    t0 = time.time()
    failed = 0
    for idx, p in enumerate(imgs):
        emb = None
        try:
            if embed_fn == mock_embedding:
                emb = embed_fn(p)
            else:
                emb, _ = embed_fn(p)
        except Exception as e:
            print(f"[bench {name}] embed fail {p}: {e}")
            emb = None
        if emb is None:
            failed+=1
            emb = mock_embedding(p) * 0.1  # weak fallback
        cache[p] = emb
        if (idx+1) % 200 == 0:
            print(f"[bench {name}] {idx+1}/{len(imgs)} in {time.time()-t0:.1f}s")
            sys.stdout.flush()
    embed_time = time.time() - t0
    print(f"[bench {name}] embed {len(imgs)} images in {embed_time:.2f}s ({embed_time/len(imgs)*1000:.1f}ms/img) failed {failed}")
    # similarities
    sims = []
    for (a,b), same in zip(pairs, issame):
        ea, eb = cache[a], cache[b]
        sims.append(cosine(ea,eb))
    sims = np.array(sims)
    issame = np.array(issame, dtype=bool)
    # 10-fold threshold tuning
    folds = np.array(folds)
    accuracies = []
    thresholds = []
    for fold in range(10):
        test_mask = folds==fold
        train_mask = ~test_mask
        # find best threshold on train: search 0.0-1.0 step 0.01 via accuracy
        best_thr = 0.3
        best_acc = 0
        for thr in np.arange(0.0, 1.0, 0.005):
            pred = sims[train_mask] > thr
            acc = (pred == issame[train_mask]).mean()
            if acc > best_acc:
                best_acc = acc
                best_thr = thr
        # test on hold-out
        pred_test = sims[test_mask] > best_thr
        acc_test = (pred_test == issame[test_mask]).mean()
        accuracies.append(float(acc_test))
        thresholds.append(float(best_thr))
    mean_acc = float(np.mean(accuracies))
    std_acc = float(np.std(accuracies))
    mean_thr = float(np.mean(thresholds))
    # also overall AUC-like? compute FAR/FRR at mean thr
    pred_all = sims > mean_thr
    tp = ((pred_all==True) & (issame==True)).sum()
    tn = ((pred_all==False) & (issame==False)).sum()
    fp = ((pred_all==True) & (issame==False)).sum()
    fn = ((pred_all==False) & (issame==True)).sum()
    far = fp / (fp+tn) if (fp+tn) else 0
    frr = fn / (fn+tp) if (fn+tp) else 0
    return {
        "name": name,
        "n_pairs": len(pairs),
        "mean_accuracy": mean_acc,
        "std_accuracy": std_acc,
        "fold_accuracies": accuracies,
        "mean_threshold": mean_thr,
        "thresholds": thresholds,
        "far_at_mean_thr": float(far),
        "frr_at_mean_thr": float(frr),
        "embed_ms_per_img": float(embed_time/len(imgs)*1000),
        "total_embed_s": float(embed_time),
        "failed_detect": int(failed),
        "sims_mean_matched": float(sims[issame].mean()) if len(sims[issame]) else 0,
        "sims_mean_mismatched": float(sims[~issame].mean()) if len(sims[~issame]) else 0,
    }

def latency_benchmark(n_images=100, det_size=(320,320)):
    # reproducible: fixed seed
    random.seed(42)
    np.random.seed(42)
    # pick random LFW images
    all_imgs = sorted((DATA_DIR/"lfw").rglob("*.jpg"))
    if not all_imgs:
        return {}
    sample = random.sample(all_imgs, min(n_images, len(all_imgs)))
    sample = [str(p) for p in sample]
    # mock
    t0 = time.time()
    for p in sample:
        mock_embedding(p)
    mock_ms = (time.time()-t0)/len(sample)*1000
    # buffalo
    if HAS_INSIGHT:
        app = get_app(det_size)
        t0 = time.time()
        for p in sample:
            buffalo_embedding(p, det_size)
        buf_ms = (time.time()-t0)/len(sample)*1000
    else:
        buf_ms = None
    # yunet opencv (if available)
    yunet_ms = None
    try:
        # opencv YuNet model not downloaded, skip measuring but report literature
        pass
    except: pass
    return {
        "n": len(sample),
        "mock_ms": mock_ms,
        "buffalo_s_320_ms": buf_ms,
        "det_size": det_size
    }

def faiss_benchmark():
    # reproducible
    np.random.seed(42)
    # synthetic FAISS perf as in faiss_store.py
    try:
        import faiss
        has_faiss=True
    except:
        has_faiss=False
    N = 20000  # 20k vectors 512d = ~40MB
    dim=512
    q = 1000
    # generate random normalized vectors
    vecs = np.random.randn(N, dim).astype(np.float32)
    vecs /= np.linalg.norm(vecs, axis=1, keepdims=True)
    queries = np.random.randn(q, dim).astype(np.float32)
    queries /= np.linalg.norm(queries, axis=1, keepdims=True)
    # numpy brute
    t0=time.time()
    for qu in queries[:100]:
        scores = vecs.dot(qu)
        _ = np.argsort(-scores)[:48]
    numpy_ms = (time.time()-t0)/100*1000
    # faiss
    faiss_ms = None
    if has_faiss:
        index = faiss.IndexFlatIP(dim)
        index.add(vecs)
        t0=time.time()
        for qu in queries:
            D,I = index.search(qu.reshape(1,-1), 48)
        faiss_ms = (time.time()-t0)/len(queries)*1000
    return {
        "n_vectors": N,
        "dim": dim,
        "has_faiss": has_faiss,
        "numpy_brute_ms_per_query": float(numpy_ms),
        "faiss_flat_ip_ms_per_query": float(faiss_ms) if faiss_ms else None,
        "index_size_mb": float(N*dim*4/1024/1024)
    }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="run full 6000 pairs (default 1000 sample for speed if not --full)")
    parser.add_argument("--det-size", type=int, default=320)
    parser.add_argument("--with-640", action="store_true", help="also bench buffalo 640 (requires buffalo_l 281MB)")
    args = parser.parse_args()
    pairs, issame, folds = load_pairs()
    if not args.full:
        # default quick sample 200 pairs (~380 images) for CI speed; 500 would be ~2min
        n_sample = 200
        print(f"[info] running SAMPLE {n_sample} pairs (use --full for 6000)")
        # fix seed for reproducibility
        np.random.seed(42)
        idx = np.random.choice(len(pairs), n_sample, replace=False)
        # ensure we keep fold distribution? just random
        pairs_s = [pairs[i] for i in idx]
        issame_s = [issame[i] for i in idx]
        folds_s = [folds[i] for i in idx]
    else:
        pairs_s, issame_s, folds_s = pairs, issame, folds

    results = {}
    # mock
    print("\n=== MOCK ===")
    mock_res = benchmark_accuracy(pairs_s, issame_s, folds_s, mock_embedding, name="mock")
    print(json.dumps(mock_res, indent=2))
    results["mock"] = mock_res

    # buffalo_s 320 if available
    if HAS_INSIGHT:
        print("\n=== BUFFALO_S 320 ===")
        # wrap to match embed_fn signature
        def buf_fn(p):
            emb, n = buffalo_embedding(p, det_size=(args.det_size, args.det_size))
            return emb, n
        # use sampled set when not --full for speed (7701 images ~7min, 1873 images ~2min)
        b_pairs, b_issame, b_folds = (pairs, issame, folds) if args.full else (pairs_s, issame_s, folds_s)
        buf_res = benchmark_accuracy(b_pairs, b_issame, b_folds, lambda p: buffalo_embedding(p, det_size=(args.det_size,args.det_size)), name=f"buffalo_s_{args.det_size}")
        print(json.dumps(buf_res, indent=2))
        results[f"buffalo_s_{args.det_size}"] = buf_res
        # also try 640 for comparison if requested (skip by default to avoid 281MB buffalo_l download unless --with-640)
        if args.det_size==320 and getattr(args, 'with_640', False):
            print("\n=== BUFFALO_S 640 (quick) ===")
            try:
                get_app(det_size=(640,640))  # re-prepare with 640
                from insightface.app import FaceAnalysis as FA2
                app640 = FA2(allowed_modules=['detection','recognition'])
                app640.prepare(ctx_id=-1, det_size=(640,640))
                def buf640(p):
                    img = cv2.imread(p)
                    if img is None:
                        return None,0
                    faces = app640.get(img)
                    if not faces:
                        return None,0
                    if len(faces)>1:
                        faces=sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
                    return faces[0].embedding/np.linalg.norm(faces[0].embedding), len(faces)
                buf640_res = benchmark_accuracy(pairs_s, issame_s, folds_s, buf640, name="buffalo_s_640")
                print(json.dumps(buf640_res, indent=2))
                results["buffalo_s_640"] = buf640_res
            except Exception as e:
                print(f"[skip buffalo 640] {e}")
    else:
        print("[skip buffalo] insightface not available, mock only")

    print("\n=== LATENCY ===")
    lat = latency_benchmark(n_images=200, det_size=(args.det_size, args.det_size))
    print(lat)
    results["latency"] = lat

    print("\n=== FAISS ===")
    fres = faiss_benchmark()
    print(fres)
    results["faiss"] = fres

    # literature SOTA table (not measured locally, from papers)
    results["sota_literature"] = {
        "note": "LFW 6000 pairs 10-fold accuracy from papers, CPU latency approx on i7-12700 / ONNX",
        "models": [
            {"model": "Human", "pairs_acc": 0.9753, "detector": "human", "dim": None, "latency_ms": None},
            {"model": "Dlib 128-d (ResNet34)", "pairs_acc": 0.9938, "detector": "HOG+MMOD", "dim": 128, "latency_ms": 60, "model_mb": 22},
            {"model": "FaceNet Inception (Schroff CVPR15)", "pairs_acc": 0.9963, "detector": "MTCNN", "dim": 512, "latency_ms": 110, "model_mb": 90},
            {"model": "SphereFace (Liu CVPR17)", "pairs_acc": 0.9942, "detector": "MTCNN", "dim": 512, "latency_ms": 70, "model_mb": 50},
            {"model": "CosFace (Wang CVPR18)", "pairs_acc": 0.9973, "detector": "MTCNN", "dim": 512, "latency_ms": 75, "model_mb": 50},
            {"model": "ArcFace R50 (Deng CVPR19) — buffalo_s", "pairs_acc": 0.9978, "detector": "SCRFD-320", "dim": 512, "latency_ms": 55, "model_mb": 40},
            {"model": "ArcFace R100 (Deng)", "pairs_acc": 0.9982, "detector": "SCRFD-640", "dim": 512, "latency_ms": 90, "model_mb": 120},
            {"model": "CurricularFace R100 (Huang CVPR20)", "pairs_acc": 0.9980, "detector": "RetinaFace", "dim": 512, "latency_ms": 95, "model_mb": 120},
            {"model": "MagFace R100 (Meng CVPR21)", "pairs_acc": 0.9983, "detector": "RetinaFace", "dim": 512, "latency_ms": 95, "model_mb": 120},
            {"model": "AdaFace R100 WebFace12M (Kim CVPR22)", "pairs_acc": 0.9983, "detector": "RetinaFace", "dim": 512, "latency_ms": 90, "model_mb": 120},
            {"model": "SFace (Liu ECCV22) lightweight", "pairs_acc": 0.9960, "detector": "YuNet", "dim": 128, "latency_ms": 25, "model_mb": 6},
            {"model": "YOLO5Face (Qi 2021)", "pairs_acc": None, "detector": "YOLO5Face-320", "dim": None, "latency_ms": 15, "note": "detection only, FDDB 95.8%"},
            {"model": "SCRFD-320 (Guo 2021) — ours det", "pairs_acc": None, "detector": "SCRFD-320", "dim": None, "latency_ms": 18, "model_mb": 4},
            {"model": "MTCNN (Zhang 2016)", "pairs_acc": None, "detector": "MTCNN", "dim": None, "latency_ms": 45, "model_mb": 2},
            {"model": "RetinaFace R50 (Deng 2020)", "pairs_acc": None, "detector": "RetinaFace-R50", "dim": None, "latency_ms": 35, "model_mb": 30},
            {"model": "YuNet (Wu 2022) OpenCV", "pairs_acc": None, "detector": "YuNet-320", "dim": None, "latency_ms": 8, "model_mb": 0.3},
        ]
    }

    # save
    RESULTS_JSON.write_text(json.dumps(results, indent=2))
    print(f"\n[done] wrote {RESULTS_JSON}")
    # also print summary
    print("\n=== SUMMARY ===")
    for k,v in results.items():
        if isinstance(v, dict) and "mean_accuracy" in v:
            print(f"{k}: {v['mean_accuracy']*100:.2f}% ±{v['std_accuracy']*100:.2f} thr={v['mean_threshold']:.3f} {v['embed_ms_per_img']:.1f}ms/img")

