# Complete Deployment Guide: Vercel (Frontend) + Oracle Cloud (Backend Hybrid — Native + Docker Mongo)

> **Goal:** Deploy **Fyndr** without heavy Docker builds. Frontend on **Vercel** (GitHub-connected), backend on a single **Oracle Always Free VM (Ubuntu 22.04 LTS)** using **native Node 20 + Python venv + PM2 / `pnpm dev`** for API & ML, and **Docker ONLY for MongoDB**. Storage via **OCI Object Storage (S3-compatible) — India West Mumbai (`ap-mumbai-1`)**.

---

## 0. Architecture & Secret Map

### Architecture
```
[ Browser — Photographer / Guest (HTTPS) ]
        │
        ├─── (A) https://<your-app>.vercel.app  ──────────→  Vercel (React build from /front-end)
        │
        ├─── (B) Presigned PUT/GET  ─────────────────────→  OCI Object Storage  bmtrutilfkey / fyndr-photos (ap-mumbai-1)
        │              ▲
        │              │ (S3 SDK via @aws-sdk/client-s3, forcePathStyle)
        ▼              │
[ Oracle VM — Ubuntu 22.04 LTS — Always Free ]
  ┌─────────────────────────────────────────────────────┐
  │ Nginx 80/443 (Let's Encrypt)  ──proxy / → 127.0.0.1:5000 │
  │    Node API 5000 (PM2 or pnpm dev:api) ─┐           │
  │         │ internal FLASK_URL             ├──→ Flask ML 5001 (PM2 or pnpm dev:ml)
  │         ▼                                │         │
  │    MongoDB 27017 ◄───────────────────────┘     FAISS /tmp/fyndr_faiss
  │    ▲  (Docker: mongo:8, volume mongo_dev)               ▲
  └────┼────────────────────────────────────────────────────┘
       │  only 22/80/443 public — 5000/5001/27017 = 127.0.0.1
```

### Where Secrets Live — Cheat Sheet

