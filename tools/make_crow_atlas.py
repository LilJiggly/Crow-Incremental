"""Slices images/crow-reference3.gif (36 frames, 672x672, 21px per art pixel -> 32x32 art cells)
into images/crow3.png (6x6 grid of 32x32 cells, frame i at col i%6, row i//6) and prints per-frame bounding boxes.
Run:  python3 tools/make_crow_atlas.py"""
from PIL import Image
import os, json
HERE = os.path.dirname(__file__); IMG = os.path.join(HERE, '..', 'images')
gif = Image.open(os.path.join(IMG, 'crow-reference3.gif'))
N = gif.n_frames; K = 21; CELL = 32
atlas = Image.new('RGBA', (6 * CELL, ((N + 5) // 6) * CELL), (0, 0, 0, 0)); boxes = []
for i in range(N):
    gif.seek(i); fr = gif.convert('RGBA')
    small = fr.resize((CELL, CELL), Image.NEAREST)
    for y in range(CELL):  # key out the transparent / any semi-transparent leftovers
        for x in range(CELL):
            if small.getpixel((x, y))[3] < 128: small.putpixel((x, y), (0, 0, 0, 0))
    atlas.paste(small, ((i % 6) * CELL, (i // 6) * CELL)); boxes.append(small.getbbox())
atlas.save(os.path.join(IMG, 'crow3.png'))
print(json.dumps(boxes))
