"""Generates images/crow-ground.png (6 x 40x40 crow poses, facing left) and
images/items.png (16x16 cells: 0-6 gifts by tier, 7-11 foods, 12 heart).
Edit the ASCII maps / palettes below and re-run:  python3 tools/make_sprites.py"""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'images')

PAL = {
  'k': (11, 11, 15), 'd': (20, 20, 21), 'm': (37, 37, 37), 'l': (68, 68, 67),
  'b': (155, 156, 155), 'r': (137, 26, 55),
  'g': (232, 182, 44), 'G': (160, 108, 20), 'y': (255, 232, 130),
  's': (205, 210, 220), 'S': (118, 124, 140), 'w': (255, 255, 255),
  'c': (110, 224, 242), 'C': (46, 140, 200), 'n': (110, 70, 38), 'N': (176, 120, 62),
  'e': (224, 186, 116), 'E': (170, 120, 60), 'p': (214, 48, 70), 'P': (140, 24, 44),
  'u': (244, 214, 64), 'U': (196, 150, 20), 'a': (84, 168, 74), 'A': (44, 110, 50),
}

def blit(img, rows, ox, oy):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.': img.putpixel((ox + x, oy + y), PAL[ch] + (255,))

def pad(rows, w):
    return [r.ljust(w, '.') for r in rows]

# ---------------- crow (20 wide, 17 tall, feet on last row) ----------------
BODY = [
 "........kkkk........",
 ".......kmmmmk.......",
 "......kmmrmmmk......",
 "...kkkkmmmmmmmk.....",
 "..kbbbkmmmmmmmmk....",
 "...kkkkdmmmmmmmmk...",
 ".......kdmmmmmmmmk..",
 "......kdddmmmmmmmmk.",
 ".....kddddmlmmmmmmmk",
 ".....kdddddmmmmmmmmk",
 ".....kddddddmmmmmkkk",
 "......kddddddddmkk..",
 ".......kkddddddkk...",
 ".........kkkkkk.....",
]
LEGS = {
 'stand': ["..........kk.kk.....", "..........kk.kk.....", ".........kkk.kkk...."],
 'a':     ["..........kk..kk....", ".........kk....kk...", "........kkk...kkk..."],
 'b':     ["...........kkkk.....", "..........kk..kk....", ".........kkk..kkk..."],
}
PECK = [  # head down, beak at the ground (15 rows, drawn 2 rows lower)
 "..........kkkkk.....",
 ".........kmmmmmk....",
 "........kmmmmmmmk...",
 ".......kdmmmmmmmmk..",
 "......kddmmmmmmmmmk.",
 ".....kdddmmlmmmmmmmk",
 "..kkkddddmmmmmmmmkkk",
 ".kmmmkdddddmmmmmmkk.",
 "kmmrmmkddddddmmkk...",
 "kbbkkmmkddddddkk....",
 "kbk.kkkkkkkkkk......",
 ".k.....kkk.kkk......",
 "......kkkk.kkkk.....",
 "......kk....kk......",
 ".....kkk....kkk.....",
]

def crow_frame(kind):
    im = Image.new('RGBA', (40, 40), (0, 0, 0, 0))
    ox, oy = 10, 8
    if kind in ('idle', 'a', 'b', 'happy'):
        legs = LEGS['stand' if kind in ('idle', 'happy') else kind]
        body = pad(BODY, 20)
        if kind == 'happy':  # eye closed
            body = [r.replace('r', 'k') for r in body]
        lift = 1 if kind == 'b' else 0
        blit(im, body, ox, oy - lift)
        blit(im, legs, ox, oy + 14 - (0 if kind != 'b' else 0))
    else:  # peck up / peck down
        rows = pad(PECK, 20)
        blit(im, rows, ox, oy + 2 + (0 if kind == 'peckdown' else -2))
    return im

