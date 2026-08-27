"""
Fyndr — FAISS per-event store (P1)
Single file per event: /tmp/fyndr_faiss/{event_id}.npy + .index
Falls back to numpy brute if faiss-cpu not installed (WindowsOK, aarch64 no wheel).
"""
import os, hashlib, json
import numpy as np

try:
    import faiss  # pip install faiss-cpu
    HAS_FAISS = True
except Exception as e:
    print(f"[faiss_store] faiss-cpu not available, using numpy brute: {e}")
    HAS_FAISS = False
    faiss = None

BASE = os.getenv("FAISS_BASE", "/tmp/fyndr_faiss")
os.makedirs(BASE, exist_ok=True)

def _path(event_id, ext):
    # sanitize event_id
    eid = "".join(c for c in event_id if c.isalnum() or c in "-_")
    return os.path.join(BASE, f"{eid}.{ext}")

def add(event_id, photo_id, embedding):
    """Append 512-d embedding for event. embedding: list/np array, L2 normalized."""
    vec = np.array(embedding, dtype=np.float32)
    # ensure L2 norm 1
    n = np.linalg.norm(vec)
    if n > 0:
        vec = vec / n
    if HAS_FAISS:
        idx_path = _path(event_id, "index")
        meta_path = _path(event_id, "meta.json")
        # load or create
        if os.path.exists(idx_path):
            try:
                index = faiss.read_index(idx_path)
                meta = json.loads(open(meta_path).read()) if os.path.exists(meta_path) else []
            except:
                index = faiss.IndexFlatIP(512)
                meta = []
        else:
            index = faiss.IndexFlatIP(512)
            meta = []
        index.add(vec.reshape(1, -1))
        meta.append({"photo_id": photo_id, "id": len(meta)})
        faiss.write_index(index, idx_path)
        open(meta_path, "w").write(json.dumps(meta))
    else:
        # numpy fallback: append to .npy
        npy_path = _path(event_id, "npy")
        meta_path = _path(event_id, "meta.json")
        if os.path.exists(npy_path):
            arr = np.load(npy_path)
            arr = np.vstack([arr, vec.reshape(1, -1)])
            meta = json.loads(open(meta_path).read())
        else:
            arr = vec.reshape(1, -1)
            meta = []
        np.save(npy_path, arr)
        meta.append({"photo_id": photo_id})
        open(meta_path, "w").write(json.dumps(meta))
    return True

def search(event_id, query_emb, k=48, threshold=0.34):
    """Return list of (photo_id, score) sorted desc, filtered by threshold."""
    q = np.array(query_emb, dtype=np.float32)
    n = np.linalg.norm(q)
    if n > 0:
        q = q / n
    if HAS_FAISS:
        idx_path = _path(event_id, "index")
        meta_path = _path(event_id, "meta.json")
        if not os.path.exists(idx_path):
            return []
        index = faiss.read_index(idx_path)
        meta = json.loads(open(meta_path).read())
        # faiss IndexFlatIP returns inner product = cosine for normalized
        D, I = index.search(q.reshape(1, -1), min(k, index.ntotal))
        res = []
        for score, idx in zip(D[0], I[0]):
            if idx == -1:
                continue
            if score < threshold:
                continue
            photo_id = meta[idx]["photo_id"]
            res.append((photo_id, float(score)))
        # dedup already by photo_id (one embedding per photo currently)
        return res
    else:
        npy_path = _path(event_id, "npy")
        meta_path = _path(event_id, "meta.json")
        if not os.path.exists(npy_path):
            return []
        arr = np.load(npy_path)  # (N,512)
        meta = json.loads(open(meta_path).read())
        # cosine via dot
        scores = arr.dot(q)  # (N,)
        idxs = np.argsort(-scores)[:k]
        res = []
        for idx in idxs:
            s = float(scores[idx])
            if s < threshold:
                continue
            res.append((meta[idx]["photo_id"], s))
        return res

def stats(event_id):
    if HAS_FAISS:
        p = _path(event_id, "index")
        if os.path.exists(p):
            idx = faiss.read_index(p)
            return {"ntotal": idx.ntotal, "has_faiss": True}
        return {"ntotal": 0, "has_faiss": True}
    else:
        p = _path(event_id, "npy")
        if os.path.exists(p):
            arr = np.load(p)
            return {"ntotal": int(arr.shape[0]), "has_faiss": False}
        return {"ntotal": 0, "has_faiss": False}