| Platform | File / Location | Variables — copy exactly |
|---|---|---|
| **Vercel** → Project → Settings → Environment Variables | Vercel Dashboard only | `REACT_APP_API_URL` |
| **Oracle VPS** → `/home/ubuntu/app/node-server-1/.env` | On the VM, gitignored | `PORT`, `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `FLASK_URL`, `CORS_ORIGIN`, `EMAIL_USER`, `EMAIL_PASS`, `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_REGION` |
| **Oracle VPS** → `/home/ubuntu/app/flask-server-2/.env` | On the VM, gitignored | `PORT`, `MONGO_URI`, `FAISS_BASE` |
| **Local dev** → `/.env` (root) | Gitignored, for `scripts/test-oci.js` | Same OCI keys as above, but never committed — see `.env.example` for template |

> The top-level `.env.example` (India West Mumbai `ap-mumbai-1` pre-configured) is the **template**. The real `.env` files are **never committed** — `.gitignore` already covers `.env`, `node-server-1/.env`, `front-end/.env`, `flask-server-2/.env`.

---

## Part 1 — OCI Object Storage (Mumbai) — Get Your Keys

You already created `fyndr-photos` — this confirms your values:

- **Namespace:** `bmtrutilfkey` (from Buckets → General → Namespace)
- **Bucket:** `fyndr-photos` (Public, Standard, `ap-mumbai-1`)
- **Bucket OCID:** `ocid1.bucket.oc1.ap-mumbai-1...` ✅ confirms region `ap-mumbai-1`
- **Correct S3 endpoint for your tenancy:**
  ```
  https://bmtrutilfkey.compat.objectstorage.ap-mumbai-1.oraclecloud.com
  ```

### 1.1 Generate / Re-use Customer Secret Keys
1. OCI Console → top-right **Profile icon → My profile** (or **Identity → Domains → Default → Users → Shiv Ratan**).
2. Left sidebar → **Resources → Customer Secret Keys** → **Generate Secret Key** (name: `fyndr-s3-key`).
3. **Secret Key** (base64 with `=`) appears **once** → copy to `R2_SECRET_KEY`.
4. **Access Key** (alphanumeric, **no** `=`, stays in table) → copy to `R2_ACCESS_KEY`.

> **Previous test failed** with `AuthorizationHeaderMalformed` because both keys were set to the same Secret. They must be different values.

### 1.2 Final OCI env block (for the VPS — Mumbai)
```env
R2_ENDPOINT=https://bmtrutilfkey.compat.objectstorage.ap-mumbai-1.oraclecloud.com
R2_ACCESS_KEY=<paste Access Key from table>
R2_SECRET_KEY=<paste Secret Key shown once>
R2_BUCKET=fyndr-photos
R2_REGION=ap-mumbai-1
```
Test locally before deploying:
```bash
node scripts/test-oci.js
# expect: ✅ HeadBucket 200, ✅ ListObjects count=0, ✅ PutObject OK
```

---

## Part 2 — Oracle VM — Provision (Ubuntu 22.04 LTS)

### 2.1 Create the Instance
- **Compute → Instances → Create Instance**
- Image: **Canonical Ubuntu 22.04 LTS** (AMD or Ampere A1 — 4 OCPU / 24 GB works)
- Shape: VM.Standard.E4.Flex or VM.Standard.A1.Flex
- Network: **Assign public IPv4**
- SSH: upload your public key → save private key as `~/.ssh/fyndr_oracle.key` (`chmod 600`)

Note the **Public IP** (e.g. `129.151.47.214`).

### 2.2 Open Only Web Ports (Security List — no 5000/5001)
- Instance → **Subnet** → **Default Security List** → **Add Ingress Rules**
  - `0.0.0.0/0` TCP `80, 443` (22/SSH already open)
- **Do NOT open** `5000`, `5001`, `27017` — they stay on `127.0.0.1` behind Nginx.

### 2.3 SSH In
```bash
chmod 600 ~/.ssh/fyndr_oracle.key
ssh -i ~/.ssh/fyndr_oracle.key ubuntu@<YOUR_PUBLIC_IP>
```

---

## Part 3 — Hybrid Stack on the Oracle VM (Native + Docker Mongo Only)

> No heavy `docker build` for Node/Python. Only Mongo runs in Docker — lightweight `mongo:8` image.

### 3.1 System Dependencies (Node, Python, Nginx, Docker, Certbot)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3 python3-pip python3-venv nginx certbot python3-certbot-nginx libgl1 libglib2.0-0 ca-certificates gnupg lsb-release

# Node 20 + pnpm + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm pm2
node -v && pnpm -v && pm2 -v

# Docker (for Mongo only)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# re-login or: newgrp docker
sudo systemctl enable --now docker
docker --version && docker compose version
```

### 3.2 MongoDB via Docker (lightweight — no native Mongo install)
The repo already has a `mongo` service in `docker-compose.dev.yml`. Use **only** that service:

```bash
cd /home/ubuntu
git clone https://github.com/shivbera18/Fyndr.git app
cd app

# Start only Mongo (healthy check built-in)
docker compose -f docker-compose.dev.yml up -d mongo --wait
docker ps  # → fyndr-mongo-dev healthy, 0.0.0.0:27017->27017

# Verify
docker exec fyndr-mongo-dev mongosh --eval "db.adminCommand('ping')"  # → { ok: 1 }

# For pnpm dev convenience, the repo includes scripts/ensure-mongo.js which auto-starts this if needed
```

> No `compose:dev` full build — that would pull api/ml/web images. Only `mongo` is used.

### 3.3 App Code & Native Deps
```bash
cd /home/ubuntu/app

# Node deps (root + backend)
pnpm install          # or npm install at root
npm install --prefix node-server-1 --production
npm install --prefix front-end   # only if you ever build frontend on the VM (not needed for Vercel)

# Python venv for ML
cd flask-server-2
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
```

