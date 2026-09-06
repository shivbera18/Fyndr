# Fyndr — Camera-to-Cloud ("Live Upload") — Full Build Spec

> **Status:** plan only, nothing built yet. Target reviewers: whoever implements
> v0/v1 (backend + dashboard + field test).
>
> **One-line pitch:** the photographer's camera uploads every shot to Fyndr
> over venue Wi-Fi as it is taken, so guest galleries fill up *during* the
> event — no card readers, no laptop, no midnight bulk upload.
>
> **Competitor reference:** FotoOwl **Beam** — unique FTP credentials generated
> in their dashboard, typed once into the camera's network settings,
> auto-transfer on shutter, "photos in your gallery within seconds"
> ([fotoowl.ai/products/beam](https://fotoowl.ai/products/beam),
> [homepage](https://fotoowl.ai/)). Beam covers Canon / Sony / Nikon bodies,
> desktop clients (FileZilla, Cyberduck, Explorer, Canon CTP, Nikon NX), FTP
> and SFTP flavors, per-body video tutorials, and is positioned at sports
> tournaments, award ceremonies, speaker events, and music festivals. This
> spec matches that UX beat-for-beat and integrates deeper (face search +
> paywall + selection + analytics ride along for free, because ingest feeds
> the existing pipeline).
>
> **Fyndr fit:** ingest already exists — `POST /photo` (multer disk, 100
> files, 50MB cap, `node-server-1/src/routes/photos.ts`) → SHA hash →
> `enqueue(event_id, hash)` (`src/queue/mongoQueue.ts`, UNIQUE on
> `{event_id, hash}`) → ML face worker → R2 bucket `fyndr-photos`
> (`src/utils/r2.ts`, local fallback when env unset). Camera FTP only adds a
> new *door* into the same funnel. **No new DB, no new queue, no new CDN.**

---

## 1. How cameras actually talk (read this before designing anything)

Cameras are dumb mid-2000s FTP clients. Every decision below traces to this table:

| Fact | Design consequence |
|---|---|
| Pro bodies (Canon R5/R6/R3/1DX III, Nikon Z6–Z9 + WT, Sony A1/A7/A9) speak **FTP and FTPS-explicit**. Only the newest bodies do **SFTP**. The average Indian wedding studio body does **not** do SFTP. | v1 MUST be **FTP + FTPS-explicit on port 21**. SFTP is v3, on demand. |
| Per file: open PASV data connection → STOR → close. No checksum, no resume, no temp-name-then-rename, no completion callback. | The server detects completion itself (§6): `CLOSE_WRITE` + size-stable sweep. |
| Filenames are `IMG_0001.JPG`, counters reset per card. Two shooters collide within minutes. | Identity = content hash, never filename (§6.3). Our queue UNIQUE already enforces this. |
| No API/webhook on the camera. It pushes files into a folder, blind. | Event mapping lives in the **login → folder** binding. All smarts server-side. |
| Auto-transfer fires on **every shutter press**: bursts, test shots, floor shots. 10–20 fps bursts × 3 shooters. | Absorb bursts (disk shock absorber §5.5), dedupe free via queue, auto-cull in v2. |
| Venue Wi-Fi routinely has client isolation / captive portals / 2.4GHz-only cameras on 5GHz networks. | Setup guide leads with phone-hotspot (§8); FileZilla self-test step (§8.4); tether-app is v3. |
| RAW+JPEG / RAW-only transfer options exist; RAW = 25–45MB/file. | v1 = **JPEG-only**. Face pipeline downsizes to 640px previews anyway — RAW buys nothing but upload time. |
| TLS support varies: most bodies do FTPS-explicit; some old ones only plain FTP; cert validation is often "accept any" or fingerprint-pin. | Force TLS by default; per-login plain-FTP escape hatch (default OFF, dashboard warns). Use a public Let's Encrypt cert so fingerprint-pinning bodies work. |
| Keepalive/idle: cameras hold the control connection open for hours, send NOOP rarely. NATs kill idle connections; cameras usually reconnect silently, some don't. | vsftpd `idle_session_timeout=600` + photographer guidance ("if the LINK lamp goes out, half-press shutter to reconnect"). Watcher `lastSeenAt` exposes silent drops (§7.3). |

---

## 2. Architecture decision (and rejected alternatives)

```
Camera --FTPS:21--> vsftpd (/srv/fyndr-ftp/evt_<id>/) --CLOSE_WRITE--> watcher (in node-server-1)
  --> sha256 --> enqueue(event_id, hash) ............ [EXISTING queue]
  --> move to UPLOAD_DIR ............................ [EXISTING layout]
  --> ML face pipeline .............................. [EXISTING]
  --> R2 fyndr-photos ............................... [EXISTING]
  --> SSE photo.created --> guest gallery + dashboard LIVE ... [NEW, §7]
```

| Option | Verdict |
|---|---|
| **A. `vsftpd` on Oracle VPS + per-event chroot users + watcher → existing queue (this spec)** | ✅ ~30MB RAM, $0, `apt install` away. Files land on disk we control. |
| B. Managed gateway (AWS Transfer Family, SFTPGo Cloud) | ❌ ~$220/mo idle + per-GB. Violates the free-first stack rule (`IMPROVEMENTS.md` P-rule: no new infra without metric). Revisit if FTP ops ever hurt. |
| C. Poll Canon image.canon / Sony Creators' Cloud | ❌ Per-shooter OAuth, minutes of polling lag, vendor lock. Kills the "seconds" promise. |
| D. Skip FTP, build phone-tether app first | ❌ A whole mobile product before validating demand. Correct as v3 reach play, wrong as v1. |

---

## 3. Credential & isolation model (exact schema)

**One login per event per shooter.** Username `evt_<6-char-id>[_b|_c]`, 24-char
random password shown once at creation (API-key semantics).

```ts
// addition to node-server-1/src/models/Event.ts
ftp: {
  enabled: { type: Boolean, default: false },
  logins: [{
    _id: false,
    tag: { type: String, default: "a", maxlength: 8 },          // shooter label
    username: { type: String, required: true, unique: true },   // evt_ab12cd, evt_ab12cd_b
    passwordHash: { type: String, required: true },             // SHA256 hex, cf. token_hash convention
    createdAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: null },                  // watcher heartbeat per login
    bytesIn: { type: Number, default: 0 },                      // lifetime ingress counter
    allowPlain: { type: Boolean, default: false },              // legacy-body escape hatch
  }],
}
```

- **Isolation:** vsftpd `chroot_local_user=YES`, jail = `/srv/fyndr-ftp/evt_<id>/`.
  A leaked password exposes one event's inbound folder. Nothing else on the box
  is reachable (shells = `/usr/sbin/nologin`, no SSH for these users).
- **Never store plaintext.** Dashboard shows the password once; "Rotate"
  generates a new one (old dies immediately); "Revoke" deletes the login +
  kills its sessions (`vsftpd` virtual-user reload, §5.4).
- **Lifecycle:** logins die with the event. Nightly cron lists
  `Event.find({ "ftp.enabled": true, expiresAt: { $lt: now } })`, disables the
  vsftpd accounts, deletes `evt_*` system users with no active event. No
  leaked-password archaeology, ever.
- **Why per-event, not per-studio (Beam does per-user):** our sharing unit is
  the event (PIN, QR, expiry). Per-event creds inherit that lifecycle for free.

---

## 4. API surface (exact endpoints)

All under existing auth conventions (`created_id` owner check via
`checkEventOwner`, same as analytics routes).

| Method & path | Body / query | Behavior |
|---|---|---|
| `POST /events/:id/ftp/enable` | `{ created_id, shooters?: number (1–5) }` | Creates N logins, system users + jails (via a privileged helper, §5.4), returns `[{tag, username, password}]` **once**. Sets `ftp.enabled`. |
| `POST /events/:id/ftp/logins` | `{ created_id, tag }` | Adds one shooter login (max 5). Returns plaintext password once. |
| `POST /events/:id/ftp/logins/rotate` | `{ created_id, username }` | New password, old invalidated immediately. Returns new password once. |
| `DELETE /events/:id/ftp/logins` | `{ created_id, username }` | Revoke: delete login, kill sessions, remove system user if no logins remain. |
| `GET /events/:id/ftp/status` | `?created_id=` | `{ enabled, logins: [{tag, username, lastSeenAt, bytesIn, photosIn}], host, port }` — drives the dashboard LIVE card. Never returns hashes. |
| `GET /events/:id/live` | `?token=` (guest token or PIN-derived) | **SSE stream** of `photo.created` events (§7.2). Closes on event expiry. |

Error convention matches the codebase: `{ error: "..." }` + 400/403/404/409,
validated ObjectIds, `parseFlag`-style strict parsing for booleans.

---

## 5. Server setup (Oracle VPS — one-time, manual SSH, ~45 min)

Same secrecy class as `.env`: commands run on the box, never committed.

### 5.1 Packages & TLS
1. `sudo apt install -y vsftpd fail2ban inotify-tools`
2. Cert for `ftp.fyndr.in` via existing Let's Encrypt flow
   (`certbot --expand` if the API domain cert already exists — prefer one
   SAN cert covering both, fewer renewals to babysit).
3. Annotated `/etc/vsftpd.conf` (the whole FTP security posture in one file):
   ```ini
   listen=YES
   anonymous_enable=NO
   local_enable=YES
   chroot_local_user=YES
   allow_writeable_chroot=YES
   user_sub_token=$USER
   local_root=/srv/fyndr-ftp/$USER          # evt_ab12cd -> its own jail
   userlist_enable=YES
   userlist_file=/etc/vsftpd.userlist       # ONLY evt_* users may use FTP
   userlist_deny=NO
   # --- TLS: FTPS-explicit, what cameras expect on port 21 ---
   ssl_enable=YES
   rsa_cert_file=/etc/letsencrypt/live/ftp.fyndr.in/fullchain.pem
   rsa_private_key_file=/etc/letsencrypt/live/ftp.fyndr.in/privkey.pem
   force_local_logins_ssl=YES
   force_local_data_ssl=YES
   ssl_tlsv1=YES
   ssl_sslv2=NO
   ssl_sslv3=NO
   # --- cameras open a data connection per file ---
   pasv_enable=YES
   pasv_min_port=21100
   pasv_max_port=21110
   pasv_address=<VPS public IP>              # REQUIRED behind OCI NAT
   idle_session_timeout=600
   data_connection_timeout=120
   max_per_ip=10                             # 3 shooters + headroom, not a botnet
   ```
4. `/etc/vsftpd.userlist` contains only `evt_*` (plus a canary test user).
   System users `evt_*` created with `useradd -d /srv/fyndr-ftp/evt_<id> -s
   /usr/sbin/nologin -M evt_<id>` — no home skeleton, no shell, no SSH
   (sshd `DenyUsers evt_*` belt-and-braces).

### 5.2 Network (Oracle Cloud specifics — the step everyone forgets)
- OCI **security list** (subnet): ingress TCP 21 + 21100–21110 from `0.0.0.0/0`.
- Instance **iptables/firewalld**: same ports. `pasv_address` MUST be the
  public IP or cameras hang at `LIST` (classic behind-NAT failure; first
  thing to check when "camera connects but no files arrive").
- DNS: `A ftp.fyndr.in → <VPS IP>`.

### 5.3 Abuse control
- **fail2ban** `vsftpd` jail: 5 bad logins → 1h ban. (A typo'd camera password
  retries forever; without this the logs drown and the ban list is the only
  symptom you'll ever see.)
- Per-IP connection cap (`max_per_ip=10`) + per-login rate visible via
  `bytesIn` spikes in dashboard (a runaway body re-sending its card shows up
  as one login doing 10× the others — revoke + call the shooter).

### 5.4 Privilege boundary (important)
Node must create system users, but Node must not run as root. Pattern:
`node-server-1/scripts/ftp-user.sh {add|del|passwd} <username> [hash]` —
a 40-line root-owned `sudo`-whitelisted script (`/etc/sudoers.d/fyndr-ftp`:
`opc ALL=(root) NOPASSWD: /opt/fyndr/scripts/ftp-user.sh *`). Node calls it
via `execFile` (never string-interpolated shell), passes the **bcrypt/SHA
hash**, never the plaintext. The script validates `^evt_[a-z0-9]{6}(_[b-e])?$`
and refuses everything else. This keeps the blast radius to exactly one
auditable file.

### 5.5 Disk: the shock absorber
- 5k JPEGs × ~8MB ≈ **40GB per big wedding** — bigger than the boot volume's
  free space. Attach a **50GB OCI block volume** (Always Free pool = 200GB)
  mounted at `/srv/fyndr-ftp`.
- Files here are **transient** (watcher moves them to the R2 pipeline within
  seconds). The volume absorbs bursts (3 shooters × 20fps × 8MB ≈ 5MB/s
  sustained worst case — trivial for block storage) and camera re-sends, not
  permanent storage. Alert (not page) at 80% full.
- Nightly cron: `find /srv/fyndr-ftp -name '*.part' -mmin +1440 -delete`
  (stale partials), drop system users with no live event.

---

## 6. The watcher (the only new backend logic, ~100 lines)

### 6.1 Completion detection (the whole game — cameras never say "done")
1. Primary: `inotify` `CLOSE_WRITE` on `/srv/fyndr-ftp/evt_*/` (Node
   `fs.watch` non-recursive, one watcher per active event dir, or a tiny
   Python sidecar if `fs.watch` proves flaky under burst create storms —
   decide at build, keep boring).
2. Safety net: 5s sweep — `readdir` + stat; a file whose size is identical on
   two consecutive sweeps AND older than 10s counts as complete. Catches
   everything missed during restarts/deploy redeploys.
3. **Never enqueue a file younger than 10s or still growing.** A half-file
   through the face pipeline = garbage embeddings + a guest-visible corrupt
   thumb. Patience here is correctness.

### 6.2 Per-file flow (pseudocode, runs in `node-server-1`)
```
onCompleteFile(loginDir, filename):
  eventId = parse(loginDir)                    # evt_ab12cd -> event _id lookup (cache map)
  if ext not in {.jpg,.jpeg}: recordSkipped(eventId, filename); return
  hash = sha256(file)
  try: job = enqueue(eventId, hash)            # UNIQUE {event_id,hash} -> dupes are free no-ops
  catch DuplicateKey: delete(file); return
  dest = UPLOAD_DIR/eventId/<hash><ext>        # layout ML worker already consumes
  rename(file, dest)                           # same volume? NO (block vol vs UPLOAD_DIR) -> copy+unlink
  touchLoginHeartbeat(username)                # throttled: max once per 30s per login
  emitLive(eventId, { photoId: job.photo_name, at: now })   # SSE (§7.2), fire-and-forget
```
- Crash safety: watcher holds **zero state**. Restart = full sweep of all
  `evt_*` dirs. A photo is never lost, at worst delayed past a deploy.
- Runs **in-process** (`startFtpWatcher()` from `server.ts`, active only when
  `FTP_WATCH_DIR` env set; local dev unaffected). One process, one pm2 log.

### 6.3 Collision, dupe & ordering policy
| Case | Rule |
|---|---|
| Same filename, different bytes (two `IMG_0001.JPG`) | Disk name gets `_<tag>_<n>` suffix; **identity is the hash**. |
| Same bytes re-sent (camera retry, card re-transfer) | Queue UNIQUE → no-op + delete. `$0` cost. |
| Out-of-order arrival | Gallery sorts by `createdAt` (arrival), never EXIF. Camera clocks lie. |
| RAW/HEIC/video | Ignored, counted as `ftp.skipped` (dashboard: "12 files skipped — set camera to JPEG transfer"). Never silent, never fatal. |

---

## 7. Live gallery push (what makes it *feel* instant)

FTP without live UI is just a faster uploader. Beam's promise — "guests see
new shots within seconds" — needs a push channel:

- **Transport: Server-Sent Events**, `GET /events/:id/live`. Plain HTTP,
  survives venue proxies, auto-reconnects natively (`EventSource`), ~50
  lines reusing the existing Node process. No WebSocket server, no Redis —
  single VPS: in-process emitter fed by watcher callbacks + a 2s Mongo
  `Photo`-poll fallback so API restarts don't stall the stream.
- **Event catalog (v1):** `photo.created { photoId, thumbUrl, folder }`,
  `ingest.heartbeat { photosIn, lastSeenAt }` every 15s (drives LIVE dots),
  `event.locked` (selection locked → gallery banner). That's the whole
  protocol; extend, don't redesign, for v2.
- **Guest UI:** `/select/:eventId` + selfie-results subscribe; new thumbs
  prepend under a **"N new photos ↓" pill** (tap to jump; never auto-scroll
  hijack — that's the classy version). Failed match? New thumbs carry
  embeddings already, so re-running the guest's selfie against them is one
  FAISS query — "check new photos against my selfie" button, cheap.
- **Studio UI:** LIVE dot (green <60s, amber <5m, grey otherwise) + rolling
  counter on the Camera Upload card — doubles as the "is my camera still
  connected?" confidence signal.
- **v2 reuses this stream untouched** for the venue-TV slideshow
  (`/e/:token/live`, P1-17): fullscreen auto-advance from the same events.

---

## 8. Photographer setup guides (ship in-product, per brand)

Dashboard "Camera Upload" card → brand tabs. Menus vary by body; these are
the canonical paths (verify against one real body per brand in field test):

- **Canon (R5/R6/R3):** `Menu → Network (yellow) → Connection settings →
  SET* → Communication settings → FTP` → server `ftp.fyndr.in:21`, login,
  FTPS, PASV → `Transfer settings → Auto transfer: ON`, `Transfer type:
  JPEG only`. LINK lamp solid = connected.
- **Nikon (Z8/Z9, WT or built-in):** `Setup/Network → Connect to FTP server
  → New` → address/login/FTPS-explicit/PASV → `Auto upload: ON`.
- **Sony (A1/A7IV/A9III):** `Network → Transfer/Remote → FTP Transfer Func
  → Server Setting` → host/login/FTPS → `Auto FTP Transfer: ON`.
- **Universal 4-step strip** (Beam parity, shown above brand tabs):
  1) camera to Wi-Fi (or phone hotspot — **say this first**, venue Wi-Fi
  isolation is the #1 field failure), 2) enter the 3 credential fields,
  3) auto-transfer ON + JPEG-only, 4) take a test shot → dashboard counter
  moves within ~10s.
- **Laptop self-test (no camera needed):** FileZilla/Cyberduck quick-connect
  with the same creds + drop 10 photos. This validates server/TLS/ports/
  watcher end-to-end and is also the v0 dogfood procedure (§10).

---

## 9. v2/v3 (specced now so v1 doesn't block them, built later)

- **v2 — quality + spectacle:** RAW+JPEG sidecar pairing (match by basename,
  keep JPEG for pipeline); burst-dedupe/auto-cull sidecar (pHash + Laplacian
  sharpness via the already-shipped `onnxruntime`, ~10MB/photo peak);
  `/e/:token/live` TV slideshow off the §7 stream.
- **v3 — reach:** phone-tether companion app (camera USB/Wi-Fi → phone →
  existing presigned-PUT `getPresignedPut` in `r2.ts` — no FTP involved,
  captures non-FTP body owners); SFTP subsystem if newest-body owners demand
  it (OpenSSH `internal-sftp` chroot, same jail layout, same watcher).

**Non-goals (don't sneak in):** vendor-cloud polling, video ingest,
in-camera gallery management, Lightroom-tether (that's desktop-watcher
territory, separate spec).

---

## 10. Build & rollout plan (worktree-friendly slices)

| Slice | Owner shape | Acceptance |
|---|---|---|
| v0 dogfood: vsftpd + 1 login + FileZilla → gallery | backend, VPS SSH | 100-photo burst all arrive, `enqueue` UNIQUE verified by re-upload, no UI |
| v1a: `Event.ftp` schema + 5 endpoints (§4) + `ftp-user.sh` + sudoers | backend | tsc clean, owner-check tests, wrong-PIN-equivalent 403s |
| v1b: watcher + completion logic + skipped-counter | backend | half-file never enqueued (kill transfer mid-way test), restart sweep test |
| v1c: dashboard card + creds QR + brand guides + LIVE status | frontend | copy-buttons, rotate/revoke round-trip, amber/grey dot states |
| v1d: SSE endpoint + guest "N new" pill + studio LIVE dot | full-stack | 2 browsers: shoot-simulator → pill appears <15s of enqueue |
| v1e: expiry cron + fail2ban + disk alerts + field test | ops | 1-hour test event auto-cut; real venue hotspot test with 1 body |
| Launch | marketing | "Fyndr Live Upload" card on landing next to FotoOwl-comparison copy |

**Rollback:** disable `ftp.enabled` per event (watcher ignores dir, vsftpd
user locked) — no deploy needed. Full revert = stop vsftpd + delete logins;
the rest of Fyndr never knew FTP existed.

---

## 11. Cost ledger (free-first compliance)

| Item | Cost |
|---|---|
| vsftpd + fail2ban + `inotify-tools` (apt) | $0 |
| 50GB block volume (inside 200GB Always Free) | $0 |
| Let's Encrypt SAN cert | $0 |
| R2 same bucket (egress free), existing Oracle box | $0 delta |
| New npm deps | **0** (fs.watch + execFile + existing queue) |

**Done = §10 v1e green.** Then market it before building v2 — demand for
RAW/cull/slideshow gets validated by real usage, not this doc.

---

### Sources
- Beam flow, 4 setup steps, brand + desktop-client coverage, vertical
  positioning: <https://fotoowl.ai/products/beam>
- Beam one-liner + product family context: <https://fotoowl.ai/>
- Beam per-body video tutorials (SFTP on R6 II, Cyberduck SFTP): playlist
  linked from the Beam page.
- Fyndr internals: `node-server-1/src/routes/photos.ts` (`POST /photo`),
  `src/queue/mongoQueue.ts` (`enqueue` UNIQUE), `src/utils/r2.ts`
  (`getPresignedPut`, `fyndr-photos`), `src/models/Event.ts` (`expiresAt`,
  `token_hash`), `src/middleware/upload.ts` (50MB, image filter).
