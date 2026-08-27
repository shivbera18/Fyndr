#!/bin/bash
# P2: mongodump + age + rclone to Drive/Fyndr/backups/ — RPO 24h, RTO 1h
set -euo pipefail
DATE=$(date +%Y-%m-%d)
ARCHIVE="/tmp/fyndr-${DATE}.archive.gz"
ENCRYPTED="/tmp/fyndr-${DATE}.archive.gz.age"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/photo_sharing_db}"

echo "[backup] dumping ${MONGO_URI} -> ${ARCHIVE}"
mongodump --uri="${MONGO_URI}" --archive="${ARCHIVE}" --gzip
echo "[backup] dump $(du -h ${ARCHIVE} | cut -f1) ${ARCHIVE}"

# also dump FAISS indexes if present
FAISS_BASE="${FAISS_BASE:-/tmp/fyndr_faiss}"
if [ -d "${FAISS_BASE}" ]; then
  tar -czf "/tmp/fyndr-faiss-${DATE}.tgz" -C "${FAISS_BASE}" . 2>/dev/null || true
  echo "[backup] faiss $(du -h /tmp/fyndr-faiss-${DATE}.tgz | cut -f1)"
fi

# age encrypt if AGE_PASSPHRASE or age available
if [ -n "${AGE_PASSPHRASE:-}" ] && command -v age >/dev/null 2>&1; then
  echo "${AGE_PASSPHRASE}" | age --passphrase -o "${ENCRYPTED}" "${ARCHIVE}"
  echo "[backup] encrypted ${ENCRYPTED}"
elif command -v age >/dev/null 2>&1 && [ -f "${ARCHIVE}" ]; then
  # interactive fallback not used in cron; skip
  echo "[backup] AGE_PASSPHRASE not set, skipping encryption (set it for prod)"
  ENCRYPTED="${ARCHIVE}"
else
  ENCRYPTED="${ARCHIVE}"
fi

# rclone if configured
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q "drive:"; then
  rclone copy "${ENCRYPTED}" drive:Fyndr/backups/ --progress 2>&1 | tail -n 20
  echo "[backup] rclone copy done"
else
  echo "[backup] rclone not configured, local backup only at ${ENCRYPTED}"
fi

# also backup FAISS tgz if exists
if [ -f "/tmp/fyndr-faiss-${DATE}.tgz" ] && command -v rclone >/dev/null 2>&1; then
  rclone copy "/tmp/fyndr-faiss-${DATE}.tgz" drive:Fyndr/backups/ 2>&1 | tail -n 5 || true
fi

# cleanup older than 7d local
find /tmp -name "fyndr-*.archive*" -mtime +7 -delete 2>/dev/null || true
find /tmp -name "fyndr-faiss-*.tgz" -mtime +7 -delete 2>/dev/null || true

echo "[backup] done $(date -Is)"
