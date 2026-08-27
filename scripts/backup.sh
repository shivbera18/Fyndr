#!/bin/bash
# P2: mongodump + age + rclone to Drive/Fyndr/backups/
set -e
DATE=$(date +%Y-%m-%d)
mongodump --uri="mongodb://localhost:27017/photo_sharing_db" --archive=/tmp/fyndr-$DATE.archive
echo "dump /tmp/fyndr-$DATE.archive $(du -h /tmp/fyndr-$DATE.archive | cut -f1)"
# age encrypt if available
if command -v age >/dev/null 2>&1; then
  age --passphrase -o /tmp/fyndr-$DATE.archive.age /tmp/fyndr-$DATE.archive && echo "encrypted age"
fi
# rclone if configured
if command -v rclone >/dev/null 2>&1; then
  rclone copy /tmp/fyndr-$DATE.archive.age drive:Fyndr/backups/ 2>&1 | head -n 20
fi
