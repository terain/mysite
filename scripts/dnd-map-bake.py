#!/usr/bin/env python3
"""Запекает карту мира для сайта: тот же рисунок, но без всего, что нужно только Inkscape.

    python3 dnd-map-bake.py земля.svg земля-запечённая.svg [--digits N]

Что делает:
- убирает служебное Inkscape/Sodipodi (namedview, метаданные, inkscape:label и т. п.);
- убирает скрытые слои и элементы (display:none) и пустые группы;
- убирает id и шаблоны из <defs>, на которые никто не ссылается;
- округляет координаты (d, points, x/y/...) до шага ≈ 1/20000 ширины холста
  (или до --digits знаков после запятой), внутри <defs> — на 3 знака точнее,
  у transform оставляет 6 значащих цифр;
- пишет всё без отступов и комментариев.
Только стандартная библиотека Python. Исходный файл не меняется.
"""
import argparse
import math
import os
import re
import sys
import xml.etree.ElementTree as ET

SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'
EDITOR_NS = (
    'http://www.inkscape.org/namespaces/inkscape',
    'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
    'http://purl.org/dc/elements/1.1/',
    'http://creativecommons.org/ns#',
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
)
TRANSFORMS = {'transform', 'gradientTransform', 'patternTransform'}
GEOMETRY = {
    'd', 'points',
    'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy',
    'width', 'height',
}
NUMBER = re.compile(r'-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?')
REF = re.compile(r'url\(\s*#([^)\s]+)\s*\)|^#(.+)$')
WEB_LIMIT = 25 * 1024 * 1024  # Cloudflare Workers не берёт статику больше 25 МиБ

ET.register_namespace('', SVG)
ET.register_namespace('xlink', XLINK)


def ns(tag_or_attr):
    return tag_or_attr[1:].split('}', 1)[0] if tag_or_attr.startswith('{') else ''


def hidden(el):
    if el.get('display') == 'none' or el.get('visibility') == 'hidden':
        return True
    style = el.get('style', '')
    return bool(re.search(r'(^|;)\s*display\s*:\s*none', style))


def strip(parent, in_defs=False):
    """Убрать служебное, скрытое и пустые группы."""
    for el in list(parent):
        if not isinstance(el.tag, str) or ns(el.tag) in EDITOR_NS or el.tag == f'{{{SVG}}}metadata':
            parent.remove(el)
            continue
        # Внутри <defs> скрытое может быть шаблоном для <use> — не трогаем
        if not in_defs and hidden(el):
            parent.remove(el)
            continue
        for a in list(el.attrib):
            if ns(a) in EDITOR_NS:
                del el.attrib[a]
        strip(el, in_defs or el.tag in (f'{{{SVG}}}defs', f'{{{SVG}}}symbol'))
        if not in_defs and el.tag == f'{{{SVG}}}g' and len(el) == 0:
            parent.remove(el)


def used_ids(root):
    ids = set()
    for el in root.iter():
        for v in el.attrib.values():
            ids.update(re.findall(r'url\(\s*[\'"]?#([^)\s\'"]+)', v))
            if v.startswith('#'):
                ids.add(v[1:])
        if el.tag == f'{{{SVG}}}style' and el.text:
            ids.update(re.findall(r'url\(\s*[\'"]?#([^)\s\'"]+)', el.text))
    return ids


def short(s):
    if s in ('-0', ''):
        return '0'
    if s.startswith('0.'):
        return s[1:]
    if s.startswith('-0.'):
        return '-' + s[2:]
    return s


def rounder(digits):
    """Округление до digits знаков после запятой (координаты)."""
    def fmt(m):
        v = round(float(m.group(0)), digits)
        return short(f'{v:.{digits}f}'.rstrip('0').rstrip('.') if digits > 0 else str(int(v)))
    return fmt


def sig(m):
    """6 значащих цифр (коэффициенты transform: масштаб нельзя округлять как координаты)."""
    return short(f'{float(m.group(0)):.6g}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--digits', type=int, help='знаков после запятой (по умолчанию — от размера холста)')
    args = ap.parse_args()

    tree = ET.parse(args.src)
    root = tree.getroot()

    if args.digits is None:
        vb = [float(v) for v in re.split(r'[\s,]+', root.get('viewBox', '0 0 1000 1000').strip())]
        step = max(vb[2], vb[3]) / 20000
        args.digits = max(0, -math.floor(math.log10(step)))

    strip(root)
    keep = used_ids(root)
    # Шаблоны, на которые никто не ссылается, не рисуются — выбрасываем
    for defs in root.iter(f'{{{SVG}}}defs'):
        for el in list(defs):
            if el.get('id') not in keep:
                defs.remove(el)
    outer = rounder(args.digits)
    # Шаблоны в <defs>/<symbol> обычно масштабируются через transform — им точность выше
    inner = rounder(args.digits + 3)

    def bake(el, in_defs=False):
        el.tail = None
        if el.text and not el.text.strip():
            el.text = None
        if 'id' in el.attrib and el.get('id') not in keep:
            del el.attrib['id']
        for a, v in el.attrib.items():
            if a in TRANSFORMS:
                el.set(a, re.sub(r'\s+', ' ', NUMBER.sub(sig, v)).strip())
            elif a in GEOMETRY:
                el.set(a, re.sub(r'\s+', ' ', NUMBER.sub(inner if in_defs else outer, v)).strip())
        for child in el:
            bake(child, in_defs or el.tag in (f'{{{SVG}}}defs', f'{{{SVG}}}symbol'))

    sys.setrecursionlimit(100000)
    bake(root)

    tree.write(args.dst, encoding='utf-8', xml_declaration=False, short_empty_elements=True)

    before, after = os.path.getsize(args.src), os.path.getsize(args.dst)
    mb = lambda n: f'{n / 1024 / 1024:.1f} МиБ'
    print(f'Запечено: {mb(before)} → {mb(after)} (округление до {args.digits} зн.) → {args.dst}')
    if after > WEB_LIMIT:
        print('Внимание: больше 25 МиБ — на сайт такой файл не загрузится.', file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
