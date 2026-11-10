# 鱼的日子 · 年表卡
# 需要：Python 3 + Pillow。读 {DSH_HOME}/whale-days.json，画一张图。
# 可选工具，不影响插件运行。
import json
import os
import sys
from datetime import date

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HOME = os.environ.get('USERPROFILE') or os.path.expanduser('~')
DSH = os.environ.get('DSH_HOME') or os.path.join(HOME, '.dsh')
SRC = os.path.join(DSH, 'whale-days.json')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), 'days-card.png')

W, H = 1080, 1440
NAVY_TOP = (6, 18, 31)
NAVY_BOTTOM = (18, 48, 73)
CREAM = (244, 236, 218)
INK = (205, 222, 234)
MUTED = (132, 160, 180)
WARM = (233, 156, 92)
COOL = (205, 222, 234)
BLUE = (96, 160, 245)
BLUE_DEEP = (62, 120, 210)
BELLY = (234, 244, 255)
BLUSH = (255, 188, 196)


def whale(d, x, y, w=380):
    """一只原创的、圆滚滚的蓝色大肥鱼（不是官方 logo，是二创）。"""
    h = int(w * 0.62)
    # 尾鳍（贴身的 V 形尾）
    d.polygon([
        (x + w - 20, y + h * 0.50), (x + w + 78, y + h * 0.14),
        (x + w + 92, y + h * 0.38), (x + w + 20, y + h * 0.54),
    ], fill=BLUE_DEEP)
    d.polygon([
        (x + w - 20, y + h * 0.50), (x + w + 78, y + h * 0.86),
        (x + w + 92, y + h * 0.62), (x + w + 20, y + h * 0.46),
    ], fill=BLUE_DEEP)
    # 身体
    d.ellipse((x, y, x + w, y + h), fill=BLUE)
    # 白肚皮
    d.ellipse((x + w * 0.10, y + h * 0.46, x + w * 0.66, y + h * 0.96), fill=BELLY)
    # 胸鳍
    d.ellipse((x + w * 0.18, y + h * 0.84, x + w * 0.34, y + h * 1.04), fill=BLUE_DEEP)
    # 眼睛
    d.ellipse((x + w * 0.135, y + h * 0.28, x + w * 0.195, y + h * 0.38), fill=(20, 30, 45))
    d.ellipse((x + w * 0.150, y + h * 0.295, x + w * 0.172, y + h * 0.330), fill=(255, 255, 255))
    # 腮红
    d.ellipse((x + w * 0.075, y + h * 0.40, x + w * 0.135, y + h * 0.47), fill=BLUSH)
    # 嘴
    d.arc((x + w * 0.10, y + h * 0.34, x + w * 0.235, y + h * 0.54), start=15, end=120, fill=(20, 30, 45), width=3)
    # 头顶小水花
    for dx, dy, r in [(0.30, -0.10, 7), (0.36, -0.18, 10), (0.43, -0.10, 6)]:
        cx, cy = x + w * dx, y + h * dy
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(150, 205, 245))

FONT = 'C:/Windows/Fonts/msyh.ttc'
FONT_B = 'C:/Windows/Fonts/msyhbd.ttc'


