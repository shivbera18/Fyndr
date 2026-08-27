# Pic-Share — Local Setup & Tested Flow

All three services running on Windows 11, no Docker, no GPU, mock embeddings (no C++ build).

## Services & Ports

| Service | Port | Path | Status |
|---------|------|------|--------|
| MongoDB | 27017 | mongod service PID 5248 | Running |
| Node (Express) | 5000 | node-server-1/index.js | Running (node.log) |
| Flask (mock InsightFace) | 5001 | flask-server-2/app.py | Running (flask.log) |
| Frontend (React) | 3000 | front-end react-scripts | Compiling (slow, see below) |

Fixes applied:
- Flask 5000 -> 5001 (collision with Node), ctx_id 1 -> -1 (CPU)
- frontend CameraCaptureWithMask.js 5000/match_faces -> 5001
- node index.js flask URL 5000 -> 5001, transporter pass -> env.EMAIL_PASS
- new users isVerified:true (skip email), sendMail wrapped try/catch
- requirements.txt dlib file:// removed, mock InsightFace fallback

## Quick Start

```bash
# 1. Mongo — Windows service
node -e "require('mongoose').connect('mongodb://localhost:27017/photo_sharing_db').then(()=>console.log('mongo ok'))"

# 2. Node
cd pic-share/node-server-1
npm install
# .env already created with JWT_SECRET, EMAIL_USER dummy
node index.js # nohup node index.js > node.log 2>&1 &

# 3. Flask venv mock
cd ../flask-server-2
python -m venv venv
./venv/Scripts/pip install Flask Flask-Cors Flask-PyMongo Flask-SocketIO pymongo pillow numpy requests python-engineio python-socketio eventlet
./venv/Scripts/python app.py # http://127.0.0.1:5001/test_db_connection

# 4. Frontend
cd ../front-end
npm install
npm start # http://localhost:3000 ~60-90s first compile
# fast prod alternative:
npm run build && npx serve -s build -l 3000
```

## Tested Backend Flow (all OK)

Register:
```
POST http://localhost:5000/register {"name":"Shiv","email":"shiv_test@example.com","password":"shiv123"}
-> {"message":"Registration successful!"}
```

Login:
```
POST http://localhost:5000/login {"email":"shiv_test@example.com","password":"shiv123"}
-> {"_id":"6a8f95e5c8eba306a1ccbab1","name":"Shiv"}
```

Create Event:
```
POST http://localhost:5000/event {"event_name":"Shiv Wedding Test","created_id":"6a8f95e5c8eba306a1ccbab1","pin":"123456"}
-> {"event_name":"Shiv Wedding Test","_id":"6a8f95ebc8eba306a1ccbab5"}
```

List my events:
```
POST http://localhost:5000/display_event {"userId":"6a8f95e5c8eba306a1ccbab1"}
-> [{"_id":"6a8f95ebc8eba306a1ccbab5",...}]
```

Upload (Node -> Flask mock get_embedding -> Mongo):
```
POST http://localhost:5000/photo -F name=@wedding.jpg -F event_id=6a8f95ebc8eba306a1ccbab5 -F upload_by=...
-> [{"name":"...wedding.jpg","embedding":"[...]"}]
```

Guest selfie search (same image -> 1.0):
```
POST http://127.0.0.1:5001/match_faces -F image=@wedding.jpg -F event_id=...
-> {"matches":[{"id":"...","name":"...","similarity":1.0}]}
```

Verified: Node log `Email skipped (local dev)` expected with dummy, Flask log `InsightFace not available, using mock embeddings`.

## Frontend Manual Flow

1. http://localhost:3000 -> Home -> Get Started -> /login -> Register/Login
2. /dashboard -> Create Event -> Shiv Wedding Test + PIN 123456 -> card appears
3. Click event -> /in-event -> Upload Img -> select wedding.jpg -> Submit -> grid shows image from http://localhost:5000/uploads/...
4. Copy QR/link -> http://localhost:3000/collect/6a8f95ebc8eba306a1ccbab5 -> enter PIN 123456 -> /camera
5. /camera -> Allow camera -> Capture & Match -> matched photos -> Download

If npm start hangs: `npm run build` (~90s) then `npx serve -s build -l 3000`.

## Troubleshooting

- Port 5000 in use: netstat -ano | findstr 5000 -> taskkill /PID <pid> /F
- Mongo: sc query MongoDB -> net start MongoDB
- Flask insightface build fail: expected on Windows, mock handles it. Real embeddings need WSL2 Ubuntu.
- Email 535: dummy creds, handled.
- Upload timeout: mock instant, real ~200ms/photo CPU.
- No face detected: mock never fails.

## Next Improvements (see IMPROVEMENT_PLAN.md)

- Presigned R2 6x concurrent + pg-boss queue (replace sequential loop)
- Delete public/models 38MB + bootstrap, migrate to Next.js+Tailwind+shadcn
- Replace eval(photo.embedding) brute with FAISS per-event IndexFlatIP
- Postgres+pgvector or FAISS file for 5k-50k scale
