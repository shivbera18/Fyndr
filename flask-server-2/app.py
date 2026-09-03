import os
from flask import Flask, request, jsonify
import numpy as np
from PIL import Image, ImageOps
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
import io
from flask_cors import CORS
import json
import ast
from flask_socketio import SocketIO
import hashlib
import random
from faiss_store import add as faiss_add, search as faiss_search, stats as faiss_stats, remove as faiss_remove, delete_event as faiss_delete_event
import logging
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
# ml logger: basic logs to ml.log, errors to error.log (main error log)
logger = logging.getLogger("fyndr-ml")
logger.setLevel(logging.INFO)
if not logger.handlers:
    fh_combined = logging.FileHandler(LOG_DIR / "ml.log")
    fh_combined.setLevel(logging.INFO)
    fh_error = logging.FileHandler(LOG_DIR / "error.log")
    fh_error.setLevel(logging.ERROR)
    fmt = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    fh_combined.setFormatter(fmt)
    fh_error.setFormatter(fmt)
    logger.addHandler(fh_combined)
    logger.addHandler(fh_error)
    logger.addHandler(logging.StreamHandler())

# Try InsightFace, fallback to mock for local dev without C++ build
try:
    from insightface.app import FaceAnalysis
    HAS_INSIGHT=True
except Exception as e:
    # use logging after logger is defined? fallback to print if logger not yet
    try:
        logger.warning(f'InsightFace not available, using mock embeddings: {e}')
    except:
        print('InsightFace not available, using mock embeddings:', e)
    HAS_INSIGHT=False
    FaceAnalysis=None

# Initialize Flask app
app = Flask(__name__)
socketio = SocketIO(app)

app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/photo_sharing_db")  # Replace with your MongoDB URI
mongo = PyMongo(app)
CORS(app)

#in database collection name is Photo
# Initialize InsightFace
app_insight = FaceAnalysis(allowed_modules=['detection', 'recognition']) if HAS_INSIGHT else None
if HAS_INSIGHT:
    app_insight.prepare(ctx_id=-1, det_size=(640, 640))
    # Warm up ONNX models at startup to avoid cold-start compilation latency on first user request
    try:
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        app_insight.get(dummy)
        logger.info("InsightFace ONNX models warmed up successfully.")
    except Exception as e:
        logger.warning(f"InsightFace warm-up notice: {e}")
# Load and prepare image function (handles EXIF orientation, downsamples ultra-large DSLR photos, converts to BGR)
def load_image_from_bytes(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image).convert('RGB')
        # Downsample ultra-large DSLR photos to 1920px max dimension for memory efficiency and fast inference
        if max(image.size) > 1920:
            image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        rgb_arr = np.array(image)
        return rgb_arr[:, :, ::-1]
    except Exception as e:
        logger.warning(f"Error loading image from bytes: {e}")
        return None

# Cosine similarity function
def cosine_similarity(embedding1, embedding2):
    dot_product = np.dot(embedding1, embedding2)
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    return dot_product / (norm1 * norm2)

@app.route('/test_db_connection', methods=['GET'])
def test_db_connection():
    try:
        # Try to fetch a count of documents in the photo collection
        photo_collection = mongo.db.photo  # Ensure this matches your collection name
        count = photo_collection.find_one()
        return jsonify({"message": "Database connected successfully!"}), 200
        # return jsonify({'success': True, 'count': count}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/test_fetch', methods=['GET'])
def test_fetch():
    event_id = "670559f373398cf97806164d"  # Replace with an actual event ID you know exists
    photos = mongo.db.photos.find({"event_id": event_id})
    
    photo_list = [{'id': str(photo['_id']), 'name': photo['name'], 'embedding': photo['embedding']} for photo in photos]
    return jsonify(photo_list)
    




#-----------------------------------------------------------------------------------------------------

