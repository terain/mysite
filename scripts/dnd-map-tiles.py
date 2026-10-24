#!/usr/bin/env python3
"""Запекает карту мира для сайта в картинки-тайлы.

    python3 dnd-map-tiles.py земля.svg ВЫХОД [--scale 2] [--png готовый.png]

Целую карту в 55 МБ браузер рисует по минуте, поэтому сайт показывает её тайлами,
как обычные онлайн-карты: несколько уровней приближения, каждый нарезан на квадраты 512 px.

- SVG рисуется через rsvg-convert (как превью в собрать.py) в scale раз крупнее холста;
  --png — взять уже отрисованную картинку того же размера.
- В ВЫХОД кладутся tiles/<уровень>/<x>/<y>.webp и map.json (размер холста и уровни).
  Уровень 0 — вся карта в одном тайле, последний — полное разрешение.
Нужны rsvg-convert (librsvg2-bin) и Pillow.
"""
import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
TILE = 512


def canvas_size(svg):
    head = svg.read_text(encoding='utf-8', errors='ignore')[:200_000]
    tag = re.search(r'<svg\b[^>]*>', head, re.S).group(0)
    vb = re.search(r'viewBox\s*=\s*["\']([^"\']+)', tag)
    if not vb:
        sys.exit('У <svg> нет viewBox')
    _, _, w, h = (float(v) for v in re.split(r'[\s,]+', vb.group(1).strip()))
    return w, h


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('svg', type=Path)
    ap.add_argument('out', type=Path)
    ap.add_argument('--scale', type=float, default=2, help='во сколько раз крупнее холста самый подробный уровень')
    ap.add_argument('--png', type=Path, help='уже отрисованная карта (scale × холст)')
    ap.add_argument('--quality', type=int, default=82)
    args = ap.parse_args()

    w, h = canvas_size(args.svg)
    full_w, full_h = round(w * args.scale), round(h * args.scale)

    with tempfile.TemporaryDirectory() as tmp:
        png = args.png
        if png is None:
            png = Path(tmp) / 'full.png'
            print(f'Рисую {full_w}×{full_h} px (несколько минут)…', flush=True)
            subprocess.run(['rsvg-convert', '-w', str(full_w), '-h', str(full_h), str(args.svg), '-o', str(png)], check=True)
        img = Image.open(png).convert('RGBA')
        if img.size != (full_w, full_h):
            sys.exit(f'Картинка {img.size}, а нужна {full_w}×{full_h}')

        top = max(0, math.ceil(math.log2(max(full_w, full_h) / TILE)))
        tiles = args.out / 'tiles'
        if tiles.exists():
            shutil.rmtree(tiles)
        count = 0
        for level in range(top, -1, -1):
            if level < top:
                img = img.resize((max(1, math.ceil(img.width / 2)), max(1, math.ceil(img.height / 2))), Image.LANCZOS)
            for x in range(math.ceil(img.width / TILE)):
                for y in range(math.ceil(img.height / TILE)):
                    tile = img.crop((x * TILE, y * TILE, (x + 1) * TILE, (y + 1) * TILE))
                    d = tiles / str(level) / str(x)
                    d.mkdir(parents=True, exist_ok=True)
                    tile.save(d / f'{y}.webp', 'WEBP', quality=args.quality, method=6)
                    count += 1
            print(f'  уровень {level}: {img.width}×{img.height}', flush=True)

    meta = {'width': w, 'height': h, 'scale': args.scale, 'levels': top + 1, 'tileSize': TILE}
    (args.out / 'map.json').write_text(json.dumps(meta) + '\n')
    size = sum(f.stat().st_size for f in tiles.rglob('*.webp'))
    print(f'Готово: {count} тайлов, {size / 1024 / 1024:.1f} МиБ → {tiles}')


if __name__ == '__main__':
    main()
