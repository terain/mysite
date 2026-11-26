# Общее для скриптов в ~/mysite/bin. Папка сайта = папка над bin/.
APP=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
REPO=https://github.com/terain/mysite.git
export PATH="$APP/node/bin:$PATH"
export npm_config_cache="$APP/cache/npm"

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
    [ -z "$first" ] && { echo "  (пусто, без изменений)" >/dev/tty; return; }
    ask "$name ещё раз: "
    [ "$REPLY" = "$first" ] && { echo "  совпало, символов: ${#first}" >/dev/tty; return; }
    echo "  не совпало, попробуйте снова" >/dev/tty
  done
}

# Записать KEY=value в ~/mysite/env.
set_var() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp "$APP/.env.XXXX")
  grep -v "^$key=" "$APP/env" > "$tmp" 2>/dev/null || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  chmod 600 "$tmp"; mv "$tmp" "$APP/env"
}

get_var() { grep -oP "^$1=\K.*" "$APP/env" 2>/dev/null || true; }

# Попросить службу перезапустить сайт (без sudo: это делает mysite-restart.path).
restart_site() { touch "$APP/.restart"; }