# API Endpoint to compare face embeddings and return matched photos
@app.route('/match_faces', methods=['POST'])
def match_faces():
    if 'image' not in request.files or 'event_id' not in request.form:
        return jsonify({'error': 'No image file or event_id provided'}), 400

    file = request.files['image']
    event_id = request.form['event_id']
    # validate event_id (allow any sanitized string, but guard empty)
    if not event_id or len(event_id) < 6 or len(event_id) > 64:
        return jsonify({'error': 'invalid event_id'}), 400
    try:
        threshold = float(request.form.get('threshold', 0.34))
    except:
        return jsonify({'error': 'invalid threshold'}), 400
    if threshold < 0.1 or threshold > 0.9:
        return jsonify({'error': 'threshold must be between 0.1 and 0.9'}), 400
    image_bytes = file.read()
    # limit selfie size to 10MB (aligned with upload 15MB: selfie smaller is ok, but not silent)
    if len(image_bytes) > 10 * 1024 * 1024:
        return jsonify({'error': 'image too large (max 10MB for selfie)'}), 400

    img = load_image_from_bytes(image_bytes)
    if img is None:
        return jsonify({'error': 'Image could not be loaded'}), 400

    if HAS_INSIGHT:
        try:
            faces = app_insight.get(img)
        except Exception as e:
            return jsonify({'error': f'face detection failed: {e}'}), 500
        if len(faces) == 0:
            return jsonify({'error': 'No face detected in the image'}), 400
        if len(faces) > 1:
            # Use largest face (closest to camera) for reliability
            faces = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
        query_emb = faces[0].embedding
    else:
        h = hashlib.md5(image_bytes).hexdigest()
        random.seed(int(h[:8], 16))
        query_emb = np.array([random.uniform(-1, 1) for _ in range(512)], dtype=np.float32)
        query_emb = query_emb / np.linalg.norm(query_emb)

    # Try FAISS per-event index first (18ms vs 8s brute)
    try:
        faiss_res = faiss_search(event_id, query_emb, k=48, threshold=threshold)
        if faiss_res:
            matches = []
            for pid, score in faiss_res:
                try:
                    doc = mongo.db.photos.find_one({"_id": ObjectId(pid)})
                    if doc:
                        matches.append({'id': pid, 'name': doc['name'], 'similarity': float(score)})
                    else:
                        matches.append({'id': pid, 'name': 'unknown', 'similarity': float(score)})
                except Exception:
                    matches.append({'id': pid, 'name': 'unknown', 'similarity': float(score)})
            return jsonify({'matches': matches}), 200
    except Exception as e:
        logger.warning(f"[faiss] search fallback brute: {e}")

    # Fallback brute: safe JSON parse, no eval
    photo_collection = mongo.db.photos
    try:
        photos = photo_collection.find({"event_id": event_id})
    except Exception as e:
        return jsonify({'error': f'db error: {e}'}), 500
    matches = []
    q_norm = np.linalg.norm(query_emb)
    for photo in photos:
        emb_str = photo.get('embedding')
        if not emb_str:
            continue
        try:
            # Prefer JSON; fallback to ast.literal_eval for legacy Python repr (no eval RCE)
            try:
                raw_emb = json.loads(emb_str)
            except Exception:
                try:
                    if emb_str.strip().startswith('[') and "'" in emb_str:
                        raw_emb = json.loads(emb_str.replace("'", '"'))
                    else:
                        raw_emb = ast.literal_eval(emb_str)
                except Exception:
                    continue
            db_embedding = np.array(raw_emb, dtype=np.float32)
            if db_embedding.ndim == 1 and db_embedding.shape == (512,):
                db_embedding = db_embedding.reshape(1, -1)
            elif db_embedding.ndim == 2 and db_embedding.shape[1] == 512:
                pass
            else:
                continue
        except Exception:
            continue
        norms = np.linalg.norm(db_embedding, axis=1)
        dots = np.dot(db_embedding, query_emb)
        sims = np.where(norms > 0, dots / (norms * q_norm), 0.0)
        best_sim = float(np.max(sims)) if len(sims) > 0 else 0.0
        if best_sim > threshold:
            matches.append({'id': str(photo['_id']), 'name': photo['name'], 'similarity': best_sim})
    if matches:
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        return jsonify({'matches': matches}), 200
    else:
        return jsonify({'message': 'You are not Present In this event', 'matches': []}), 200



