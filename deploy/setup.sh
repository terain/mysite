#!/bin/bash
# Первая настройка сервера под сайт. Запускать один раз:
#   curl -fsSL https://raw.githubusercontent.com/terain/mysite/<ветка>/deploy/setup.sh | sudo bash -s -- <ветка>
# или из клона: sudo bash deploy/setup.sh [ветка]
# Повторный запуск безопасен: ничего не ломает и не перезаписывает /etc/mysite/env.
set -euo pipefail
BRANCH="${1:-main}"
REPO=https://github.com/terain/mysite.git
APP=/srv/mysite
[ "$(id -u)" = 0 ] || { echo "Нужен sudo"; exit 1; }

echo "== Пакеты: Node.js (22.13+ для node:sqlite), Caddy"
apt-get update -qq
apt-get install -y -qq curl git ca-certificates openssl caddy
node_ok() { node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)' 2>/dev/null; }
node_ok || apt-get install -y -qq nodejs npm || true
if ! node_ok; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y -qq nodejs
fi
node_ok || { echo "Не удалось поставить Node.js 22.13+"; exit 1; }
echo "node $(node -v), $(caddy version | cut -d' ' -f1)"

echo "== Пользователь mysite и папки"
id mysite >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin mysite
install -d -o mysite -g mysite "$APP" "$APP/releases" "$APP/data"
install -d -m 750 -o root -g mysite /etc/mysite

if [ ! -f /etc/mysite/env ]; then
  echo "== Секреты (Enter = оставить пустым, потом можно вписать в /etc/mysite/env)"
  # Ввод со звёздочками: видно, сколько символов набрано. Backspace стирает.
  ask() {
    local prompt=$1 c value=''
    printf '%s' "$prompt" >/dev/tty
    while IFS= read -rsn1 c </dev/tty; do
      [ -z "$c" ] && break
      if [ "$c" = $'\x7f' ] || [ "$c" = $'\b' ]; then
        [ -n "$value" ] && { value=${value%?}; printf '\b \b' >/dev/tty; }
      else
        value+=$c; printf '*' >/dev/tty
      fi
    done
    echo >/dev/tty
    REPLY=$value
  }
  # Спрашиваем дважды и сверяем: клавиатура может пропустить или задвоить нажатие.
  ask_twice() {
    local name=$1 first
    while :; do
      ask "$name: "; first=$REPLY
      [ -z "$first" ] && { echo "  (пусто, можно вписать позже в /etc/mysite/env)" >/dev/tty; return; }
      ask "$name ещё раз: "
      [ "$REPLY" = "$first" ] && { echo "  совпало, символов: ${#first}" >/dev/tty; return; }
      echo "  не совпало, попробуйте снова" >/dev/tty
    done
  }
  ask_twice "ADMIN_PASSWORD (пароль админки карты)"; ADMIN_PASSWORD=$REPLY
  ask_twice "PCLOUD_TOKEN (токен pCloud)"; PCLOUD_TOKEN=$REPLY
  umask 027
  cat > /etc/mysite/env <<ENV
# Настройки сайта. После правки: sudo systemctl restart mysite
DEPLOY_BRANCH=$BRANCH
ADMIN_PASSWORD=$ADMIN_PASSWORD
PCLOUD_TOKEN=$PCLOUD_TOKEN
PCLOUD_API_HOST=eapi.pcloud.com
PCLOUD_ROOT=/site
BACKUP_KEEP_DAYS=30
BACKUP_TOKEN=$(openssl rand -hex 24)
DATA_DIR=$APP/data
HOST=127.0.0.1
PORT=4321
ENV
  chgrp mysite /etc/mysite/env
else
  sed -i "s/^DEPLOY_BRANCH=.*/DEPLOY_BRANCH=$BRANCH/" /etc/mysite/env
fi

echo "== Первая сборка ветки $BRANCH"
SRC=$(mktemp -d); trap 'rm -rf "$SRC"' EXIT
git clone -q --depth 1 -b "$BRANCH" "$REPO" "$SRC"
install -m 755 "$SRC/deploy/update.sh" /usr/local/bin/mysite-update
install -m 755 "$SRC/deploy/import.sh" /usr/local/bin/mysite-import
cp "$SRC"/deploy/systemd/* /etc/systemd/system/
cp "$SRC/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl daemon-reload
sudo -u mysite -H /usr/local/bin/mysite-update --force

echo "== Службы"
systemctl enable --now mysite.service mysite-restart.path mysite-update.timer mysite-backup.timer
systemctl reload-or-restart caddy

if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null
fi

echo
echo "Готово. Проверка: https://2-29-204-181.sslip.io/"
echo "Перенести данные из последнего бэкапа pCloud: sudo mysite-import"
