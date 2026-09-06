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
| API | 5000 | `curl http://127.0.0.1:5000/metrics \| grep fyndr` | `node-server-1/src` → `dist/server.js` |
| ML | 5001 | `curl http://127.0.0.1:5001/faiss_stats?event_id=test` | `flask-server-2/app.py` + `faiss_store.py` |
| Web | 3000 | `curl http://127.0.0.1:3000` | `front-end` (Tailwind 3.4.4 + Radix + Vaul + `src/components/ui/*`) |

## Tasks You Can Do

- **Fix bug:** `grep -r` then `read` then `edit` with tight `PUT N.=M:` ranges. Verify with `node --check` / `py_compile` and full tests (can be skipped for trivial text/CSS-only changes).
- **Add feature:** Check `UPGRADE_PLAN.md` P1/P2 first — is it in plan? If not, discuss.
- **UI:** Pure Tailwind 3.4.4 + Radix UI + Vaul Drawer + Dub-style UI primitives (`front-end/src/components/ui/*`), not `antd`+`bootstrap` (purged). Ensure all touch targets are >= 44x44px.
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
pnpm test                                       # e2e: register→event→photo→metrics→faiss→match
npm --prefix front-end test -- --watchAll=false # web unit tests (3 suites, 6 tests)
npm --prefix node-server-1 run build            # backend tsc compilation
```

## Git & PR Review Workflow

- **Author:** Must be `shivbera18 <164228363+shivbera18@users.noreply.github.com>` to count (see `git config`).
- **PRs & Review:** Follow the mandatory PR review loop defined in [`pr-review-guidelines.md`](pr-review-guidelines.md) (Granular commits → PR → Review → Fix Loop → Merge).
- **Formal PR Reviews via `gh`:** NEVER use `gh pr comment` for reviews (it uses the Issue Comments API, which does NOT count toward PR reviews or review counts). ALWAYS use `gh pr review`:
  - Formal review comment: `gh pr review <PR-NUMBER> --comment -b "<REVIEW_BODY>"` (counts as a review on GitHub!)
  - Approve PR: `gh pr review <PR-NUMBER> --approve -b "<REVIEW_BODY>"`
  - Request changes: `gh pr review <PR-NUMBER> --request-changes -b "<REVIEW_BODY>"`
  - *Note on self-reviews:* GitHub disallows approving one's own PR, so PR authors/self-reviews must use `--comment -b "..."` to formally submit a review that counts on the PR timeline.
- **Granular Commits:** Make very small, granular, logical commits per change rather than large monolithic commits (e.g. typography/styles separate from components, separate from fixes, separate from docs). Every commit must have a clear descriptive message, pass checks, and use author `shivbera18 <164228363+shivbera18@users.noreply.github.com>`.
- **History:** Squashed `init commit` — don't reintroduce `azeem` history.
- **Deployment:** Push to `shivbera18/Fyndr` `main` — Oracle `ssh fyndr "cd ~/pic-share && git pull && pm2 restart all"`.

## ML Model

See `ML_MODEL.md` — InsightFace `buffalo_s` (SCRFD 320 + ResNet ArcFace 512) → FAISS cosine. Mock hash fallback when `insightface` not built.

## Deployment

`DEPLOYMENT.md` — Oracle Always Free, `pm2`, `firewalld`, Security List `3000/5000/5001`, Vercel frontend.

## Ask Before

- Adding new DB/queue/vector DB (needs metric).
- Changing `photo.embedding` String → vector (needs migration).
- Deleting `cloud.md`/`plot.md`.
