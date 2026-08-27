# AGENTS.md — Fyndr AI Agents

> For any AI agent (Claude, Codex, Cursor) working in this repo. Read `cloud.md` for secrets, `UPGRADE_PLAN.md` for roadmap.

## Quick Start

```bash
pnpm install
pnpm dev          # 5000 api + 5001 ml (mock) + 3000 web
# or
pnpm compose:dev  # docker: mongo + api + ml + web
# prod (Vercel frontend): 
pnpm compose:prod # mongo + api + ml only
```

## Services

| Service | Port | Health | Code |
|---------|------|--------|------|
| Mongo | 27017 | `mongosh --eval "db.adminCommand('ping')"` | `photo_sharing_db` |
| API | 5000 | `curl http://127.0.0.1:5000/metrics \| grep fyndr` | `node-server-1/index.js` |
| ML | 5001 | `curl http://127.0.0.1:5001/faiss_stats?event_id=test` | `flask-server-2/app.py` + `faiss_store.py` |
| Web | 3000 | `curl http://127.0.0.1:3000` | `front-end` |

## Tasks You Can Do

- **Fix bug:** `grep -r` then `read` then `edit` with tight `PUT N.=M:` ranges. Verify with `node --check` / `py_compile`.
- **Add feature:** Check `UPGRADE_PLAN.md` P1/P2 first — is it in plan? If not, discuss.
- **UI:** Use `shadcn` + `Tailwind`, not `antd`+`bootstrap`. See `plot.md` tokens `ink 950` etc.
- **ML:** `buffalo_s` `det 320` on CPU, `faiss_store.py` per-event, threshold `0.34`. Don't add GPU unless `queue wait>2h`.

## Docker

```bash
docker compose -f docker-compose.dev.yml up --build        # dev
docker compose -f docker-compose.prod.yml up --build -d   # prod
```

See `docker-compose.dev.yml` / `prod.yml` and `DEPLOYMENT.md`.

## Secrets

- SSH: `~/.ssh/fyndr_oracle` `600` + `~/.ssh/config Host fyndr` → `ssh fyndr` (don't use full path)
- Drive: `drive:Fyndr/secrets/fyndr_oracle.key.age` via `rclone` + `age` (see `GOOGLE_DRIVE_PLAN.md`)
- Do NOT commit `.env`, `*.key`, `venv/`, `node_modules/`, `build/`.

## Testing

```bash
pnpm test # tests/e2e.test.js → register→event→photo→metrics→faiss→match
```

## Git

- Author must be `shivbera18 <164228363+shivbera18@users.noreply.github.com>` to count (see `git config`).
- Squashed `init commit` — don't reintroduce `azeem` history.
- Push to `shivbera18/Fyndr` `main` — Oracle `ssh fyndr "cd ~/pic-share && git pull && pm2 restart all"`.

## ML Model

See `ML_MODEL.md` — InsightFace `buffalo_s` (SCRFD 320 + ResNet ArcFace 512) → FAISS cosine. Mock hash fallback when `insightface` not built.

## Deployment

`DEPLOYMENT.md` — Oracle Always Free, `pm2`, `firewalld`, Security List `3000/5000/5001`, Vercel frontend.

## Ask Before

- Adding new DB/queue/vector DB (needs metric).
- Changing `photo.embedding` String → vector (needs migration).
- Deleting `cloud.md`/`plot.md`.
