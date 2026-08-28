# Fyndr — Project CLAUDE.md

> This file is project-specific for Claude/Agents working on Fyndr. Read before editing.

## What is Fyndr
Event photo SaaS: `Photographer uploads → QR → Guest selfie → find my photos`. No app, no password for guests. Wedding/event photographers, 5k–50k photos/event.

**Repo:** `shivbera18/Fyndr` (single `init commit` + P1/P2). **Live VPS:** `129.151.47.214` `opc` `ssh fyndr` (see `cloud.md`).

## Stack (free-first, no bloat)

| Layer | Tech | Why |
|-------|------|-----|
| Web | React 18 + Vite (migrating to Next.js 15 + Tailwind + shadcn) | Existing, single system |
| API | Node 20 + Express + Mongoose + Multer + JWT + prom-client | Already, $0 |
| ML | Flask + InsightFace mock → `buffalo_s` ONNX `SCRFD 320` + ArcFace 512-d, FAISS per-event `IndexFlatIP` + numpy fallback | Mock for CI, real on CPU 36m/50k |
| DB | MongoDB 8.0 (photo_sharing_db) + `/tmp/fyndr_faiss` files | PG-boss queue via `queue/mongoQueue.js` (hash UNIQUE) |
| Infra | Oracle Always Free `4 OCPU 24GB` `pm2`, R2 10GB free + Cloudflare | $0 → $1/mo 5×5k |

**ML pipeline (see ML_MODEL.md):** `640px preview → SCRFD detect (score>0.6, size>45) → align 112 → ArcFace 512 L2 → FAISS cosine 0.34 → re-rank`.

## Commands (single)

```bash
pnpm dev        # or npm run dev → concurrently api 5000 + ml 5001 + web 3000 (cross-platform)
pnpm compose:dev  # docker compose dev: mongo+api+ml+web (Vercel alternative)
pnpm compose:prod # docker compose prod: mongo+api+ml only (frontend on Vercel)
pnpm test       # e2e: register→login→event→photo→metrics→faiss
```

Ports: `5000 API`, `5001 ML`, `3000 WEB`, `27017 MONGO`. All `pnpm dev` via `concurrently`.

## Project Conventions

- **Git:** `init commit` squashed, `shivbera18 <164228363+shivbera18@users.noreply.github.com>` so counted. Small commits, branch PR.
- **Code style:** Delete before add (38MB `public/models` removed), `antd+bootstrap` → `shadcn` single system, `face-api.js` removed.
- **No new dep without metric:** Qdrant/Milvus/Kafka/K8s not until `queue wait>2h` or `p95>700ms`.
- **Security:** Guest selfie tmp 60s, `token_hash=SHA256`, `isVerified:true` local, `EMAIL_PASS` env.
- **Files to never edit blindly:** `cloud.md` (secrets), `~/.ssh/fyndr_oracle` (600), `node-server-1/.env`.

## Where to look

- `IMPROVEMENT_PLAN.md` — why not to fork Immich, what to reuse
- `UPGRADE_PLAN.md` — 5 phases P1 harden → P5 scale
- `LOCAL_SETUP.md` — curl-tested flow, `COST_ESTIMATION.md` → $1/mo
- `cloud.md` — SSH `fyndr`, Oracle, Drive vault
- `GOOGLE_DRIVE_PLAN.md` — `age+rclone drive:Fyndr/secrets`
- `plot.md` — hidden key plot

## Agent Rules

- Prefer `read` + `edit` over `write` new files.
- Run `node --check` / `python -m py_compile` before push.
- `pm2 restart` on Oracle after `git pull` (see `DEPLOYMENT.md`).
- Never commit `*.key`, `*.pem`, `.env`, `venv/`, `node_modules/`, `build/`.
- **One-command dev must stay working (`pnpm dev`)**.

## Worktree / Side-Agent Policy (strict opt-in)
- `pi-git-worktrees` (`wt_new`/`wt_send`/`wt_wait`/`wt_gather`) and `pi-side-agents` (`/agent`) are installed globally (`~/.omp/agent/config.yml` → `extensions-src/pi-git-worktrees`) but are **strictly opt-in**.
- Only use worktrees when the user explicitly says so in this turn (`use worktrees`, `/wt-new`, `/agent`, `worktree`, `side-agent`, `parallel worktrees` etc.). Otherwise use normal `task` + `hub` sub-agents (scout, interactive-worker, researcher) which already run in parallel without creating git worktrees.
- If you think worktrees would help but user didn’t ask, *ask* first via `ask` tool. Do not auto-create worktrees/branches.

## Current Branch

`main` `0e178c5 init commit` → `654114e` → `4379d80` → `d07b355` → `ecbdad4` — all counted as `shivbera18`.