#-----------------------------------------------------------------------------------------------------
# API Endpoint to generate face embeddings
@app.route('/get_embedding', methods=['POST'])
def get_embedding():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    image_bytes = file.read()
    if len(image_bytes) > 15 * 1024 * 1024:
        return jsonify({'error': 'image too large (max 15MB)'}), 400
    # Validate optional indexing params early
    event_id_q = request.form.get('event_id') or request.args.get('event_id')
    photo_id_q = request.form.get('photo_id') or request.args.get('photo_id')
    if (event_id_q or photo_id_q) and not (event_id_q and photo_id_q):
        return jsonify({'error': 'both event_id and photo_id required for indexing'}), 400
    if event_id_q and (len(event_id_q) < 6 or len(event_id_q) > 64):
        return jsonify({'error': 'invalid event_id'}), 400
    if photo_id_q and (len(photo_id_q) < 6 or len(photo_id_q) > 64):
        return jsonify({'error': 'invalid photo_id'}), 400

    img = load_image_from_bytes(image_bytes)
    if img is None:
        return jsonify({'error': 'Image could not be loaded'}), 400

    if HAS_INSIGHT:
        try:
            faces = app_insight.get(img)
        except Exception as e:
            return jsonify({'error': f'face detection failed: {e}'}), 500
        if len(faces) == 0:
            return jsonify({'embeddings': [], 'embedding': None, 'face_count': 0, 'message': 'No face detected in the image'}), 200
        # Sort faces largest to smallest
        faces = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
        embeddings = [f.embedding.tolist() for f in faces]
        primary_embedding = embeddings[0]
    else:
        h = hashlib.md5(image_bytes).hexdigest()
        random.seed(int(h[:8], 16))
        primary_embedding = [random.uniform(-1, 1) for _ in range(512)]
        norm = sum(x * x for x in primary_embedding) ** 0.5
        primary_embedding = [x / norm for x in primary_embedding] if norm else primary_embedding
        embeddings = [primary_embedding]
    # Optional FAISS index if caller provides event_id+photo_id (atomic, validated)
    if event_id_q and photo_id_q and embeddings:
        try:
            faiss_add(event_id_q, photo_id_q, embeddings)
        except Exception as e:
            logger.error(f"[faiss] add failed {e}", exc_info=True)
            return jsonify({'error': f'faiss add failed: {e}', 'embeddings': embeddings, 'embedding': primary_embedding}), 500
    return jsonify({'embeddings': embeddings, 'embedding': primary_embedding, 'face_count': len(embeddings)})

@app.route('/faiss_stats', methods=['GET'])
def faiss_stats_route():
    event_id = request.args.get('event_id')
    if not event_id:
        return jsonify({'error': 'event_id required'}), 400
    try:
        return jsonify(faiss_stats(event_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/faiss_remove', methods=['POST'])
def faiss_remove_route():
    data = request.get_json(silent=True) or request.form
    event_id = data.get('event_id')
    photo_id = data.get('photo_id')
    if not event_id or not photo_id:
        return jsonify({'error': 'event_id and photo_id required'}), 400
    try:
        ok = faiss_remove(event_id, photo_id)
        return jsonify({'ok': ok})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/faiss_delete_event', methods=['POST'])
def faiss_delete_event_route():
    data = request.get_json(silent=True) or request.form
    event_id = data.get('event_id')
    if not event_id:
        return jsonify({'error': 'event_id required'}), 400
    try:
        faiss_delete_event(event_id)
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
     def _get_port():
         try:
             return int(os.getenv("PORT", "5001"))
         except ValueError:
             return 5001
     socketio.run(app, host='0.0.0.0', port=_get_port(), debug=False, allow_unsafe_werkzeug=True)