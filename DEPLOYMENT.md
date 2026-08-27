# Deployment — Fyndr

> `pnpm compose:prod` for backend (Vercel for frontend) + Oracle manual `pm2` alternative.

## 1. Docker (recommended, one command)

### Dev (mongo + api + ml + web)
```bash
pnpm compose:dev   # docker compose -f docker-compose.dev.yml up --build
# → http://localhost:3000 web, 5000 api, 5001 ml, 27017 mongo
pnpm compose:logs
pnpm compose:down
```

### Prod (mongo + api + ml only, frontend on Vercel)
```bash
pnpm compose:prod  # docker compose -f docker-compose.prod.yml up --build -d
# frontend → Vercel: import `front-end`, env REACT_APP_API_URL=https://api.fyndr.in, REACT_APP_ML_URL=https://ml.fyndr.in
```

**Env for prod** (create `.env` or export):
```
JWT_SECRET=prod_random_32
EMAIL_USER=noreply@fyndr.in
EMAIL_PASS=app_password
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=fyndr
```

## 2. Oracle Always Free (current live `129.151.47.214`)

**Already running** `ssh fyndr` (`~/.ssh/config Host fyndr`):
```
pm2 list # api 5000, ml 5001, web 3000
mongod 8.0.31 systemctl
firewalld 3000/5000/5001 open
```

**Deploy new code:**
```bash
ssh fyndr
cd ~/pic-share
git pull
cd node-server-1 && npm install
pm2 restart all && pm2 save
# or docker:
# docker compose -f docker-compose.prod.yml up --build -d
```

**Open Security List** (OCI Console → VCN → Security List → Add Ingress `0.0.0.0/0` TCP `3000,5000,5001`): otherwise `curl -v 129.151.47.214:5000` timeout (firewalld open but cloud blocks).

**SSH tunnel workaround:**
```bash
ssh -L 3000:localhost:3000 -L 5000:localhost:5000 fyndr
# → http://localhost:3000 hits VPS
```

## 3. Vercel (frontend)

1. `vercel` → Import `shivbera18/Fyndr` → Root `front-end` → Build `CI=false npm run build` → Output `build`
2. Env: `REACT_APP_API_URL=https://129.151.47.214:5000` (or your domain `api.fyndr.in`), `REACT_APP_ML_URL` same `:5001`
3. Deploy → `https://fyndr.vercel.app`

For `api.fyndr.in` add `Caddy`/`Nginx` reverse proxy on Oracle: `api.fyndr.in → localhost:5000`.

## 4. Seeding

**Mongo seed (local + prod):**
```bash
# via API (tested):
curl -X POST http://localhost:5000/register -d '{"name":"Shiv","email":"shiv@fyndr.in","password":"shiv123"}'
curl -X POST http://localhost:5000/login -d '{"email":"shiv@fyndr.in","password":"shiv123"}' # → _id
curl -X POST http://localhost:5000/event -d '{"event_name":"Demo","created_id":"<id>","pin":"123456"}' # → eventId
curl -X POST http://localhost:5000/photo -F name=@front-end/public/images/wedding.jpg -F event_id=<eventId> -F upload_by=<id>
# check:
curl -X POST http://localhost:5000/in-event -d '{"_id":"<eventId>"}'
curl http://localhost:5001/faiss_stats?event_id=<eventId>
```

**Via script:**
```bash
node scripts/seed.js # creates Demo event + 1 photo (see scripts/seed.js)
# or mongo shell:
mongosh --eval "db.photos.find({event_id:'...'})"
```

**Backup/restore:**
```bash
bash scripts/backup.sh # mongodump → /tmp/fyndr-*.archive.age → rclone copy drive:Fyndr/backups/
mongorestore --archive=/tmp/fyndr-2026-08-27.archive
```

## 5. Health

```bash
curl http://127.0.0.1:5000/metrics | grep fyndr
curl http://127.0.0.1:5001/faiss_stats?event_id=test
curl "http://127.0.0.1:5000/queue/stats?event_id=test"
pm2 logs
```

See `cloud.md` for SSH, `ML_MODEL.md` for buffalo_s, `COST_ESTIMATION.md` for $1/mo.
