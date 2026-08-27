# Google Drive as Secure Key Vault — Plan for Fyndr

## Why Drive, Why Not Plaintext
Drive is free, versioned, survives laptop death. Plaintext key on Drive = breach if Drive shared/hacked. So **encrypt before upload**.

## Choice: `age` + `rclone`
- `age` (https://github.com/FiloSottile/age) — single binary, no GPG keyring, passphrase mode, 1 command encrypt/decrypt. Better than GPG for just a file.
- `rclone` (https://rclone.org) — mounts Drive as `drive:` remote, supports `copy`, `bisync`, no API key dance if you use OAuth.
- Alternatives considered: `gdrive` CLI (unmaintained), Drive Desktop sync folder (leaks plaintext to sync). `age+rclone` gives explicit encrypted-only sync.

## Layout
```
Google Drive/
  Fyndr/
    secrets/
      fyndr_oracle.key.age      # encrypted private key
      fyndr_oracle.key.age.sha256
      README.txt                # "decrypt with: age -d -o fyndr_oracle fyndr_oracle.key.age"
    backups/
      mongo-dump-2026-08-27.tar.gz.age
```

## Setup (one-time, 5 min)

### 1. Install tools
```powershell
winget install FiloSottile.age
winget install Rclone.Rclone
rclone config # -> new remote "drive" -> type drive -> OAuth browser -> scope drive.file
rclone lsd drive: # verify
```

### 2. Encrypt & upload key
```powershell
# generate passphrase (store in Bitwarden)
$pass = -join ((48..57)+(97..122) | Get-Random -Count 24 | % {[char]$_})

# encrypt
age --passphrase --output $HOME\.ssh\fyndr_oracle.key.age $HOME\.ssh\fyndr_oracle
# or: age -p fyndr_oracle.key.age  (prompts)

# checksum
Get-FileHash $HOME\.ssh\fyndr_oracle.key.age -Algorithm SHA256 | Out-File fyndr_oracle.key.age.sha256

# upload
rclone copy $HOME\.ssh\fyndr_oracle.key.age drive:Fyndr/secrets/ --progress
rclone copy fyndr_oracle.key.age.sha256 drive:Fyndr/secrets/
```

### 3. Verify restore (on fresh machine)
```powershell
rclone copy drive:Fyndr/secrets/fyndr_oracle.key.age $HOME\.ssh\fyndr_oracle.key.age
age --decrypt --output $HOME\.ssh\fyndr_oracle $HOME\.ssh\fyndr_oracle.key.age
icacls $HOME\.ssh\fyndr_oracle /inheritance:r /grant:r "$env:USERNAME:F"
ssh fyndr "hostname" # -> photo-app
```

### 4. Automation (optional)
```powershell
# task scheduler weekly: re-upload if key rotated
# .ps1:
rclone copy $HOME\.ssh\fyndr_oracle.key.age drive:Fyndr/secrets/ --update
```

## Security Properties
- Drive never sees plaintext (age passphrase not on Drive)
- Passphrase in Bitwarden, not in `plot.md`
- Versioning: Drive keeps 30d history → accidental delete recoverable
- Cost: $0 (15GB free), 1 file <2KB
- vs. 1Password Connect: paid, overkill for 1 key

## What NOT to do
- Don't sync entire `~/.ssh` folder via Drive Desktop → leaks `known_hosts`, `id_rsa`
- Don't use `zip` with password → weak
- Don't commit `*.age` to git

## Next Steps
1. Run setup above, confirm `rclone ls drive:Fyndr/secrets/` shows `fyndr_oracle.key.age`
2. Delete `C:\Users\Shiv\Downloads\ssh-key-2026-08-27 (1).key` after move
3. Add `GOOGLE_DRIVE_PLAN.md` and `plot.md` to repo (no secrets inside)
