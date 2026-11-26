#!/bin/bash
# Сменить пароль админки или токен pCloud: sudo mysite-secrets
# Ввод со звёздочками, каждое значение спрашивается дважды. Пусто = оставить как было.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Нужен sudo"; exit 1; }
ENV=/etc/mysite/env
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
    [ -z "$first" ] && { echo "  (пусто, оставляю как было)" >/dev/tty; return; }
    ask "$name ещё раз: "
    [ "$REPLY" = "$first" ] && { echo "  совпало, символов: ${#first}" >/dev/tty; return; }
    echo "  не совпало, попробуйте снова" >/dev/tty
  done
}

set_var() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp)
  grep -v "^$key=" "$ENV" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  install -m 640 -o root -g mysite "$tmp" "$ENV"; rm -f "$tmp"
}
echo "Пусто (просто Enter) = оставить как было."
ask_twice "ADMIN_PASSWORD (пароль админки карты)"; [ -n "$REPLY" ] && set_var ADMIN_PASSWORD "$REPLY"
ask_twice "PCLOUD_TOKEN (токен pCloud)"; [ -n "$REPLY" ] && set_var PCLOUD_TOKEN "$REPLY"
systemctl restart mysite
echo "Сохранено, сайт перезапущен."
