#!/bin/bash
# Установка сайта на сервер. Всё ставится в одну папку ~/mysite (Node.js и Caddy тоже).
#   sudo bash setup.sh [ветка]
# Вне папки: только ссылки на службы в /etc/systemd/system и правила ufw для портов 80/443.
# Убрать всё: sudo ~/mysite/bin/uninstall && rm -rf ~/mysite
# Повторный запуск безопасен: пароли и база сохраняются.
set -euo pipefail
cd /
[ "$(id -u)" = 0 ] || { echo "Нужен sudo"; exit 1; }
USR=${SUDO_USER:?запускайте через sudo от своего пользователя}
HOME_DIR=$(getent passwd "$USR" | cut -d: -f6)
APP="$HOME_DIR/mysite"
BRANCH="${1:-main}"
as_user() { sudo -u "$USR" -H "$@"; }
step() { echo; echo "== $*"; }

step "Папка $APP"
as_user mkdir -p "$APP"/{bin,systemd,data,caddy,releases,cache}

# --- Уборка прошлой версии установки (/srv/mysite, /etc/mysite, пакеты apt) ---
if [ -d /srv/mysite ] || [ -d /etc/mysite ] || id mysite >/dev/null 2>&1; then
  step "Убираю прошлую установку из /srv, /etc и /usr/local/bin"
  systemctl disable --now mysite.service mysite-restart.path mysite-update.timer mysite-backup.timer caddy.service 2>/dev/null || true
  if [ -f /etc/mysite/env ] && [ ! -f "$APP/env" ]; then
    grep -vE '^(DATA_DIR|HOST|PORT)=' /etc/mysite/env > "$APP/env"; chown "$USR:" "$APP/env"; chmod 600 "$APP/env"
    echo "пароли перенесены в $APP/env"
  fi
  if [ -f /srv/mysite/data/site.db ] && [ ! -f "$APP/data/site.db" ]; then
    cp -a /srv/mysite/data/. "$APP/data/"; chown -R "$USR:" "$APP/data"
    echo "база перенесена в $APP/data"
  fi
  rm -f /etc/systemd/system/mysite*.service /etc/systemd/system/mysite*.timer /etc/systemd/system/mysite*.path
  rm -f /usr/local/bin/mysite-update /usr/local/bin/mysite-import /usr/local/bin/mysite-secrets
  rm -rf /etc/mysite /srv/mysite
  id mysite >/dev/null 2>&1 && userdel mysite
  systemctl daemon-reload
fi
for p in caddy nodejs npm; do
  if dpkg -s "$p" >/dev/null 2>&1; then
    step "Удаляю пакеты apt caddy, nodejs, npm (теперь они живут в $APP)"
    apt-get purge -y -qq caddy nodejs npm >/dev/null || true
    echo "Ниже apt покажет пакеты, которые ставились вместе с ними и больше не нужны."
    echo "Проверьте список и подтвердите (Y) или откажитесь (n)."
    apt-get autoremove --purge </dev/tty || true
    break
  fi
done

# --- Node.js и Caddy в папку сайта ---
ARCH=$(dpkg --print-architecture)   # amd64 / arm64
NODE_ARCH=$([ "$ARCH" = arm64 ] && echo arm64 || echo x64)
if ! "$APP/node/bin/node" -v 2>/dev/null | grep -q '^v24'; then
  step "Скачиваю Node.js 24 в $APP/node"
  base=https://nodejs.org/dist/latest-v24.x
  sums=$(curl -fsSL "$base/SHASUMS256.txt")
  file=$(echo "$sums" | grep -oE "node-v24[0-9.]*-linux-$NODE_ARCH\.tar\.xz" | head -1)
  tmp=$(mktemp -d)
  curl -fsSL "$base/$file" -o "$tmp/$file"
  (cd "$tmp" && echo "$sums" | grep " $file\$" | sha256sum -c --quiet)
  rm -rf "$APP/node"; mkdir "$APP/node"
  tar -xJf "$tmp/$file" -C "$APP/node" --strip-components=1
  chown -R "$USR:" "$APP/node"; rm -rf "$tmp"
