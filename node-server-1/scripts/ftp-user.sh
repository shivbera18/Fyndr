#!/bin/bash
# Privileged FTP-login helper for camera-to-cloud (Fyndr Live Upload).
# Root-owned, sudo-whitelisted for exactly this path:
#   opc ALL=(root) NOPASSWD: /opt/fyndr/scripts/ftp-user.sh *
# Password arrives on STDIN (never argv — argv is visible in ps).
# Usage: ftp-user.sh add|passwd|del <username>
set -euo pipefail

ACTION="${1:?usage: ftp-user.sh add|passwd|del username}"
USERNAME="${2:?usage: ftp-user.sh add|passwd|del username}"

# Only event shooter logins, nothing else. Ever.
[[ "$USERNAME" =~ ^evt_[0-9a-f]{8}(_[b-e])?$ ]] || { echo "refusing bad username: $USERNAME" >&2; exit 2; }
# Each login gets its own jail dir so the watcher attributes uploads exactly
# (evt_ab12cd = shooter a, evt_ab12cd_b = shooter b, ...).
EVTDIR="/srv/fyndr-ftp/$USERNAME"

case "$ACTION" in
  add)
    groupadd -f ftpcam
    if ! id "$USERNAME" >/dev/null 2>&1; then
      useradd -M -d "$EVTDIR" -s /usr/sbin/nologin -G ftpcam "$USERNAME"
    fi
    mkdir -p "$EVTDIR"
    chown root:ftpcam "$EVTDIR"
    chmod 2770 "$EVTDIR"
    echo "$USERNAME:$(cat)" | chpasswd
    grep -qx "$USERNAME" /etc/vsftpd.userlist 2>/dev/null || echo "$USERNAME" >> /etc/vsftpd.userlist
    ;;
  passwd)
    id "$USERNAME" >/dev/null 2>&1 || { echo "unknown user: $USERNAME" >&2; exit 3; }
    echo "$USERNAME:$(cat)" | chpasswd
    ;;
  del)
    userdel "$USERNAME" 2>/dev/null || true
    sed -i "/^${USERNAME}$/d" /etc/vsftpd.userlist 2>/dev/null || true
    # Jail dir intentionally kept — the watcher drains in-flight files, cron purges orphans.
    ;;
  *)
    echo "usage: ftp-user.sh add|passwd|del username" >&2
    exit 2
    ;;
esac
