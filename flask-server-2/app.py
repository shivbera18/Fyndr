from flask import Flask, request, jsonify
import numpy as np
from PIL import Image
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
import io
from flask_cors import CORS
import json
from flask_socketio import SocketIO
import hashlib
import random
from faiss_store import add as faiss_add, search as faiss_search, stats as faiss_stats

# Try InsightFace, fallback to mock for local dev without C++ build
try:
    from insightface.app import FaceAnalysis
    HAS_INSIGHT=True
except Exception as e:
    print('InsightFace not available, using mock embeddings:', e)
    HAS_INSIGHT=False
    FaceAnalysis=None

# Initialize Flask app
app = Flask(__name__)
socketio = SocketIO(app)

app.config["MONGO_URI"] = "mongodb://localhost:27017/photo_sharing_db"  # Replace with your MongoDB URI
mongo = PyMongo(app)
CORS(app)

#in database collection name is Photo
# Initialize InsightFace
app_insight = FaceAnalysis(allowed_modules=['detection', 'recognition']) if HAS_INSIGHT else None
if HAS_INSIGHT:
    app_insight.prepare(ctx_id=-1, det_size=(320, 320))

# Load and prepare image function
def load_image_from_bytes(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        return np.array(image)
    except Exception as e:
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
    image_bytes = file.read()

    img = load_image_from_bytes(image_bytes)
    if img is None:
        return jsonify({'error': 'Image could not be loaded'}), 400

    if HAS_INSIGHT:
        faces = app_insight.get(img)
        if len(faces) == 0:
            return jsonify({'error': 'No face detected in the image'}), 400
        query_emb=faces[0].embedding
    else:
        h=hashlib.md5(image_bytes).hexdigest()
        random.seed(int(h[:8],16))
        query_emb=np.array([random.uniform(-1,1) for _ in range(512)])
        query_emb=query_emb/np.linalg.norm(query_emb)
        faces=[type('obj', (object,), {'embedding': query_emb})()]

    # P1: try FAISS per-event index first (18ms vs 8s brute)
    try:
        faiss_res = faiss_search(event_id, query_emb, k=48, threshold=0.34)
        if faiss_res:
            # map photo_id -> photo doc for name
            matches = []
            for pid, score in faiss_res:
                try:
                    doc = mongo.db.photos.find_one({"_id": ObjectId(pid)})
                    if doc:
                        matches.append({'id': pid, 'name': doc['name'], 'similarity': float(score)})
                    else:
                        matches.append({'id': pid, 'name': 'unknown', 'similarity': float(score)})
                except:
                    matches.append({'id': pid, 'name': 'unknown', 'similarity': float(score)})
            # sort by similarity desc (faiss already)
            return jsonify({'matches': matches}), 200
    except Exception as e:
        print(f"[faiss] search fallback brute: {e}")

    # Fallback brute (kept for backward compat, threshold 0.34)
    photo_collection = mongo.db.photos
    photos = photo_collection.find({"event_id": event_id})
    matches = []
    for photo in photos:
        try:
            db_embedding = np.array(eval(photo['embedding']))
        except:
            continue
        similarity = np.dot(query_emb, db_embedding) / (np.linalg.norm(query_emb) * np.linalg.norm(db_embedding))
        if similarity > 0.34:
            matches.append({'id': str(photo['_id']), 'name': photo['name'], 'similarity': float(similarity)})
    if matches:
        # sort desc
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        return jsonify({'matches': matches}),200
    else:
        return jsonify({'message': 'You are not Present In this event'}), 200



#-----------------------------------------------------------------------------------------------------
# API Endpoint to generate face embeddings
@app.route('/get_embedding', methods=['POST'])
def get_embedding():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    image_bytes = file.read()

    # Convert image bytes to an array
    img = load_image_from_bytes(image_bytes)

    if img is None:
        return jsonify({'error': 'Image could not be loaded'}), 400

    # Mock or real
    if HAS_INSIGHT:
        faces = app_insight.get(img)
        if len(faces) > 0:
            embedding = faces[0].embedding.tolist()
        else:
            return jsonify({'error': 'No face detected in the image'}), 400
    else:
        h=hashlib.md5(image_bytes).hexdigest()
        random.seed(int(h[:8],16))
        embedding=[random.uniform(-1,1) for _ in range(512)]
        norm=sum(x*x for x in embedding)**0.5
        embedding=[x/norm for x in embedding]
    # P1: optional FAISS index if caller provides event_id+photo_id
    event_id_q = request.form.get('event_id') or request.args.get('event_id')
    photo_id_q = request.form.get('photo_id') or request.args.get('photo_id')
    if event_id_q and photo_id_q:
        try:
            faiss_add(event_id_q, photo_id_q, embedding)
        except Exception as e:
            print(f"[faiss] add failed {e}")
    return jsonify({'embedding': embedding})
        else:
            return jsonify({'error': 'No face detected in the image'}), 400

@app.route('/faiss_stats', methods=['GET'])
def faiss_stats_route():
    event_id = request.args.get('event_id')
    if not event_id:
        return jsonify({'error': 'event_id required'}), 400
    return jsonify(faiss_stats(event_id))

if __name__ == '__main__':
     socketio.run(app, host='0.0.0.0', port=5001, debug=False, allow_unsafe_werkzeug=True)