KINDS = ['idle', 'a', 'b', 'peckup', 'peckdown', 'happy']
sheet = Image.new('RGBA', (40 * len(KINDS), 40), (0, 0, 0, 0))
for i, k in enumerate(KINDS): sheet.paste(crow_frame(k), (i * 40, 0))
sheet.save(os.path.join(OUT, 'crow-ground.png'))

# ---------------- items (16x16) ----------------
ICONS = {}
ICONS['bolt'] = [
 ".....ssssss.....", "....sSSSSSSs....", "....sSwwSSSs....", "....SSSSSSSS....", ".....SSSSSS.....",
 "......sSSs......", "......sSSs......", "......SssS......", "......sSSs......", "......SssS......",
 "......sSSs......", "......SssS......", "......sSSs......", ".......SS.......",
]
ICONS['spoon'] = [
 "......sss.......", ".....ssssS......", "....sswsssS.....", "....ssssssS.....", "....sssssSS.....",
 ".....sssSS......", "......sSS.......", ".......SS.......", ".......sS.......", ".......sS.......",
 ".......sS.......", ".......SS.......", ".......SS.......", ".......SS.......",
]
ICONS['key'] = [
 ".....ggggg......", "....gyyyyyg.....", "....gy...yg.....", "....gy...yg.....", "....gyyyyyg.....",
 ".....ggggg......", ".......gG.......", ".......gG.......", ".......gGgg.....", ".......gG.......",
 ".......gGgg.....", ".......gG.......", ".......GG.......",
]
ICONS['coin'] = [
 ".....GGGGGG.....", "....GyyyyyyG....", "...GyygggggyG...", "...GygGGGGggG...", "...GygGyyGggG...",
 "...GygGyyGggG...", "...GygGGGGggG...", "...GyggggggyG...", "....GgyyyygG....", ".....GGGGGG.....",
]
ICONS['ring'] = [
 ".......cc.......", "......cwcC......", ".......CC.......", "......gggg......", ".....gy..gG.....",
 "....gy....gG....", "....g......G....", "....g......G....", "....gy....gG....", ".....gyyggG.....",
 "......GGGG......",
]
ICONS['gem'] = [
 "...cccccccc....", "..cwwcccccCC...", ".cwcccccccCCC..", "..ccccccccCC...", "...cccccccC....",
 "....cccccCC....", ".....ccCC......", "......CC.......",
]
ICONS['crown'] = [
 "..g...g...g.....", "..gg.ggg.gg.....", "..ggggggggg.....", "..gyyyyyyyg.....", "..gyrygybyg.....",
 "..gggggggGG.....", "..GGGGGGGGG.....",
]
ICONS['heart'] = [
 ".pp..pp.", "pwppppPp", "pppppppP", ".ppppPP.", "..pPPP..", "...PP...",
]

def fill_oval(cx, cy, rx, ry, col, im):
    for y in range(16):
        for x in range(16):
            if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: im.putpixel((x, y), PAL[col] + (255,))

def icon_from_rows(rows):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    w = max(len(r) for r in rows); rows = [r.ljust(w, '.') for r in rows]
    xs = [x for r in rows for x, ch in enumerate(r) if ch != '.']
    x0, x1 = min(xs), max(xs); h = len(rows)
    blit(im, [r[x0:x1 + 1] for r in rows], (16 - (x1 - x0 + 1)) // 2, (16 - h) // 2)
    return im

def outline(im, col=(18, 14, 24, 255)):
    src = im.copy(); px = src.load(); out = im.copy()
    for y in range(16):
        for x in range(16):
            if px[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 16 and 0 <= ny < 16 and px[nx, ny][3]:
                        out.putpixel((x, y), col); break
    return out

cells = [icon_from_rows(ICONS[k]) for k in ['bolt', 'spoon', 'key', 'coin', 'ring', 'gem', 'crown']]
# foods: 7 hazelnut, 8 peanut, 9 bread, 10 corn, 11 cookie
nut = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); fill_oval(8, 9, 4.5, 5, 'n', nut); fill_oval(7, 8, 2.6, 3, 'N', nut); fill_oval(8, 4, 3.5, 1.6, 'E', nut)
pea = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); fill_oval(8, 5.5, 3.2, 3.2, 'e', pea); fill_oval(8, 10.5, 3.6, 3.6, 'e', pea); fill_oval(7, 10, 1.4, 1.4, 'E', pea)
bread = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); fill_oval(8, 9, 6.5, 4.2, 'E', bread); fill_oval(8, 8.4, 5.6, 3.4, 'e', bread)
for x in (5, 8, 11):
    for y in (7, 8, 9): bread.putpixel((x, y), PAL['E'] + (255,))
