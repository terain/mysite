#!/bin/bash
# Перенос данных из последнего бэкапа pCloud (или из файла) в базу на сервере.
#   sudo mysite-import [файл.json]
# Старая база перед заменой сохраняется рядом: /srv/mysite/data/site.db.before-import-*
set -uo pipefail
set -a; . /etc/mysite/env; set +a
FILE="${1:-}"
[ -n "$FILE" ] && { cp "$FILE" /tmp/mysite-import.json; chmod 644 /tmp/mysite-import.json; FILE=/tmp/mysite-import.json; }
systemctl stop mysite
cd /srv/mysite/current
sudo -u mysite -H --preserve-env=DATA_DIR,PCLOUD_TOKEN,PCLOUD_API_HOST,PCLOUD_ROOT \
  node scripts/import-backup.mjs $FILE
status=$?
systemctl start mysite
exit $status
