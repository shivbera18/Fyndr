# Fyndr Live Upload — Photographer Setup Guide

> Get every shot from your camera into the guest gallery *while you shoot*.
> One-time setup per event: about 5 minutes. No app to install, no laptop needed
> at the venue.

---

## What you need

- A camera with **Wi-Fi + FTP transfer**. Most Canon R series, Nikon Z series,
  and Sony A series bodies from the last ~8 years have it. (If yours doesn't,
  see [No pro camera?](#no-pro-camera) below.)
- **Internet at the venue.** Use your **phone hotspot** — hotel/venue Wi-Fi
  very often blocks cameras silently. Hotspot just works.

## Step 1 — Enable it for your event (2 min)

1. Open your event in the Fyndr dashboard.
2. Find the **Camera-to-cloud upload** card, read the 4-step overview, click
   **Enable camera upload**.
3. You get three values — **Host**, **Username**, **Password**.
   The password is shown **once**. Copy all three somewhere safe (notes app).
   Lost it? Hit the rotate icon next to the login for a fresh one.

## Step 2 — Enter the 3 fields in your camera (2 min)

Pick your brand tab in the dashboard card and follow it. The short version:

**Canon** — Menu → Network (yellow tab) → Connection settings → SET\* →
Communication settings → FTP. Server = Host, port 21, your Username/Password,
encryption FTPS, mode PASV. Then Transfer settings → **Auto transfer: ON**,
transfer type **JPEG only**.

**Nikon** — Setup/Network menu → Connect to FTP server → New profile. Address =
Host, your Username/Password, FTPS-explicit, PASV. **Auto upload: ON**,
JPEG only.

**Sony** — Network → Transfer/Remote → FTP Transfer Func. → Server Setting →
New. Host + Username/Password, secure transfer (FTPS) ON.
**Auto FTP Transfer: ON**, JPEG (or JPEG+RAW with JPEG transfer).

In all cases: **transfer JPEG only.** RAW files are skipped and counted on the
card ("12 files skipped") — they never reach the gallery and only burn hotspot
data.

## Step 3 — Take a test shot (1 min)

Shoot one frame. Within ~10 seconds:
- the login row on the card turns **LIVE green** with data counting up, and
- the photo appears in the guest gallery (watch it arrive — that's the magic).

Still grey after 30 seconds? See [Troubleshooting](#troubleshooting).

## Shooting with 2–3 cameras

Click **Add shooter** — each camera gets its own login to the same event, and
you see every camera's LIVE status separately. Share each login with its
shooter directly (never reuse one login — then you can't tell whose camera
died).

## After the event

- **Revoke** a login any time (trash icon) — that camera stops uploading
  immediately.
- Logins **die automatically** when the event expires. Nothing to clean up.

## <a id="no-pro-camera"></a>No pro camera?

The card's fourth tab (**No camera? Test**) covers it:
- **FileZilla** (free): Quickconnect with Host/Username/Password, port 21,
  "require explicit FTP over TLS". Drag photos in.
- **One command** (laptop or Android Termux):
  `curl -T photo.jpg ftp://USERNAME:PASSWORD@HOST/`
- **Phone as auto-camera** (Android): an app like FolderSync watching
  `DCIM/Camera` auto-uploads each new shot to the same login — functionally
  identical to a Canon with auto-transfer on.

## Troubleshooting

| Symptom | Almost always… | Fix |
|---|---|---|
| Dot stays grey, nothing arrives | Typo'd password, or venue Wi-Fi isolation | Re-copy credentials (or rotate); switch camera to phone hotspot |
| "Connection refused / timed out" | Venue firewall or wrong host | Hotspot first; confirm Host is `ftp.fyndr.in` |
| Dot green but gallery empty | Shooting RAW-only | Camera → JPEG transfer (card shows skipped count) |
| Worked, then stopped mid-event | Phone hotspot died / camera slept | Wake hotspot, half-press shutter to reconnect; check "last seen" time |
| "Server setup pending" banner | Fyndr-side FTP host not configured yet | Not your fault — contact support before shoot day |
| Second camera kills the first login | Shared one login | Add shooter — one login per camera |

## FAQ

- **Does this eat my hotspot data?** ~8 MB per JPEG. A 2,000-shot wedding ≈
  16 GB. Plan hotspot data accordingly; the card's "MB in" counter tracks it live.
- **What if my camera disconnects mid-shoot?** Shoot normally — most bodies
  queue and auto-resend on reconnect. Re-sent duplicates are discarded free.
- **Do guests see half-uploaded photos?** No. A photo appears only when fully
  received. Bursts may arrive a few seconds apart.
- **Is my gallery safe if I lose the camera?** Every transferred shot is
  already in the cloud — that's the point. (Your card stays in the camera,
  of course.)
- **Cost?** Included. No per-photo fee for the upload itself.
