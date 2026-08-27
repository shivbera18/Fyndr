# Fyndr — Event Photo Sharing with Face Recognition

> **Photographer uploads → QR → Guests selfie → Instantly find their photos.** No app, no password.

Built by **Shiv Bera** — production-grade SaaS for wedding & event photographers. Guests scan a QR, take a selfie, and browse/download only their photos in seconds.

🌐 **Live:** `https://fyndr.in` (soon) · 📸 **Demo Event:** `fyndr.in/e/demo` · 🔑 **Oracle VPS:** `129.151.47.214`

---

## Why Fyndr
Weddings have 5,000–50,000 photos. Guests want theirs now, not a 10GB ZIP a week later. Fyndr gives them a private, fast, beautiful gallery.

- **For photographers:** Create event, upload ZIP/photos, share QR/link, track views/downloads.
- **For guests:** Open link, allow camera, one selfie → masonry grid of *only* their photos → select → Download ZIP.

## Features
- 🔐 Photographer auth + PIN-protected events + 90-day auto-expire
- 📤 Bulk upload (presigned) + progress + face indexing
- 🔍 Selfie search (SCRFD + ArcFace 512-d, faiss per-event) — mock on CPU, buffalo_s on GPU
- 🖼️ Thumbs 512 + preview 2048 WebP + CDN
- 📱 No account for guests, mobile-first, QR + link
- 🔒 Selfie never stored (60s tmp), embeddings hashed, GDPR consent wall

## Stack
- **Frontend:** React 18, React Router, AntD, Bootstrap → migrating to Next.js + Tailwind + shadcn (see `plot.md`)
- **API:** Node.js 20 + Express + Mongoose + Multer + JWT
- **ML:** Flask + InsightFace (mock fallback) + ONNX `buffalo_s` → 512-d
- **DB:** MongoDB 8.0 + faiss per-event (pgvector ready)
- **Infra:** Oracle Always Free `4 OCPU 24GB` + pm2 + firewalld (see `LOCAL_SETUP.md`)

## Quick Start (local, 3 terminals)
```bash
# 1. Mongo (Windows service or mongod)
# 2. API
cd node-server-1 && npm install
echo "JWT_SECRET=dev_secret
EMAIL_USER=dummy@example.com
EMAIL_PASS=dummy" > .env
node index.js # → http://localhost:5000

# 3. ML (mock, no C++ build needed)
cd flask-server-2
python -m venv venv && ./venv/Scripts/pip install Flask Flask-Cors Flask-PyMongo Flask-SocketIO pymongo pillow numpy requests python-engineio python-socketio eventlet
python app.py # → http://127.0.0.1:5001/test_db_connection

# 4. Web
cd front-end && npm install && npm start # → http://localhost:3000
# prod: CI=false npm run build && npx serve -s build -l 3000
```

Tested flow: Register → Login → Create Event (PIN 123456) → Upload `wedding.jpg` → Guest `http://localhost:3000/collect/<eventId>` → selfie → `similarity 1.0` match.

See `LOCAL_SETUP.md` for curl-tested steps and `IMPROVEMENT_PLAN.md` for $0→production roadmap.

## Deploy (Oracle)
```bash
ssh fyndr  # via ~/.ssh/config Host fyndr → opc@129.151.47.214
cd ~/pic-share && git pull
pm2 restart all && pm2 save
```
Open Security List ingress `3000,5000,5001` then `http://129.151.47.214:3000`.

## Roadmap
- Next.js + Tailwind sleek UI (Stripe/Linear) — 8pt grid, dark dashboard, light guest
- R2 + Cloudflare CDN + postgres pg-boss queue (see `COST_ESTIMATION.md` → $1/mo 5×5k)
- Real buffalo_s ONNX on CPU, faiss per-event, re-rank
- Payments, analytics, 7-day original delete

## License
MIT — © 2026 Shiv Bera, Fyndr.

## Contact
Shiv Bera — shiv@fyndr.in — https://github.com/shivbera18
