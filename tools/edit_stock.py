"""Edit the stock Orange Cat sheet into Elmio: same 32x32 grid, same frames.

Pass 1: recolour to his golden coat (guideline photos) and paint white socks.
Pass 3: two real crouch frames for ducking (cells (2,1) and (2,2)), built from the
        finished stand1/stand2 frames: head lowered onto the body, legs unchanged; plus a
        half-way 'duckmid' frame at (1,2) for the transition into and out of the duck, and a 'land'
        frame at (1,3) (head dropped 3 rows) shown for a blink when a jump touches down.
Pass 2: cream tail tip (per-frame coordinates) and a white chest bib (the
        "collar" band under the chin).
Writes sprites/elmio_edit/Elmio Cat.png; assets/ is never touched.
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "assets", "Orange Cat.png")
OUT = os.path.join(HERE, "..", "sprites", "elmio_edit")

RECOLOR = {  # stock orange -> Elmio golden
    (255, 173, 99, 255): (238, 158, 70, 255),   # base
    (240, 150, 71, 255): (214, 130, 50, 255),   # shade
    (218, 124, 43, 255): (186, 104, 36, 255),   # stripe
    (255, 201, 153, 255): (250, 200, 130, 255), # light
}
LIGHT = (255, 201, 153, 255)
STRIPE = (218, 124, 43, 255)
SHADE = (240, 150, 71, 255)
OUTLINE = (58, 40, 2, 255)
WHITE = (255, 244, 226, 255)
CELL = 32

# Tail tip pixels per cell (row, col) -> cell-local (x, y), read off the sheet
# frame by frame. The tail ends somewhere different in every pose.
TAIL_TIP = {
    (1, 0): [(9, 14), (9, 15), (9, 16)],   # stand1
    (1, 1): [(9, 14), (9, 15), (9, 16)],   # stand2
    (0, 0): [(9, 16), (9, 17), (9, 18)],   # stand3
    (0, 1): [(9, 15), (9, 16), (9, 17)],   # crouch
    (0, 2): [(9, 13), (9, 14), (9, 15)],   # stretch
    (0, 3): [(9, 12), (9, 13), (9, 14)],   # tuck
    (2, 0): [(9, 15), (9, 16), (9, 17)],   # stand4
    (3, 0): [(8, 18), (8, 19), (8, 20)],   # sit1
    (3, 1): [(7, 20), (8, 21), (9, 21)],   # sit2
    (3, 2): [(6, 22), (7, 21), (8, 21)],   # sit3
    (3, 3): [(8, 24), (8, 25), (8, 23)],   # sit4
    (4, 0): [(10, 25), (11, 26), (10, 24)], # lay1
    (4, 1): [(10, 25), (11, 26), (10, 24)], # lay2
    (5, 1): [(12, 25), (13, 25), (11, 25)], # lay3
    (5, 3): [(9, 26), (10, 25), (10, 24)],  # lay4
    (6, 0): [(13, 24), (14, 24), (12, 24)], # curl
    (7, 0): [(13, 24), (14, 24), (12, 24)], # sleep1
    (7, 1): [(11, 25), (12, 25), (11, 24)], # sleep2
    (7, 2): [(10, 25), (11, 26), (10, 24)], # sleep3
}

def main():
    src = Image.open(SRC).convert("RGBA")
    out = Image.new("RGBA", (src.width, src.height), (0, 0, 0, 0))
    out.paste(src, (0, 0))
    sp, op = src.load(), out.load()
    for cy in range(0, src.height, CELL):
        for cx in range(0, src.width, CELL):
            ys = [y for y in range(cy, cy + CELL) for x in range(cx, cx + CELL) if sp[x, y][3]]
            if not ys:
                continue
            maxy = max(ys)
            for y in range(cy, cy + CELL):
                for x in range(cx, cx + CELL):
                    c = sp[x, y]
                    if not c[3]:
                        continue
                    if c == LIGHT and y >= maxy - 2:      # the stock paw highlight becomes a white sock
                        op[x, y] = WHITE
                    elif c in RECOLOR:
                        op[x, y] = RECOLOR[c]
    # pass 2 reads the stock colours from src, writes the finished ones to out
    for (r, c), pts in TAIL_TIP.items():
        for (x, y) in pts:
            gx, gy = c * CELL + x, r * CELL + y
            assert sp[gx, gy][3] and sp[gx, gy] != OUTLINE, f"tail tip on outline/empty at {(r, c)} {(x, y)}"
            op[gx, gy] = WHITE
    for cy in range(0, src.height, CELL):
        for cx in range(0, src.width, CELL):
            for y in range(cy, cy + CELL):
                run = [x for x in range(cx, cx + CELL) if sp[x, y] == STRIPE]
                # the collar band: a run of 4 stripe pixels with the 4-wide shade row beneath it
                for x0 in run:
                    if all(sp[x0 + i, y] == STRIPE for i in range(4)) and y + 1 < cy + CELL                             and all(sp[x0 + i, y + 1] == SHADE for i in range(4)):
                        for i in range(4):
                            op[x0 + i, y] = WHITE
                            if i in (1, 2):                      # V shape: outer pixels stay shade
                                op[x0 + i, y + 1] = WHITE
    # pass 3: crouch frames. The head (everything right of HEAD_X and above its
    # chin row) drops DROP rows onto the body; the body, legs and tail stay put.
    HEAD_X = 14
    # (source cell, target cell, chin row, rows the head drops): two crouch-run frames, and the
    # half-way "duckmid" frame (head dropped 2 of the 4 rows) shown for a blink when the duck
    # starts and ends
    for (r, c), (dr, dc), chin, DROP in (((1, 0), (2, 1), 17, 4), ((1, 1), (2, 2), 18, 4),
                                          ((1, 0), (1, 2), 17, 2), ((1, 0), (1, 3), 17, 3)):
        cell = out.crop((c * CELL, r * CELL, c * CELL + CELL, r * CELL + CELL))
        body, head = cell.copy(), Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        bp, hp = body.load(), head.load()
        for y in range(chin + 1):
            for x in range(HEAD_X, CELL):
                hp[x, y] = bp[x, y]
                bp[x, y] = (0, 0, 0, 0)
        moved = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        moved.paste(head, (0, DROP))
        body.alpha_composite(moved)
        out.paste(body, (dc * CELL, dr * CELL))
        box = body.getbbox()
        print(f"duck cell ({dr},{dc}) bbox x{box[0]}-{box[2]} y{box[1]}-{box[3]}")
    # pass 5: a small tail flick in the stock run cycle. The cycle plays stand1, stand3, stand2, crouch, so
    # the tip leans left on stand1, stays upright on stand3 and crouch, and leans right on stand2.
    # Done last so the crouch frames built above keep the upright tail.
    def lean_tail(r, c, y0, dx):
        ox, oy = c * CELL, r * CELL
        for y in range(y0 - 1, y0 + 3):                # wipe the old tip and its outline
            for x in range(7, 12):
                assert not (out.getpixel((ox + x, oy + y))[3] and x > 10 and y > y0 - 1 and False)
                op[ox + x, oy + y] = (0, 0, 0, 0)
        tip = [(9 + dx, y0), (9, y0 + 1), (9, y0 + 2)]       # only the top pixel of the tip flicks sideways
        for (x, y) in tip:
            op[ox + x, oy + y] = WHITE
        for (x, y) in tip:                             # outline onto empty neighbours only
            for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + ax, y + ay
                if not op[ox + nx, oy + ny][3]:
                    op[ox + nx, oy + ny] = OUTLINE
    lean_tail(1, 0, 14, -1)                            # stand1: leans left
    lean_tail(1, 1, 14, +1)                            # stand2: leans right
    # pass 6: the headband. On every frame with a face, find the pink nose and paint a two-row band
    # across the forehead just above the eyes (the lower row 3 rows above the nose, the lighter
    # top row above that), from outline to outline. Last, so every derived frame (crouch,
    # land) gets it too.
    BAND = (74, 142, 214, 255)
    BAND_HI = (122, 178, 236, 255)
    NOSE = (255, 133, 132, 255)
    banded = 0
    for cy in range(0, out.height, CELL):
        for cx in range(0, out.width, CELL):
            nose = [(x, y) for y in range(CELL) for x in range(CELL) if op[cx + x, cy + y] == NOSE]
            if not nose:
                continue
            nx, ny = nose[0]
            for y, col in ((ny - 4, BAND_HI), (ny - 3, BAND)):
                for step in (-1, 1):
                    x = nx
                    while 0 <= x < CELL and op[cx + x, cy + y][3] and op[cx + x, cy + y] != OUTLINE:
                        op[cx + x, cy + y] = col
                        x += step
            banded += 1
    print(f"headband on {banded} frames")
    os.makedirs(OUT, exist_ok=True)
    out.save(os.path.join(OUT, "Elmio Cat.png"))
    S = 6
    both = Image.new("RGBA", (src.width * 2 + 8, out.height), (170, 205, 230, 255))
    both.alpha_composite(src, (0, 0)); both.alpha_composite(out, (src.width + 8, 0))
    both.resize((both.width * S, both.height * S), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "_compare.png"))

main()
