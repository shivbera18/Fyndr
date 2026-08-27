"""
Fyndr — FAISS per-event store (P1)
Single file per event: /tmp/fyndr_faiss/{event_id}.npy + .index
Falls back to numpy brute if faiss-cpu not installed (WindowsOK, aarch64 no wheel).
"""
import os, hashlib, json, threading
from collections import defaultdict
import numpy as np

_locks_guard = threading.Lock()
_event_locks = defaultdict(threading.RLock)

def _get_lock(event_id):
    with _locks_guard:
        return _event_locks[str(event_id)]
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

def _load_meta(meta_path):
    if os.path.exists(meta_path):
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                return json.loads(f.read())
        except Exception:
            return []
    return []

def add(event_id, photo_id, embedding):
    """Append 512-d embedding(s) for event. embedding: list/np array (512,) or (N,512), L2 normalized.
    Persists both npy (source of truth) and FAISS index for rebuild safety."""
    with _get_lock(event_id):
        _path(event_id, "index")
        photo_id = _sanitize_photo_id(photo_id)
        vecs = np.array(embedding, dtype=np.float32)
        if vecs.ndim == 1:
            if vecs.shape != (512,):
                raise ValueError(f"embedding must be 512-d, got {vecs.shape}")
            vecs = vecs.reshape(1, -1)
        elif vecs.ndim == 2:
            if vecs.shape[0] == 0:
                return True
            if vecs.shape[1] != 512:
                raise ValueError(f"embedding must be (N, 512), got {vecs.shape}")
        else:
            raise ValueError(f"invalid embedding shape {vecs.shape}")

        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        vecs = vecs / norms

        npy_path = _path(event_id, "npy")
        meta_path = _path(event_id, "meta.json")
        idx_path = _path(event_id, "index")

        meta = _load_meta(meta_path)
        # If photo_id already indexed, remove old vectors to keep add idempotent
        if any(m.get("photo_id") == photo_id for m in meta):
            remove(event_id, photo_id)
            meta = _load_meta(meta_path)

        if os.path.exists(npy_path):
            try:
                arr = np.load(npy_path)
                arr = np.vstack([arr, vecs])
            except Exception:
                arr = vecs
        else:
            arr = vecs
        np.save(npy_path, arr)
        for _ in range(vecs.shape[0]):
            meta.append({"photo_id": photo_id, "id": len(meta)})
        _atomic_write(meta_path, json.dumps(meta))

        if HAS_FAISS:
            try:
                if os.path.exists(idx_path):
                    index = faiss.read_index(idx_path)
                else:
                    index = faiss.IndexFlatIP(512)
                    if len(meta) > vecs.shape[0] and os.path.exists(npy_path):
                        index.add(arr)
                        faiss.write_index(index, idx_path)
                        return True
                index.add(vecs)
                faiss.write_index(index, idx_path)
            except Exception as e:
                try:
                    index = faiss.IndexFlatIP(512)
                    index.add(arr)
                    faiss.write_index(index, idx_path)
                except Exception as e2:
                    print(f"[faiss_store] add rebuild failed: {e2} (orig {e})")
        return True

def remove(event_id, photo_id):
    """Remove all vectors for single photo from index (rebuild). Returns True if removed."""
    with _get_lock(event_id):
        _path(event_id, "index")
        photo_id = _sanitize_photo_id(photo_id)
        meta_path = _path(event_id, "meta.json")
        npy_path = _path(event_id, "npy")
        idx_path = _path(event_id, "index")
        meta = _load_meta(meta_path)
        if not meta:
            return False
        del_indices = [i for i, m in enumerate(meta) if m.get("photo_id") == photo_id]
        if not del_indices:
            return False
        del_set = set(del_indices)
        meta = [m for i, m in enumerate(meta) if i not in del_set]
        for i, m in enumerate(meta):
            m["id"] = i

        if os.path.exists(npy_path):
            try:
                arr = np.load(npy_path)
                arr = np.delete(arr, del_indices, axis=0)
                if len(meta) == 0:
                    try: os.remove(npy_path)
                    except: pass
                    try: os.remove(idx_path)
                    except: pass
                    _atomic_write(meta_path, json.dumps(meta))
                    return True
                np.save(npy_path, arr)
            except Exception as e:
                print(f"[faiss_store] npy delete failed: {e}")
                _atomic_write(meta_path, json.dumps(meta))
                return True

            if HAS_FAISS:
                try:
                    if len(meta) == 0:
                        try: os.remove(idx_path)
                        except: pass
                    else:
                        index = faiss.IndexFlatIP(512)
                        index.add(arr)
                        faiss.write_index(index, idx_path)
                except Exception as e:
                    print(f"[faiss_store] rebuild failed: {e}")
                    try: os.remove(idx_path)
                    except: pass
        else:
            if HAS_FAISS and os.path.exists(idx_path):
                try: os.remove(idx_path)
                except: pass
        _atomic_write(meta_path, json.dumps(meta))
        return True
def delete_event(event_id):
    """Delete all FAISS data for an event."""
    with _get_lock(event_id):
        for ext in ["index", "meta.json", "npy"]:
            p = _path(event_id, ext)
            try:
                if os.path.exists(p):
                    os.remove(p)
            except: pass
        try:
            tmp = _path(event_id, "meta.json.tmp")
            if os.path.exists(tmp): os.remove(tmp)
        except: pass
        return True

def search(event_id, query_emb, k=48, threshold=0.34):
    """Return list of (photo_id, score) sorted desc, filtered by threshold, deduped by photo_id."""
    q = np.array(query_emb, dtype=np.float32)
    n = np.linalg.norm(q)
    if n > 0:
        q = q / n
    seen_photos = {}
    if HAS_FAISS:
        idx_path = _path(event_id, "index")
        meta_path = _path(event_id, "meta.json")
        if not os.path.exists(idx_path):
            return []
        index = faiss.read_index(idx_path)
        meta = _load_meta(meta_path)
        if not meta:
            return []
        # search top candidate vectors (up to 4x k to account for multi-face photos)
        search_k = min(k * 4, index.ntotal)
        D, I = index.search(q.reshape(1, -1), search_k)
        for score, idx in zip(D[0], I[0]):
            if idx == -1 or idx >= len(meta):
                continue
            if score < threshold:
                continue
            photo_id = meta[idx]["photo_id"]
            if photo_id not in seen_photos or float(score) > seen_photos[photo_id]:
                seen_photos[photo_id] = float(score)
    else:
        npy_path = _path(event_id, "npy")
        meta_path = _path(event_id, "meta.json")
        if not os.path.exists(npy_path):
            return []
        arr = np.load(npy_path)  # (N,512)
        meta = _load_meta(meta_path)
        if not meta:
            return []
        scores = arr.dot(q)  # (N,)
        idxs = np.argsort(-scores)
        for idx in idxs:
            if idx >= len(meta):
                continue
            s = float(scores[idx])
            if s < threshold:
                continue
            photo_id = meta[idx]["photo_id"]
            if photo_id not in seen_photos or s > seen_photos[photo_id]:
                seen_photos[photo_id] = s
    sorted_res = sorted(seen_photos.items(), key=lambda x: x[1], reverse=True)[:k]
    return sorted_res
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
