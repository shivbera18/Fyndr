# Plot: Secure SSH Key Storage & One-Command Login

## Goal
Hide Oracle VPS SSH key so `ssh fyndr` works without typing full `C:\Users\Shiv\Downloads\ssh-key-2026-08-27 (1).key` path, and survive laptop resets via encrypted Google Drive backup.

## 1. Current Risk
- Key in `Downloads` with space + `.key`, world-readable (`RX` for CodexSandboxUsers), checked into nothing but exposed to any app scanning Downloads.
- Every `ssh -i "C:\...\ssh-key-2026-08-27 (1).key" opc@129.151.47.214` leaks path in shell history.
- No backup → lose laptop = lose deploy access.

## 2. Target State
```
~/.ssh/fyndr_oracle        → 600, only Shiv:F
~/.ssh/fyndr_oracle.pub    → 644
~/.ssh/config              → Host fyndr → HostName 129.151.47.214, User opc, IdentityFile ~/.ssh/fyndr_oracle
~/.ssh/config.d/           → optional split
Command: ssh fyndr  OR  ssh opc@129.151.47.214  (no -i)
Backup: Google Drive/Fyndr/secrets/fyndr_oracle.key.gpg (age-encrypted)
```

## 3. Steps (local Windows)
```powershell
# 1. Move & lock
mkdir $HOME\.ssh -Force
Move-Item "C:\Users\Shiv\Downloads\ssh-key-2026-08-27 (1).key" "$HOME\.ssh\fyndr_oracle"
icacls "$HOME\.ssh\fyndr_oracle" /inheritance:r /grant:r "$env:USERNAME:F"
# verify: icacls shows only SHIV-BERA\Shiv:(F)

# 2. Config
@"
Host fyndr
    HostName 129.151.47.214
    User opc
    IdentityFile ~/.ssh/fyndr_oracle
    IdentitiesOnly yes
    ServerAliveInterval 60
"@ | Out-File -Encoding utf8 $HOME\.ssh\config -Append

# 3. Test
ssh fyndr "uname -a"

# 4. Clean old path (optional shred)
# remove Downloads copy, clear known_hosts duplicates
```

## 4. Google Drive Plan (see below)
- Encrypt key with `age` before upload: `age -p fyndr_oracle > fyndr_oracle.key.age`
- Upload to Drive folder `Fyndr/secrets/` via `rclone` or Drive Desktop
- Store `age` passphrase in Bitwarden / Google Secret Manager, not in repo
- Restore: `rclone copy drive:Fyndr/secrets/fyndr_oracle.key.age ~/.ssh/fyndr_oracle.age && age -d`

## 5. Rotation & Hygiene
- Do NOT commit `~/.ssh/*` to git (`.gitignore` already ignores)
- Rotate key every 90d: `oci compute instance add-ssh-key`
- Audit: `ssh-add -l` shows only fyndr

## 6. VPS Side
- `/home/opc/.ssh/authorized_keys` already has pubkey
- Disable password auth: `PasswordAuthentication no` (already)

## 7. Verification
- `ssh fyndr "hostname"` → `photo-app`
- `ls -l ~/.ssh/fyndr_oracle` → `-rw-------`
- `cat ~/.ssh/config` → contains Host fyndr
- Drive folder contains `fyndr_oracle.key.age` timestamp today

---
See `GOOGLE_DRIVE_PLAN.md` for detailed rclone + age workflow.