corn = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); fill_oval(8, 7, 3.2, 5.5, 'u', corn); fill_oval(8, 11, 4.5, 3.6, 'a', corn); fill_oval(8.5, 11.5, 2.2, 2.6, 'A', corn)
for y in range(3, 10, 2):
    for x in (7, 9): corn.putpixel((x, y), PAL['U'] + (255,))
cookie = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); fill_oval(8, 8, 5.5, 5.5, 'N', cookie)
for x, y in ((6, 6), (10, 7), (7, 10), (11, 11), (9, 5)): cookie.putpixel((x, y), PAL['n'] + (255,))
ICONS['sack'] = [
 ".....nn.nn.....", "....nNNnNNn....", ".....nnEnn.....", "....nNNEENNn...", "...nNNNNNNNNn..", "..nNNNnNNNNNNn.",
 ".nNNNNNNNNNNNNn", ".nNNuNNnNNNNNNn", ".nNNNNNNNNnNNNn", ".nNNnNNNNNNNNNn", ".nNNNNNNNNNNNNn", "..nNNNNNNNNNNn.", "...nnnnnnnnnn..",
]
ICONS['crate'] = [
 "nnnnnnnnnnnnnn", "nkkkkkkkkkkkkn", "nkkkkkkkkkkkkn", "nNNNNNNNNNNNNn", "nNnNNNNNNNNnNn", "nNNnNNNNNNnNNn",
 "nNNNnNNNNnNNNn", "nNNNNnNNnNNNNn", "nNNNNNnnNNNNNn", "nnnnnnnnnnnnnn",
]
cells += [nut, pea, bread, corn, cookie, icon_from_rows(ICONS['heart']), icon_from_rows(ICONS['sack']), icon_from_rows(ICONS['crate'])]
cells = [outline(c) for c in cells]
atlas = Image.new('RGBA', (16 * len(cells), 16), (0, 0, 0, 0))
for i, c in enumerate(cells): atlas.paste(c, (i * 16, 0))
atlas.save(os.path.join(OUT, 'items.png'))

