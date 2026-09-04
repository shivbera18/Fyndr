# Local Setup — Fyndr (Complete)

> One-command dev, Docker alternative, seeding, troubleshooting. Works on Windows 11 + Oracle Linux aarch64.

## Prerequisites

- Node 20+, pnpm 9+ (`npm i -g pnpm`), Python 3.9+, MongoDB 8.0, Git
- Windows: `mongod` as service (`sc query MongoDB`), Python `venv` at `flask-server-2/venv/Scripts/python.exe`
- Oracle: `mongod` `systemctl`, Python `venv/bin/python`

## 1. One-Command Dev (recommended, no Docker)

```bash
git clone https://github.com/shivbera18/Fyndr.git
cd Fyndr  # pic-share
# first time:
npm install --prefix node-server-1
npm install --prefix front-end
python -m venv flask-server-2/venv
# Windows:
flask-server-2/venv/Scripts/pip install Flask Flask-Cors Flask-PyMongo Flask-SocketIO pymongo pillow numpy requests python-engineio python-socketio eventlet
# Linux/Mac:
# flask-server-2/venv/bin/pip install -r flask-server-2/requirements.txt

# create env
cat > node-server-1/.env <<EOF
JWT_SECRET=dev_secret_fyndr_local
EMAIL_USER=dummy@example.com
EMAIL_PASS=dummy
EOF

# run all 3 with one command:
pnpm dev          # or npm run dev
# → api  http://localhost:5000 (Node)
# → ml   http://127.0.0.1:5001 (Flask mock, InsightFace fallback)
# → web  http://localhost:3000 (React)
# logs: cyan api, magenta ml, green web

# Kill all:
# taskkill /F /IM node.exe && taskkill /F /IM python.exe  (Windows)
# pkill -f "node|python" (Linux)
```

**What `pnpm dev` does:** `concurrently` runs `npm run build --prefix node-server-1 && node node-server-1/dist/server.js` + `cd flask-server-2 && venv/.../python app.py` + `npm start --prefix front-end`.

## 2. Docker Dev (no local installs, except Docker)

```bash
pnpm compose:dev   # docker compose -f docker-compose.dev.yml up --build
# → mongo 27017, api 5000, ml 5001, web 3000
pnpm compose:logs
pnpm compose:down
```

`docker-compose.dev.yml` builds `node-server-1/Dockerfile`, `flask-server-2/Dockerfile`, `front-end/Dockerfile (dev)` and mounts `src` for hot reload.

## 3. Docker Prod (backend only, frontend on Vercel)

```bash
pnpm compose:prod  # docker compose -f docker-compose.prod.yml up --build -d
# → mongo + api + ml only
# frontend: Vercel import `front-end`, env REACT_APP_API_URL=https://api.fyndr.in REACT_APP_ML_URL=https://ml.fyndr.in
```

## 4. Seeding

**Via API (curl, tested):**
```bash
# Register
curl -X POST http://localhost:5000/register -H "Content-Type: application/json" -d '{"name":"Shiv","email":"shiv@fyndr.in","password":"shiv123"}'
# Login → _id
curl -X POST http://localhost:5000/login -H "Content-Type: application/json" -d '{"email":"shiv@fyndr.in","password":"shiv123"}'
# Create Event
curl -X POST http://localhost:5000/event -H "Content-Type: application/json" -d '{"event_name":"Demo","created_id":"<id>","pin":"123456"}'
# Upload (presigned or local)
curl -X POST http://localhost:5000/photo -F name=@front-end/public/images/wedding.jpg -F event_id=<eventId> -F upload_by=<id>
# Guest search
curl -X POST http://127.0.0.1:5001/match_faces -F image=@front-end/public/images/wedding.jpg -F event_id=<eventId>
```

**Via script (one command, creates Demo event + wedding.jpg):**
```bash
node scripts/seed.js
# → Guest: http://localhost:3000/collect/<eventId> PIN 123456
# Env: API_URL=http://127.0.0.1:5000 node scripts/seed.js
```

**Via Mongo shell:**
```bash
mongosh --eval "db.photos.find({event_id:'<id>'})"
mongosh --eval "db.events.find()"
```

**Reset:**
```bash
mongosh --eval "db.dropDatabase()" # in photo_sharing_db
# or
curl -X POST http://localhost:5000/delete-event -H "Content-Type: application/json" -d '{"_id":"<eventId>"}'
```

## 5. Frontend Manual Flow (after pnpm dev)

1. `http://localhost:3000` → Home → Get Started → `/login` → Register/Login
2. `/dashboard` → Create Event → `Demo` + PIN `123456` → card appears
3. Click event → `/in-event` → Upload Img → `wedding.jpg` → Submit → grid `http://localhost:5000/uploads/...`
4. Copy QR → `http://localhost:3000/collect/<eventId>` → PIN `123456` → `/camera` → Capture → matched photos

## 6. Health

```bash
curl http://127.0.0.1:5000/metrics | grep fyndr
curl http://127.0.0.1:5001/faiss_stats?event_id=test
curl "http://127.0.0.1:5000/queue/stats?event_id=test"
mongosh --eval "db.adminCommand('ping')"
node tests/e2e.test.js # full register→match
```

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| `EADDRINUSE 5000/3000/5001` | `netstat -ano \| findstr 5000` → `taskkill /PID <pid> /F` (Win) / `lsof -i :5000` → `kill` (Linux) |
| `mongod` not running | `sc query MongoDB` → `net start MongoDB` / `sudo systemctl start mongod` |
| `InsightFace ... No module named 'insightface'` | Expected on Windows/aarch64, mock handles it (deterministic hash). Real needs `pip install insightface onnxruntime` on x64 or WSL2 |
| `535 BadCredentials` email | Dummy `EMAIL_*`, handled `try/catch` → `Email skipped (local dev)` |
| `CI=true` build fail (eslint) | `CI=false npm run build --prefix front-end` (already in Dockerfile) |
| `faiss-cpu not available` | Fallback `numpy` brute, `faiss_store.py` handles both |
| `pnpm dev` no output | `npm run dev` same, check `concurrently` installed at root `npm install` |

See `DEPLOYMENT.md` for Oracle/Vercel, `ML_MODEL.md` for buffalo_s, `cloud.md` for `ssh fyndr`.
