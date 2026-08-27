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

    photo_collection = mongo.db.photos
    photos = photo_collection.find({"event_id": event_id})
    

    matches = []
    for photo in photos:
        # print("for loop",photo)
        # Convert the string representation of the embedding back to a numpy array
        # Assuming photo['embedding'] is stored as a string representation of a list
        db_embedding = np.array(eval(photo['embedding']))  # Safely convert string to array

        # Calculate cosine similarity
        similarity = np.dot(faces[0].embedding, db_embedding) / (np.linalg.norm(faces[0].embedding) * np.linalg.norm(db_embedding))

        # Debugging output
        

        if similarity > 0.3:  # Adjust threshold as needed
            matches.append({'id': str(photo['_id']), 'name': photo['name'], 'similarity': similarity})

    if matches:
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
            return jsonify({'embedding': embedding})
        else:
            return jsonify({'error': 'No face detected in the image'}), 400
    else:
        # mock: deterministic pseudo-embedding from image hash (so same person similar)
        # use image bytes hash to generate stable 512-d vector
        h=hashlib.md5(image_bytes).hexdigest()
        random.seed(int(h[:8],16))
        embedding=[random.uniform(-1,1) for _ in range(512)]
        # L2 normalize
        norm=sum(x*x for x in embedding)**0.5
        embedding=[x/norm for x in embedding]
        return jsonify({'embedding': embedding})

if __name__ == '__main__':
     socketio.run(app, host='0.0.0.0', port=5001, debug=False, allow_unsafe_werkzeug=True)
