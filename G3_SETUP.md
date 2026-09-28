# G3 Desktop Setup (Windows)

G3 = S3-compatible server backed by Google Drive. One binary: panel `:8787` + S3 API `:9000`. SQLite holds metadata only; bytes live on Drive.

Source: local clone at `../g3-fork-check` (fork of upstream, no local delta).

## Prereqs

- Docker Desktop (recommended) **or** Go 1.26 + Node 24
- Google account
- AWS CLI for testing (`winget install Amazon.AWSCLI`)

## 1. Google Cloud (one-time, ~5 min, mandatory)

No OAuth = hollow shell (panel boots, S3 PUTs fail — `main.go:42`, `handlers_accounts.go:98`).

### A. Enable Drive API & Start Credential Wizard
1. Open [Google Cloud Console](https://console.cloud.google.com) → create or select a project (e.g. `g3-storage`).
2. Go to **APIs & Services → Enabled APIs & services** → click **+ ENABLE APIS AND SERVICES**.
3. Search for **Google Drive API** → click **Enable**.
4. Once enabled, click **CREATE CREDENTIALS** at the top right.

### B. "Create credentials" Wizard Walkthrough
Follow the wizard screens step-by-step:

#### Step 1: Credential Type (your current screen)
- **Which API are you using?**: Select **Google Drive API**.
- **What data will you be accessing?**:
  - Select **User data** *(DO NOT select Application data: G3 pools personal Drive quotas via OAuth user tokens; Service Accounts cannot access personal 15 GB Drive space without Google Workspace)*.
- Click **Next**.

#### Step 2: OAuth Consent Screen (Basic Information)
*(If you already created the consent screen earlier, GCP skips directly to Step 4)*
- **App name**: `G3 Storage` (or any label).
- **User support email**: Select your Google email from the dropdown.
- **App logo**: Skip (leave empty).
- **Developer contact information**:
  - **Email addresses**: Enter your Google email address.
- Click **Save and Continue**.

#### Step 3: Scopes
- Click **Add or Remove Scopes**.
- In the filter box, type `drive.file` and select:
  - `.../auth/drive.file` (*"See, edit, create, and delete only the specific Google Drive files you use with this app"*).
  - *Why this scope?* G3 only touches its dedicated `G3 Storage` folder on your Drive, never your private documents or photos.
- Click **Update** → click **Save and Continue**.

#### Step 4: OAuth Client ID
- **Application type**: Select **Web application** from the dropdown.
  *(DO NOT choose Desktop app — G3 runs a web server that receives the OAuth callback).*
- **Name**: `G3 Web Client` (or default).
- **Authorized JavaScript origins**: Leave blank.
- **Authorized redirect URIs**:
  - Click **+ ADD URI**.
  - Enter: `http://localhost:8787/api/accounts/callback`
  - *(CRITICAL: Exact match. `http`, `localhost:8787`, no trailing slash. If deploying on a remote domain later, change to `https://<domain>/api/accounts/callback`).*
- Click **Create**.

#### Step 5: Your Credentials
- Google will display your **Client ID** (ends in `.apps.googleusercontent.com`) and **Client Secret** (starts with `GOCSPX-`).
- Copy both values (or click **Download JSON** to store them locally).
- Click **Done**.

### C. Add Test Users (CRITICAL — do not skip!)
Because your project is in **Testing** status (unverified personal app), Google blocks all accounts not explicitly added here:
1. In the left sidebar, click **APIs & Services → OAuth consent screen** (or **Audience** in newer consoles).
2. Scroll down to **Test users**.
3. Click **+ ADD USERS**.
4. Enter the Google email address(es) you intend to link to G3 (your main account and any secondary accounts for pooling).
5. Click **Save**.
*(If omitted, linking an account inside G3 triggers `Error 403: access_denied / App not verified`).*
## 2. Run G3 (Docker, easiest)

```powershell
cd C:\Users\Shiv\desktop\g3-fork-check
docker build -t g3 .
docker run -d --name g3 `
  -p 127.0.0.1:8787:8787 -p 127.0.0.1:9000:9000 `
  -v g3-data:/data `
  -e G3_DEV=true `
  -e G3_ADMIN_EMAIL=you@example.com `
  -e G3_ADMIN_PASSWORD=change-me-strong `
  -e G3_GOOGLE_CLIENT_ID=... `
  -e G3_GOOGLE_CLIENT_SECRET=... `
  -e G3_GOOGLE_REDIRECT_URI=http://localhost:8787/api/accounts/callback `
  g3
docker logs g3 | Select-Object -First 20
```

Alternative (local binary, needs Go + Node in Git Bash):

```bash
cd /c/Users/Shiv/desktop/g3-fork-check
bash build.sh        # next export -> embed -> go build -> ./g3.exe
G3_DEV=true G3_ADMIN_EMAIL=you@example.com G3_ADMIN_PASSWORD=change-me-strong \
G3_GOOGLE_CLIENT_ID=... G3_GOOGLE_CLIENT_SECRET=... \
G3_GOOGLE_REDIRECT_URI=http://localhost:8787/api/accounts/callback \
./g3.exe
## 3. First login + link Drive

1. Open `http://localhost:8787` → login with admin email/password → change password
2. **Storage → Accounts → Add Google account** → consent with your Google account
3. Repeat for each account (each adds 15 GB free; balancer spreads load)

## 4. Bucket + access key

1. Panel → create bucket `fyndr-photos` (or via CLI below)
2. **Storage → Access Keys** → create → save key + secret

```powershell
$env:AWS_ACCESS_KEY_ID="<g3-key>"
$env:AWS_SECRET_ACCESS_KEY="<g3-secret>"
aws s3 mb s3://fyndr-photos --endpoint-url http://localhost:9000
"hello g3" | Out-File test.txt
aws s3 cp test.txt s3://fyndr-photos/ --endpoint-url http://localhost:9000
aws s3 ls s3://fyndr-photos/ --endpoint-url http://localhost:9000
```

Check Drive: each linked account now has a `G3 Storage` folder (app-scoped, `drive.DriveFileScope` — G3 only sees its own files).

## 5. Optional: point Fyndr at it

Fyndr `node-server-1/src/utils/r2.ts` already speaks path-style SigV4, so env-only:

```env
R2_ENDPOINT=http://127.0.0.1:9000
R2_ACCESS_KEY=<g3-key>
R2_SECRET_KEY=<g3-secret>
R2_BUCKET=fyndr-photos
R2_PUBLIC_ENDPOINT=https://129.151.47.214.sslip.io
```

### 6. Enable Direct Browser-to-G3 Upload (Nginx)

In `/etc/nginx/conf.d/fyndr.conf`, proxy `/fyndr-photos/` directly to G3 port 9000 without buffering:

```nginx
location /fyndr-photos/ {
    limit_except PUT GET HEAD OPTIONS { deny all; }
    proxy_pass http://127.0.0.1:9000;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50M;
    proxy_request_buffering off;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
}
```

Reload Nginx (`sudo nginx -t && sudo systemctl reload nginx`).
Now the browser PUTs directly to G3 via HTTPS, bypassing the Node server and multer disk buffer!
## Troubleshooting

| Symptom | Fix |
|---|---|
| `Drive not configured` in logs | `G3_GOOGLE_*` missing — container needs all three |
| 503 on Add account | Same as above |
| OAuth redirect mismatch | Redirect URI in GCP must exactly match env var |
| Unverified app screen | Normal for personal External apps; continue as test user |
| Data lost after `docker rm` | You dropped the `g3-data` volume — recreate + relink |

## Notes

- Encryption claim: only OAuth tokens are AES-GCM encrypted; object bytes on Drive are plaintext.
- Limits: 15 GB/account, 750 GB/day upload per account (balancer-aware), >64 MiB objects chunked across accounts.
- Personal use on own accounts via official API ≈ nil ban risk. Keep customer prod data on R2, not personal Gmail.
