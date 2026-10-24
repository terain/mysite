#!/usr/bin/env bash
# Кладёт готовую карту мира в сайт как подложку /dnd/map и отправляет в гит.
# Запуск из любой папки:  scripts/dnd-map-sync.sh [путь к svg]
# После push в main Cloudflare сам выкладывает сайт.
set -euo pipefail

SRC="${1:-$HOME/Документы/dnd/карты/земля.svg}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO/public/dnd/map/base.svg"
# Cloudflare Workers не принимает статический файл больше 25 МиБ
LIMIT=$((25 * 1024 * 1024))

[ -f "$SRC" ] || { echo "Нет файла: $SRC" >&2; exit 1; }
SIZE=$(stat -c %s "$SRC")
if [ "$SIZE" -gt "$LIMIT" ]; then
  echo "Карта весит $((SIZE / 1024 / 1024)) МиБ, а Cloudflare берёт файлы до 25 МиБ." >&2
  echo "Нужна облегчённая («запечённая») версия карты." >&2
  exit 1
fi

# Размер холста — из viewBox корневого <svg>: в этих единицах координаты объектов
read -r W H < <(python3 - "$SRC" <<'PY'
import re, sys
head = open(sys.argv[1], encoding='utf-8', errors='ignore').read(200_000)
tag = re.search(r'<svg\b[^>]*>', head, re.S).group(0)
vb = re.search(r'viewBox\s*=\s*["\']([^"\']+)', tag)
if not vb:
    sys.exit('У <svg> нет viewBox')
_, _, w, h = (float(v) for v in re.split(r'[\s,]+', vb.group(1).strip()))
print(f'{w:g} {h:g}')
PY
)

cp "$SRC" "$DEST"
printf '{ "width": %s, "height": %s }\n' "$W" "$H" > "$REPO/src/dnd/base.json"

cd "$REPO"
git add public/dnd/map/base.svg src/dnd/base.json
if git diff --cached --quiet; then
  echo "Карта не изменилась."
  exit 0
fi
git commit -q -m "Карта мира: новая подложка ($(date +%F))"
git push -q
echo "Готово: подложка ${W}×${H}, $((SIZE / 1024)) КиБ, отправлено в $(git rev-parse --abbrev-ref HEAD)."