fi
echo "node $("$APP/node/bin/node" -v)"
if [ ! -x "$APP/bin/caddy" ]; then
  step "Скачиваю Caddy в $APP/bin"
  ver=$(curl -fsSL -o /dev/null -w '%{url_effective}' https://github.com/caddyserver/caddy/releases/latest | grep -oP '/tag/v\K.+' || true)
  [ -n "$ver" ] || ver=$(curl -fsSL https://api.github.com/repos/caddyserver/caddy/releases/latest | grep -oP '"tag_name":\s*"v\K[^"]+')
  file="caddy_${ver}_linux_${ARCH}.tar.gz"
  url="https://github.com/caddyserver/caddy/releases/download/v$ver"
  tmp=$(mktemp -d)
  curl -fsSL "$url/$file" -o "$tmp/$file"
  curl -fsSL "$url/caddy_${ver}_checksums.txt" -o "$tmp/sums"
  (cd "$tmp" && grep " $file\$" sums | sha512sum -c --quiet)
  tar -xzf "$tmp/$file" -C "$tmp" caddy
  install -m 755 -o "$USR" -g "$(id -gn "$USR")" "$tmp/caddy" "$APP/bin/caddy"; rm -rf "$tmp"
fi
echo "$("$APP/bin/caddy" version | cut -d' ' -f1)"

# --- Скрипты, службы, Caddyfile из репозитория ---
step "Скрипты и службы из ветки $BRANCH"
SRC=$(mktemp -d); trap 'rm -rf "$SRC"' EXIT
git clone -q --depth 1 -b "$BRANCH" https://github.com/terain/mysite.git "$SRC"
install -m 644 -o "$USR" "$SRC/deploy/bin/lib.sh" "$APP/bin/lib.sh"
for f in update import secrets uninstall; do install -m 755 -o "$USR" "$SRC/deploy/bin/$f" "$APP/bin/$f"; done
install -m 644 -o "$USR" "$SRC/deploy/Caddyfile" "$APP/Caddyfile"
rm -f "$APP"/systemd/*
for f in "$SRC"/deploy/systemd/*; do
  sed "s#@APP@#$APP#g; s#@USER@#$USR#g" "$f" > "$APP/systemd/$(basename "$f")"
done
chown -R "$USR:" "$APP/systemd"

# --- Пароли ---
if [ ! -f "$APP/env" ]; then
  step "Пароли (Enter = оставить пустым, потом: ~/mysite/bin/secrets)"
  as_user bash -c "
    . '$APP/bin/lib.sh'
    ask_twice 'ADMIN_PASSWORD (пароль админки карты)'; set_var ADMIN_PASSWORD \"\$REPLY\"
    ask_twice 'PCLOUD_TOKEN (токен pCloud)'; set_var PCLOUD_TOKEN \"\$REPLY\"
    set_var BACKUP_TOKEN \$(openssl rand -hex 24)
    set_var PCLOUD_API_HOST eapi.pcloud.com
    set_var PCLOUD_ROOT /site
    set_var BACKUP_KEEP_DAYS 30"
fi
as_user bash -c ". '$APP/bin/lib.sh'; set_var DEPLOY_BRANCH '$BRANCH'; set_var DATA_DIR '$APP/data'"

step "Сборка сайта"
as_user "$APP/bin/update" --force

step "Службы (ссылки в /etc/systemd/system)"
for u in "$APP"/systemd/*; do systemctl link "$u" >/dev/null; done
systemctl daemon-reload
systemctl enable --now mysite.service mysite-caddy.service mysite-restart.path mysite-update.timer mysite-backup.timer
systemctl restart mysite.service mysite-caddy.service

if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null
fi

step "Готово"
echo "Всё лежит в $APP. Проверка: https://2-29-204-181.sslip.io/server/"
echo "Перенести данные из бэкапа pCloud: ~/mysite/bin/import"
