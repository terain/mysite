#!/usr/bin/env bash
# Запекает карту мира в тайлы и отправляет их в гит — сайт /dnd/map обновится сам.
# Запуск из любой папки:  scripts/dnd-map-sync.sh [путь к земля.svg]
# Нужны rsvg-convert (librsvg2-bin) и Pillow. После push в main Cloudflare выкладывает сайт.
set -euo pipefail

SRC="${1:-$HOME/Документы/dnd/карты/земля.svg}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

[ -f "$SRC" ] || { echo "Нет файла: $SRC" >&2; exit 1; }

cd "$REPO"
git pull -q --rebase --autostash
python3 scripts/dnd-map-tiles.py "$SRC" public/dnd/map

git add -A public/dnd/map
if git diff --cached --quiet; then
  echo "Карта не изменилась."
  exit 0
fi
git commit -q -m "Карта мира: новые тайлы ($(date +%F))"
git push -q
echo "Отправлено в $(git rev-parse --abbrev-ref HEAD)."
