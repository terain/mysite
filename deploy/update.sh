#!/bin/bash
# Автодеплой: если в ветке DEPLOY_BRANCH новый коммит — собрать его в отдельной папке,
# переключить /srv/mysite/current и перезапустить сайт. Запускается таймером mysite-update каждые 2 минуты.
#   mysite-update          — проверить и обновить
#   mysite-update --force  — пересобрать текущий коммит
# Откат: ln -sfn /srv/mysite/releases/<старый> /srv/mysite/current && sudo systemctl restart mysite
set -euo pipefail
APP=/srv/mysite
REPO=https://github.com/terain/mysite.git
BRANCH=$(grep -oP '^DEPLOY_BRANCH=\K.*' /etc/mysite/env 2>/dev/null || echo main)
exec 9>"$APP/.update.lock"; flock -n 9 || exit 0

SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -c1-12)
[ -n "$SHA" ] || { echo "ветка $BRANCH не найдена"; exit 1; }
CUR=$(basename "$(readlink -f "$APP/current" 2>/dev/null || echo none)")
[ "$SHA" = "$CUR" ] && [ "${1:-}" != --force ] && exit 0

echo "деплой $BRANCH@$SHA (было $CUR)"
DIR="$APP/releases/$SHA"
rm -rf "$DIR.tmp"
git clone -q --depth 1 -b "$BRANCH" "$REPO" "$DIR.tmp"
cd "$DIR.tmp"
npm ci --no-audit --no-fund --loglevel=error
npm run build --silent
npm prune --omit=dev --no-audit --no-fund --loglevel=error
rm -rf "$DIR"; mv "$DIR.tmp" "$DIR"
ln -sfn "$DIR" "$APP/current"

# Перезапуск делает mysite-restart.path (у пользователя mysite нет прав на systemctl).
touch "$APP/.restart"
# Оставляем 3 последних релиза.
ls -1t "$APP/releases" | grep -v '\.tmp$' | tail -n +4 | sed "s#^#$APP/releases/#" | xargs -r rm -rf
echo "готово: $SHA"