### 3.4 Environment Files — What Goes Where

**A. Oracle VPS — `/home/ubuntu/app/node-server-1/.env` (Backend API):**
```bash
nano node-server-1/.env
```
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017/photo_sharing_db
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
FLASK_URL=http://127.0.0.1:5001
CORS_ORIGIN=https://<your-app>.vercel.app
# or during testing: CORS_ORIGIN=*

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_gmail_app_password

R2_ENDPOINT=https://bmtrutilfkey.compat.objectstorage.ap-mumbai-1.oraclecloud.com
R2_ACCESS_KEY=<paste Access Key from Customer Secret Keys table>
R2_SECRET_KEY=<paste Secret Key shown once>
R2_BUCKET=fyndr-photos
R2_REGION=ap-mumbai-1
```

**B. Oracle VPS — `/home/ubuntu/app/flask-server-2/.env` (ML service):**
```bash
nano flask-server-2/.env
```
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/photo_sharing_db
FAISS_BASE=/tmp/fyndr_faiss
```

**C. Local / Root `.env` (optional, for `scripts/test-oci.js` only):**
Already on your laptop at `/.env` — keep it gitignored. Use the same OCI block as above for testing. Never commit it.

> Template lives at `/.env.example` (Mumbai `ap-mumbai-1` pre-filled, with placeholders) — copy sections from there on the VM.

### 3.5 Run & Verify — Two Modes

**Quick dev test (uses `pnpm dev` — includes auto port-clean + mongo check):**
```bash
cd /home/ubuntu/app
pnpm dev
# → scripts/clean-ports.js frees 5000/5001/3000 from zombies
# → scripts/ensure-mongo.js checks 27017, auto `docker compose up -d mongo` if needed
# → concurrently: api 5000, ml 5001 (web 3000 not needed on VPS — stop it with Ctrl+C or run pnpm dev:api + dev:ml separately)
```
For VPS production, run only API + ML (skip web):
```bash
pnpm run dev:api & pnpm run dev:ml
# or: pnpm --filter fyndr dev:api  (if using workspaces)
```

