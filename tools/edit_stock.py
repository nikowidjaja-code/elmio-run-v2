"""Edit the stock Orange Cat sheet into Elmio: same 32x32 grid, same frames.

Pass 1: recolour to his golden coat (guideline photos) and paint white socks.
Pass 3: two real crouch frames for ducking (cells (2,1) and (2,2)), built from the
        finished stand1/stand2 frames: head lowered onto the body, legs unchanged; plus a
        half-way 'duckmid' frame at (1,2) for the transition into and out of the duck.
Pass 4: a 12-frame gallop (6 key poses + 6 in-betweens in rows 8-9, which this script
        adds to the sheet): a 6-frame gallop (cells (2,3), (4,2), (4,3), (6,1), (6,2), (6,3)): the finished
        stand frames' head/body/tail with the legs redrawn per pose, bouncing up in the air.
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
    out = Image.new("RGBA", (src.width, src.height + 2 * CELL), (0, 0, 0, 0))
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
                                          ((1, 0), (1, 2), 17, 2)):
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
    # pass 4: gallop. Upper body (rows <= 20) comes from a finished stand frame,
    # shifted by dy; the belly outline is redrawn and the legs are hand-placed
    # pixel runs. (x, dy) hips: hind near 13, hind far 15, front far 19, front near 21.
    FAR = (214, 130, 50, 255)
    BASE = (238, 158, 70, 255)
    def gallop(src_cell, dy, legs):
        r0, c0 = src_cell
        cell = out.crop((c0 * CELL, r0 * CELL, c0 * CELL + CELL, r0 * CELL + CELL))
        cp = cell.load()
        fr = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        fp = fr.load()
        for y in range(0, 21):
            for x in range(CELL):
                if cp[x, y][3] and 0 <= y + dy < CELL:
                    fp[x, y + dy] = cp[x, y]
        R = 21 + dy                                    # hip row = belly outline row
        for x in range(12, 23):
            fp[x, R] = OUTLINE
        leg_px = {}
        for pts, far, *rest in legs:
            if rest and rest[0] == "pair":             # ground frames: one solid 2px-wide leg per end,
                for i, (x, y) in enumerate(pts):      # ending in a single 2px white paw (few outline dots)
                    paw = i == len(pts) - 1
                    leg_px[(x, y)] = (BASE, paw)
                    leg_px[(x + 1, y)] = (BASE, paw)
                continue
            if rest:                                   # solid 2px limb along the key points
                path = []
                for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                    n = max(abs(x1 - x0), abs(y1 - y0), 1)
                    path += [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n)]
                path.append(pts[-1])
                for i, (x, y) in enumerate(path):
                    paw = i >= len(path) - 2
                    leg_px[(x, y)] = (BASE, paw)
                    leg_px[(x, y + 1)] = (FAR, paw)
                continue
            for i, (x, y) in enumerate(pts):
                leg_px[(x, y)] = (FAR if far else BASE, i == len(pts) - 1)
        for (x, y), (col, paw) in leg_px.items():
            fp[x, y] = WHITE if paw else col
        for (x, y) in list(leg_px):                    # outline the legs, only onto empty pixels
            for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + ax, y + ay
                if 0 <= nx < CELL and 0 <= ny < CELL and not fp[nx, ny][3]:
                    fp[nx, ny] = OUTLINE
        return fr

    def legs_for(R, spec):
        # spec: list of (hip_x, [(dx, dy), ...], far) relative to the hip at (hip_x, R)
        return [([(hx + dx, R + dy) for dx, dy in pts], far, *thick) for hx, pts, far, *thick in spec]

    RUN = []
    # 0 stretched out in the air: the whole cat, paws included, is lifted 2 rows off the ground
    R = 19
    RUN.append(((1, 0), -2, legs_for(R, [
        (13, [(0, 0), (-3, 0)], False, True),
        (21, [(0, 0), (3, 0)], False, True)])))
    # Ground frames show only the near hind leg and the near front leg (the far legs are hidden
    # behind them), so the paws never bunch up: a clear gap between hind and front in every frame.
    # 1 front paws land, hind trailing
    R = 21
    RUN.append(((1, 0), 0, legs_for(R, [
        (12, [(0, 0), (0, 1)], False, "pair"),
        (20, [(0, 0), (0, 1)], False, "pair")])))
    # 2 stance: the limbs are under the body (redrawn; the stock stand2 legs were bunched)
    RUN.append(((1, 1), 0, legs_for(R, [
        (13, [(0, 0), (0, 1)], False, "pair"),
        (19, [(0, 0), (0, 1)], False, "pair")])))
    # 3 push off: both limbs sweeping back
    RUN.append(((1, 0), 0, legs_for(R, [
        (11, [(0, 0), (0, 1)], False, "pair"),
        (17, [(0, 0), (0, 1)], False, "pair")])))
    # 4 tucked at the top of the leap: lifted 3 rows, hind and front gathered under the belly
    R = 18
    RUN.append(((1, 0), -3, legs_for(R, [
        (14, [(0, 0), (-2, 0)], False, True),
        (20, [(0, 0), (2, 0)], False, True)])))
    # 5 reaching: front stretching forward while the hind legs are still tucked, so this
    # is a real in-between pose and not a copy of frame 0
    R = 19
    RUN.append(((1, 0), -2, legs_for(R, [
        (14, [(0, 0), (-2, 0)], False, True),
        (21, [(0, 0), (3, 0)], False, True)])))
    RUN_CELLS = [(2, 3), (4, 2), (4, 3), (6, 1), (6, 2), (6, 3)]
    run_boxes = []
    for (from_cell, dy, legs), (dr, dc) in zip(RUN, RUN_CELLS):
        if legs is None:
            fr = out.crop((from_cell[1] * CELL, from_cell[0] * CELL, from_cell[1] * CELL + CELL, from_cell[0] * CELL + CELL))
        else:
            fr = gallop(from_cell, dy, legs)
        out.paste(fr, (dc * CELL, dr * CELL))
        bx = fr.getbbox()
        run_boxes.append(bx)
        print(f"run cell ({dr},{dc}) bbox x{bx[0]}-{bx[2]} y{bx[1]}-{bx[3]}")
    # in-between poses, one after each key pose (cells in the two extra rows)
    MID = []
    # 0.5 coming down out of the stretch (lifted 1 row), limbs reaching for the ground
    R = 20
    MID.append(((1, 0), -1, legs_for(R, [
        (12, [(0, 0), (0, 1)], False, "pair"),
        (20, [(0, 0), (0, 1)], False, "pair")])))
    # 1.5 settling after the landing: front limb coming back under the shoulders
    R = 21
    MID.append(((1, 0), 0, legs_for(R, [
        (12, [(0, 0), (0, 1)], False, "pair"),
        (19, [(0, 0), (0, 1)], False, "pair")])))
    # 2.5 both limbs starting to trail back
    R = 21
    MID.append(((1, 0), 0, legs_for(R, [
        (12, [(0, 0), (0, 1)], False, "pair"),
        (18, [(0, 0), (0, 1)], False, "pair")])))
    # 3.5 leaving the ground: the same sweep as the push-off, lifted 1 row
    R = 20
    MID.append(((1, 0), -1, legs_for(R, [
        (11, [(0, 0), (0, 1)], False, "pair"),
        (17, [(0, 0), (0, 1)], False, "pair")])))
    # 4.5 the top of the leap, front starting to reach
    R = 18
    MID.append(((1, 0), -3, legs_for(R, [
        (14, [(0, 0), (-2, 0)], False, True),
        (20, [(0, 0), (2, 0)], False, True)])))
    # 5.5 hind stretching back to join the front reach
    R = 19
    MID.append(((1, 0), -2, legs_for(R, [
        (13, [(0, 0), (-2, 0)], False, True),
        (21, [(0, 0), (3, 0)], False, True)])))
    MID_CELLS = [(8, 0), (8, 1), (8, 2), (8, 3), (9, 0), (9, 1)]
    for (from_cell, dy, legs), (dr, dc) in zip(MID, MID_CELLS):
        fr = gallop(from_cell, dy, legs)
        out.paste(fr, (dc * CELL, dr * CELL))
        bx = fr.getbbox()
        print(f"mid cell ({dr},{dc}) bbox x{bx[0]}-{bx[2]} y{bx[1]}-{bx[3]}")
    os.makedirs(OUT, exist_ok=True)
    out.save(os.path.join(OUT, "Elmio Cat.png"))
    S = 6
    both = Image.new("RGBA", (src.width * 2 + 8, out.height), (170, 205, 230, 255))
    both.alpha_composite(src, (0, 0)); both.alpha_composite(out, (src.width + 8, 0))
    both.resize((both.width * S, both.height * S), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "_compare.png"))

main()