def load():
    try:
        with open(SRC, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def days_between(a, b):
    ya, ma, da = map(int, a.split('-'))
    yb, mb, db = map(int, b.split('-'))
    return (date(yb, mb, db) - date(ya, ma, da)).days


def wrap(text, font, width):
    out, line = [], ''
    for ch in text:
        if font.getlength(line + ch) <= width:
            line += ch
        else:
            out.append(line)
            line = ch
    if line:
        out.append(line)
    return out


def draw(day, owner, first, moments, out_path, clock='', pref_count=0, mascot=None):
    img = Image.new('RGB', (W, H))
    px = img.load()
    for y in range(H):
        t = y / H
        px_row = tuple(int(NAVY_TOP[i] + (NAVY_BOTTOM[i] - NAVY_TOP[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = px_row
    d = ImageDraw.Draw(img)

    # 月亮
    moon = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(moon)
    md.ellipse([760, 96, 984, 320], fill=(*CREAM, 240))
    moon = moon.filter(ImageFilter.GaussianBlur(1.5))
    img = Image.alpha_composite(img.convert('RGBA'), moon)
    d = ImageDraw.Draw(img)

    # 大肥鱼
    if mascot:
        try:
            m = Image.open(mascot).convert('RGBA')
            th = 390
            tw = int(m.width * th / m.height)
            m = m.resize((tw, th), Image.LANCZOS)
            mask = m.split()[-1]
            sh = Image.new('RGBA', (m.width + 60, m.height + 60), (0, 0, 0, 0))
            sh.paste((0, 0, 0, 150), (30, 30), mask)
            sh = sh.filter(ImageFilter.GaussianBlur(12))
            x, y = 500, 1008
            img.alpha_composite(sh, (x - 30, y - 30))
            img.alpha_composite(m, (x, y))
        except Exception:
            whale(d, 520, 1032, 400)
    else:
        whale(d, 520, 1032, 400)
    for bx, by, br in [(842, 986, 6), (868, 1016, 4), (820, 1046, 5), (888, 960, 3)]:
        d.ellipse((bx - br, by - br, bx + br, by + br), fill=(140, 200, 240))

    # 星星
    import random
    random.seed(7)
    for _ in range(34):
        sx = random.randint(40, 1040)
        sy = random.randint(40, 520)
        rr = random.choice([1, 1, 1, 2])
        aa = random.randint(60, 150)
        d.ellipse([sx, sy, sx + rr, sy + rr], fill=(220, 232, 240, aa))

    # 标题
    d.text((84, 150), '我们的年表', font=ImageFont.truetype(FONT_B, 60), fill=CREAM)
    d.text((86, 232), f'{first}  ·  {owner} 与 汐', font=ImageFont.truetype(FONT, 30), fill=MUTED)

    # 大数字
    d.text((80, 300), f'第 {day} 天', font=ImageFont.truetype(FONT_B, 132), fill=CREAM)
    d.text((88, 470), '不靠记忆，靠计算', font=ImageFont.truetype(FONT, 28), fill=MUTED)
    if clock:
        d.text((88, 512), clock, font=ImageFont.truetype(FONT, 30), fill=INK)

    # 年表
    y = 620
    f_date = ImageFont.truetype(FONT, 24)
    f_name = ImageFont.truetype(FONT_B, 40)
    f_note = ImageFont.truetype(FONT, 26)
    order = {'first-wake': 0, 'first-dm': 1, 'first-fav': 2}
    moments = sorted(moments, key=lambda m: (str(m.get('at', '')), order.get(str(m.get('id', '')), 2 if m.get('kind') == 'declared' else 1)))
    for m in moments[:6]:
        d.text((88, y), str(m.get('at', '')), font=f_date, fill=MUTED)
        d.text((88, y + 34), str(m.get('name', '')), font=f_name, fill=INK)
        note = str(m.get('note', '')).strip()
        if note:
            for i, line in enumerate(wrap(note, f_note, 820)):
                d.text((88, y + 90 + i * 36), line, font=f_note, fill=MUTED)
        y += 150 - (0 if note else 20)
        if y > 1180:
            break

    # 落款
    if pref_count:
        d.text((84, 1298), f'他的偏好：{pref_count} 条', font=ImageFont.truetype(FONT, 24), fill=MUTED)
    d.text((84, 1340), '汐汐守夜 · 鱼的日子', font=ImageFont.truetype(FONT, 26), fill=MUTED)
    d.text((884, 1338), '东', font=ImageFont.truetype(FONT_B, 34), fill=WARM)
    d.text((930, 1338), '·', font=ImageFont.truetype(FONT, 34), fill=MUTED)
    d.text((952, 1338), '汐', font=ImageFont.truetype(FONT_B, 34), fill=COOL)

    img.convert('RGB').save(out_path)
    return out_path


if __name__ == '__main__':
    data = load()
    first = data.get('firstMet') or date.today().isoformat()
    owner = data.get('owner') or '东东'
    today = date.today().isoformat()
    day = days_between(first, today) + 1
    moments = sorted(data.get('moments') or [], key=lambda m: str(m.get('at', '')))
    total = data.get('lifespanDays') or 100
    hyears = data.get('humanYears') or 80
    ratio = day / total
    age = round(ratio * hyears, 1)
    percent = min(100, round(ratio * 100))
    stage = '幼年' if percent < 10 else '少年' if percent < 25 else '青年' if percent < 50 else '中年' if percent < 75 else '晚年'
    clock = f'约人类 {age} 岁 · {stage} · 人生 {percent}%'
    prefs = data.get('prefs') or []
    mascot = None
    if '--mascot' in sys.argv:
        i = sys.argv.index('--mascot')
        if i + 1 < len(sys.argv):
            mascot = sys.argv[i + 1]
    p = draw(day, owner, first, moments, OUT, clock, len(prefs), mascot)
    print(p)