# ---------------- UI icons -> images/ui.png (16 cells of 16x16) ----------------
UI = {}
UI['crow'] = ["..kkkkk.....", ".kmmmmmk....", "kmmrmmmmk...", "kbbmmmmmmk..", ".kkkdmmmmk..", "...kddddmk..", "....kkkkk..."]
UI['caw'] = [".wwwwwwww.", "wwwwwwwwww", "wwwwppwwww", "wwwwppwwww", "wwwwppwwww", "wwwwwwwwww", "wwwwppwwww", ".wwwwwwww.", "...ww.....", "..w......."]
UI['lock'] = ["...ssss...", "..s....s..", "..s....s..", "..s....s..", ".gggggggg.", ".gyyyyyyg.", ".gyyGGyyg.", ".gyyGGyyg.", ".gyyyyyyg.", ".gggggggg."]
UI['tree'] = ["....aaaa....", "..aaaAaaaa..", ".aaaaaaAaaa.", ".aAaaaaaaaa.", "..aaaAaaaa..", "....aaaa....", ".....nn.....", ".....nn.....", "....nnnn...."]
UI['bag'] = ["...nnnn...", "...NNNN...", "..nnnnnn..", ".nNNNNNNn.", "nNNNnnNNNn", "nNNNnnNNNn", "nNNNNNNNNn", ".nnnnnnnn."]
UI['wheat'] = ["......u.....", ".....uUu....", "....uUuU....", ".....uUu....", "....uUuU....", ".....uUu....", "....uUuU....", "......a.....", "......a.....", "......a.....", ".....aa....."]
UI['hand'] = ["..e.e.e.....", ".eEeEeEe....", ".eeeeeeEe...", ".eeeeeeeEe..", ".eeeeeeeeE..", "..eeeeeeE...", "...eeeeE....", "...EEEE....."]
UI['nest'] = ["..cc.cc..", ".cwcccwc.", "nNnNnNnNn", "nnNnNnNnn", ".nnnnnnn."]
UI['feather'] = [".........cc", ".......cccc", ".....ccccwC", "....cccccC.", "...cccccC..", "..cccccC...", ".cccccC....", "cccccC.....", ".nCC.......", "n.........."]
UI['magnify'] = ["..ssss....", ".s....s...", "s..ww..s..", "s......s..", "s......s..", ".s....s...", "..ssss.n..", "......nnn.", ".......nn."]
UI['gift'] = ["...yy.yy...", "..y..yy..y.", "...yyyyyy..", "pppppyypppp", "pppppyypppp", "yyyyyyyyyyy", "pppppyypppp", "pppppyypppp", "PPPPPyyPPPP"]
ui_cells = [cells[3], cells[7]] + [outline(icon_from_rows(UI[k])) for k in ['crow', 'caw', 'lock', 'tree']] + [cells[8]] + \
           [outline(icon_from_rows(UI[k])) for k in ['bag', 'wheat', 'hand', 'nest', 'feather', 'magnify', 'gift']]
# index: 14-18 foods; 0 coin 1 nut 2 crow 3 caw 4 lock 5 tree 6 peanut 7 bag 8 wheat 9 hand 10 nest 11 feather 12 magnify 13 gift
ui_cells += cells[7:12]  # 14-18 food icons (hazelnut, peanut, bread, corn, cookie)
UI['feeder'] = ["..u...u..", "....u....", "..u...u..", ".nnnnnnnnn.", "nNNNNNNNNNn", ".nNNNNNNNn.", "..nnnnnnn.."]
UI['deposit'] = ["....gg....", "....gg....", "..gggggg..", "...gggg...", "....gg....", "nnnnnnnnnnnn", "nkkkkkkkkkkn", "nNNNNNNNNNNn", "nNNNNNNNNNNn", "nnnnnnnnnnnn"]
ui_cells += [outline(icon_from_rows(UI['feeder'])), outline(icon_from_rows(UI['deposit']))]  # 19 auto feeder, 20 auto deposit
ui = Image.new('RGBA', (16 * 22, 16), (0, 0, 0, 0))
for i, c in enumerate(ui_cells): ui.paste(c, (i * 16, 0))
ui.save(os.path.join(OUT, 'ui.png'))
if os.path.isdir('/private/tmp/claude-501/work'):
    big = ui.resize((ui.width * 3, 48), Image.NEAREST); bgim = Image.new('RGBA', big.size, (60, 48, 72, 255)); bgim.paste(big, (0, 0), big); bgim.save('/private/tmp/claude-501/work/ui_preview.png')

# preview (8x) for eyeballing
prev = Image.new('RGBA', (240 * 8 // 2 + 40, 700), (110, 150, 90, 255))
c8 = sheet.resize((sheet.width * 4, 160), Image.NEAREST); prev.paste(c8, (0, 0), c8)
a8 = atlas.resize((atlas.width * 4, 64), Image.NEAREST); prev.paste(a8, (0, 180), a8)
prev.crop((0, 0, 960, 260)).save('/private/tmp/claude-501/work/preview.png') if os.path.isdir('/private/tmp/claude-501/work') else None
print('wrote', len(cells), 'item cells')
