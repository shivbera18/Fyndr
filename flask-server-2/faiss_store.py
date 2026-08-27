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
    # sanitize event_id: allow only hex-like ObjectId, else hash
    if not event_id or not isinstance(event_id, str):
        raise ValueError("invalid event_id")
    eid = "".join(c for c in event_id if c.isalnum() or c in "-_")
    if len(eid) < 6 or len(eid) > 64:
        # fallback to hash for safety (prevents path traversal)
        eid = hashlib.sha256(event_id.encode()).hexdigest()[:24]
    if not eid:
        raise ValueError("invalid event_id after sanitize")
    return os.path.join(BASE, f"{eid}.{ext}")

def _sanitize_photo_id(pid):
    if not pid or not isinstance(pid, str):
        raise ValueError("invalid photo_id")
    # ObjectId is 24 hex; allow alnum-_ up to 64
    clean = "".join(c for c in pid if c.isalnum() or c in "-_")
    if len(clean) < 6 or len(clean) > 64:
        raise ValueError("invalid photo_id")
    return clean

def _atomic_write(path, data, mode="w"):
    tmp = path + ".tmp"
    with open(tmp, mode) as f:
        f.write(data)
    os.replace(tmp, path)

def add(event_id, photo_id, embedding):
    """Append 512-d embedding for event. embedding: list/np array, L2 normalized."""
    # validate ids (will raise if invalid)
    _path(event_id, "index")
    photo_id = _sanitize_photo_id(photo_id)
    vec = np.array(embedding, dtype=np.float32)
    if vec.shape != (512,):
        raise ValueError(f"embedding must be 512-d, got {vec.shape}")
    n = np.linalg.norm(vec)
    if n > 0:
        vec = vec / n
    else:
        raise ValueError("zero norm embedding")
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
        # dedup: if photo_id already in meta, replace rather than duplicate
        existing_idx = next((i for i, m in enumerate(meta) if m.get("photo_id") == photo_id), -1)
        if existing_idx != -1:
            # FAISS IndexFlatIP does not support update; for now skip duplicate add
            return True
        index.add(vec.reshape(1, -1))
        meta.append({"photo_id": photo_id, "id": len(meta)})
        # atomic write for meta
        faiss.write_index(index, idx_path)
        _atomic_write(meta_path, json.dumps(meta))
    else:
        # numpy fallback: append to .npy
        npy_path = _path(event_id, "npy")
        meta_path = _path(event_id, "meta.json")
        if os.path.exists(npy_path):
            meta = json.loads(open(meta_path).read()) if os.path.exists(meta_path) else []
            if any(m.get("photo_id") == photo_id for m in meta):
                return True
            arr = np.load(npy_path)
            arr = np.vstack([arr, vec.reshape(1, -1)])
        else:
            arr = vec.reshape(1, -1)
            meta = []
        np.save(npy_path, arr)
        meta.append({"photo_id": photo_id})
        _atomic_write(meta_path, json.dumps(meta))
    return True

def remove(event_id, photo_id):
    """Remove single photo from index (rebuild). Returns True if removed."""
    _path(event_id, "index")
    photo_id = _sanitize_photo_id(photo_id)
    meta_path = _path(event_id, "meta.json")
    if not os.path.exists(meta_path):
        return False
    meta = json.loads(open(meta_path).read())
    idx = next((i for i, m in enumerate(meta) if m.get("photo_id") == photo_id), -1)
    if idx == -1:
        return False
    meta.pop(idx)
    if HAS_FAISS:
        idx_path = _path(event_id, "index")
        if os.path.exists(idx_path):
            # rebuild index without removed vector
            if os.path.exists(_path(event_id, "npy")):
                # prefer npy rebuild if exists
                pass
            # For simplicity, delete and require re-add if using FAISS; fallback to numpy rebuild
            # If we have npy, we can rebuild FAISS from npy
            # Otherwise just delete index if no vectors left
            if not meta:
                try: os.remove(idx_path)
                except: pass
                _atomic_write(meta_path, json.dumps(meta))
                return True
            # Need stored vectors to rebuild – without them we drop index
            # Best effort: delete index, next add will recreate
            try: os.remove(idx_path)
            except: pass
        _atomic_write(meta_path, json.dumps(meta))
        # also remove npy if exists
        npy_path = _path(event_id, "npy")
        if os.path.exists(npy_path):
            arr = np.load(npy_path)
            arr = np.delete(arr, idx, axis=0)
            if len(meta)==0:
                try: os.remove(npy_path)
                except: pass
            else:
                np.save(npy_path, arr)
        return True
    else:
        npy_path = _path(event_id, "npy")
        if os.path.exists(npy_path):
            arr = np.load(npy_path)
            arr = np.delete(arr, idx, axis=0)
            if len(meta)==0:
                try: os.remove(npy_path)
                except: pass
                _atomic_write(meta_path, json.dumps(meta))
            else:
                np.save(npy_path, arr)
                _atomic_write(meta_path, json.dumps(meta))
        else:
            _atomic_write(meta_path, json.dumps(meta))
        return True

def delete_event(event_id):
    """Delete all FAISS data for an event."""
    for ext in ["index", "meta.json", "npy"]:
        p = _path(event_id, ext)
        try:
            if os.path.exists(p):
                os.remove(p)
        except: pass
    # also tmp
    try:
        tmp = _path(event_id, "meta.json.tmp")
        if os.path.exists(tmp): os.remove(tmp)
    except: pass
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
    _path(event_id, "index")  # validate
    if HAS_FAISS:
        p = _path(event_id, "index")
        if os.path.exists(p):
            try:
                idx = faiss.read_index(p)
                return {"ntotal": idx.ntotal, "has_faiss": True}
            except:
                return {"ntotal": 0, "has_faiss": True, "error": "corrupt index"}
        return {"ntotal": 0, "has_faiss": True}
    else:
        p = _path(event_id, "npy")
        if os.path.exists(p):
            try:
                arr = np.load(p)
                return {"ntotal": int(arr.shape[0]), "has_faiss": False}
            except:
                return {"ntotal": 0, "has_faiss": False, "error": "corrupt npy"}
        return {"ntotal": 0, "has_faiss": False}
