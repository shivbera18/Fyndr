# Cloud — Fyndr Infra & Secrets Vault

> Single source of truth for deploy. If laptop dies, this + Drive recovers everything. No plaintext secrets in git.

## 1. SSH Key — Hidden & One-Command

| Item | Value |
|------|-------|
| **Original (deleted)** | `C:\Users\Shiv\Downloads\ssh-key-2026-08-27 (1).key` (shredded via `shred -u`) |
| **Hidden (active)** | `C:\Users\Shiv\.ssh\fyndr_oracle` (Windows) `~/.ssh/fyndr_oracle` — `600` `SHIV-BERA\Shiv:(F)` only |
| **Pub** | `~/.ssh/fyndr_oracle.pub` (not needed, opc authorized_keys has it) |
| **Perms verify** | `icacls ~/.ssh/fyndr_oracle` → `Shiv:(F)` only; `ls -l` → `-rwx------` |
| **Config** | `~/.ssh/config` <br> `Host fyndr` → `HostName 129.151.47.214` `User opc` `IdentityFile ~/.ssh/fyndr_oracle` `IdentitiesOnly yes` <br> `Host fyndr-137` → `137.23.52.131` (old, timed out, keep for reference) |
| **Login** | `ssh fyndr` or `ssh fyndr "uname -a"` → `photo-app` |
| **Rotate** | `oci compute instance add-ssh-key` + update `~/.ssh/fyndr_oracle` every 90d |

Old keys still in `Downloads` (not Fyndr, keep): `ssh-key-2026-08-08.key`, `ssh-key-2026-08-11.key`, `ssh-key-2026-08-27.key` (different hash `02cea...` vs `b099...`), `quiz-app-aws.pem`.

## 2. Oracle Always Free VPS

| Item | Value |
|------|-------|
| **Host** | `photo-app` |
| **Public IP** | `129.151.47.214` (use `fyndr` alias) |
| **Old IP (dead)** | `137.23.52.131` (timeout, was in known_hosts 2026-08-11) |
| **OS** | Oracle Linux 9.8 `6.12.0-204.92.4.4.3.el9uek.aarch64` `aarch64` |
| **RAM/Disk** | 5.5Gi / 30G root (21G free) + 15G oled, swap 4G |
| **User** | `opc` (sudo) |
| **Region** | Stockholm? (known_hosts also `16.170.103.71` / `13.48.147.113` were AWS, not Oracle) |

### Services (pm2)
```
pm2 list
  fyndr-api    5000  node node-server-1/dist/server.js (deploy-backend.yml restarts only this)
  pic-share-ml 5001  python3 app.py (mock, InsightFace→mock hash, never restarted by API deploys)
  pic-share-web 3000 serve -s build -l 3000
pm2 save; sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u opc --hp /home/opc
```
- **Mongo** is a system service (`systemctl mongod`), NOT pm2/docker — deploys never restart it.
- **Node** `20.20.2` `npm 10.8.2` via nodesource 20.x
- **Python** `3.9.25` `pip 21.3` + `Flask 3.0.3` etc
- **Mongo** `8.0.31` `mongod` `systemctl enable --now mongod` → `mongosh --eval "db.adminCommand('ping')" {ok:1}`
- **Firewalld** `public` ports `3000,5000,5001,80,443` `firewall-cmd --permanent --add-port=...; --reload` ✅
- **Security List (OCI Console, still needed)** VCN → Security List → Ingress `0.0.0.0/0` TCP `3000,5000,5001` (currently blocked → `curl -v 129.151.47.214:5000` timeout). Until added, use `ssh -L 3000:localhost:3000 -L 5000:localhost:5000 opc@129.151.47.214` then `http://localhost:3000`.

### Test on VPS
```bash
ssh fyndr
curl -s http://127.0.0.1:5001/test_db_connection # {"message":"Database..."}
curl -s -X POST http://127.0.0.1:5000/register -d '{"name":"Shiv","email":"...","password":"..."}'
curl -s -X POST http://127.0.0.1:5000/photo -F name=@front-end/public/images/wedding.jpg -F event_id=... # mock 1.0
```

## 3. Local Dev (Windows 11)

| Item | Value |
|------|-------|
| **Path** | `C:\Users\Shiv\desktop\pic-share` (Fyndr) |
| **Mongo** | Windows service `mongod 8.2.4` `127.0.0.1:27017` |
| **Node Flask Frontend** | `node-server-1` 5000, `flask-server-2/venv` 5001, `front-end` 3000 |
| **Single command** | `pnpm dev` or `npm run dev` at root → `concurrently` api+ml+web (cross-platform `venv/Scripts/python || venv/bin/python`) |
| **Root pkg** | `package.json` `concurrently 8.2.2` `pnpm@9.0.0` `dev`, `dev:api`, `dev:ml`, `dev:web`, `build` |
| **Flask mock** | `InsightFace not available, using mock` deterministic `hashlib.md5 → 512-d` |
| **Verified flow** | Register `shiv_test@example.com` → login `6a8f95e5...` → event `Shiv Wedding Test 6a8f95eb...` PIN `123456` → upload `wedding.jpg` → `in-event` → `match_faces` `similarity 1.0` |

## 4. Git

| Item | Value |
|------|-------|
| **Repo** | `https://github.com/shivbera18/Fyndr.git` (was `azeemkhannn/...FYP`, now rebrand) |
| **Branch** | `main` single commit `init commit` (squashed, no prior author) |
| **Local** | `C:\Users\Shiv\desktop\pic-share` `git remote -v` → `origin shivbera18/Fyndr` |
| **Push** | `git push -u origin main` (credential manager, no token prompt) |

## 5. Google Drive Vault

- **Remote** `drive:` via `rclone config` OAuth
- **Path** `Drive/Fyndr/secrets/fyndr_oracle.key.age` + `.sha256`, `README.txt`
- **Encrypt** `age --passphrase -o fyndr_oracle.key.age fyndr_oracle` (passphrase in Bitwarden)
- **Upload** `rclone copy fyndr_oracle.key.age drive:Fyndr/secrets/`
- **Restore** `rclone copy drive:Fyndr/secrets/fyndr_oracle.key.age ~/.ssh/ && age -d -o fyndr_oracle`
- **Cost** $0 15GB free, <2KB file

## 6. Costs & Next

- **Free tier** `$1/mo` 5×5k, `$14.90` 20×20k (see `COST_ESTIMATION.md`), Oracle Free + R2 10GB free
- **TODO** Add OCI Security List ingress, then `http://129.151.47.214:3000` public
- **Docs** `plot.md` (SSH plot), `GOOGLE_DRIVE_PLAN.md` (rclone/age steps), `LOCAL_SETUP.md` (curl flow), `IMPROVEMENT_PLAN.md` (FAISS, Next+shadcn), `COST_ESTIMATION.md`, this `cloud.md`

*Last verified: 2026-08-27 — ssh fyndr → photo-app, pm2 3 online, local pnpm dev 3 ports LISTENING, git push ok.*