**Production (PM2 — survives reboot, no Docker builds):**
Create `/home/ubuntu/app/ecosystem.config.js` (or keep the repo's):
```javascript
module.exports = {
  apps: [
    {
      name: 'fyndr-api',
      cwd: '/home/ubuntu/app/node-server-1',
      script: 'index.js',
      env: { NODE_ENV: 'production', PORT: 5000 },
      restart_delay: 3000,
      max_memory_restart: '1G',
    },
    {
      name: 'fyndr-ml',
      cwd: '/home/ubuntu/app/flask-server-2',
      script: 'app.py',
      interpreter: '/home/ubuntu/app/flask-server-2/venv/bin/python',
      env: { PYTHONUNBUFFERED: '1' },
      restart_delay: 3000,
      max_memory_restart: '3G',
    },
  ],
};
```
```bash
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 status  # → fyndr-api online, fyndr-ml online
pm2 logs --lines 50
# Mongo stays via Docker: docker ps → fyndr-mongo-dev Up (healthy)
```

### 3.6 Firewall on the VM (UFW — web only)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 3.7 Nginx Reverse Proxy (TLS terminates here — API & ML stay private)
```bash
sudo nano /etc/nginx/sites-available/fyndr
```
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # or <YOUR_PUBLIC_IP> for IP-only testing

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/fyndr /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# With a domain — HTTPS (required for Vercel HTTPS → no mixed-content):
sudo certbot --nginx -d api.yourdomain.com
# Without a domain (IP testing): keep http://<IP> and set REACT_APP_API_URL to http://<IP> (Vercel will warn mixed-content if Vercel is https — use domain for prod)
```

---

## Part 4 — Frontend on Vercel (Manual GitHub Connect)

You will connect manually — do this in the Vercel dashboard:

### 4.1 Import
1. https://vercel.com → **Add New… → Project** → **Import** `shivbera18/Fyndr`.
2. **Root Directory:** click **Edit** → select **`front-end`**.
3. **Framework Preset:** `Create React App` (or `Other` — auto-detected).
4. **Build Command:** `npm run build` (or `CI=false npm run build` if you see warnings-treated-as-errors)
5. **Output Directory:** `build`
6. **Install Command:** `npm install`

### 4.2 Environment Variables (Vercel → Project → Settings → Environment Variables)

**Only ONE variable is required for the frontend:**

| Variable | Value (Production) | When to use which |
|---|---|---|
| `REACT_APP_API_URL` | `https://api.yourdomain.com` | **With domain + certbot** — recommended, no mixed-content |
| `REACT_APP_API_URL` | `http://<ORACLE_PUBLIC_IP>` | **IP-only testing** — works but Vercel HTTPS → HTTP triggers browser mixed-content warning (add the VM IP to Vercel env as `http://...` and test via `http://` preview or add domain) |

> Do **NOT** add `REACT_APP_ML_URL` on Vercel — the browser never talks to Flask directly. The Node API proxies to `FLASK_URL=http://127.0.0.1:5001` internally.

Add more only if you need them:
- `CI` = `false` (if build fails on warnings)

Click **Deploy**. Vercel will build `front-end` and give you `https://<your-app>.vercel.app`.

After deploy, update the VPS `node-server-1/.env`:
```env
CORS_ORIGIN=https://<your-app>.vercel.app
```
Then `pm2 restart fyndr-api`.

---

## Part 5 — Smoke Test & Ongoing Ops

### 5.1 Verify Each Layer
```bash
# On the VPS
curl http://127.0.0.1:5000/metrics                 # → JSON metrics
curl http://127.0.0.1:5001/faiss_stats?event_id=test  # → ML alive
docker ps | grep fyndr-mongo-dev                  # → Up (healthy)
pm2 status                                        # → both online

# Via Nginx (public)
curl http://<YOUR_PUBLIC_IP>/metrics
curl https://api.yourdomain.com/metrics           # after certbot

# Via Vercel
open https://<your-app>.vercel.app
# → Home → Sign in → Create Event → Upload wedding.jpg → QR → phone selfie → matches
```

Check OCI bucket after upload:
- Console → **Storage → Buckets → fyndr-photos → Objects** → you should see `uploads/<eventId>/...`

### 5.2 Updating After `git push`
```bash
ssh ubuntu@<YOUR_PUBLIC_IP>
cd /home/ubuntu/app
git pull origin main
npm install --prefix node-server-1 --production
# if ML deps changed: source flask-server-2/venv/bin/activate && pip install -r flask-server-2/requirements.txt && deactivate
pm2 restart ecosystem.config.js   # or pm2 restart fyndr-api fyndr-ml
sudo nginx -t && sudo systemctl reload nginx  # only if nginx changed
```

### 5.3 Useful Commands
```bash
pm2 logs fyndr-api --lines 100
pm2 logs fyndr-ml --lines 100
docker logs fyndr-mongo-dev --tail 50
docker compose -f docker-compose.dev.yml logs mongo
node scripts/test-oci.js           # re-verify OCI from the VM (copy .env there temporarily or set env inline)
```

---

## Appendix — Why This Hybrid Is Light

- **No `docker build` for Node/Python** — avoids 1–2 GB images, slow ARM builds, and registry pushes. `pnpm install` + `venv` is seconds.
- **Only `mongo:8` is containerized** — tiny, official, health-checked, and already wired in `docker-compose.dev.yml` (just `up -d mongo`).
- **`pnpm dev` stays usable** on the VM via `scripts/clean-ports.js` + `scripts/ensure-mongo.js` (auto-frees 5000/5001, auto-starts Mongo). PM2 wraps the same `node`/`python` commands for production persistence.

> If you ever need full Docker again: `pnpm compose:dev` still works, but this guide is the lighter path you asked for.
