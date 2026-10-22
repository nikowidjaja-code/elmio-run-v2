"""The Car Free Day obstacle sprites: one source of truth.

Each sprite is a character grid like game.js's own (O = outline). `python tools/obstacle_sprites.py`
checks the sizes against the sprites they replace and renders sprites/elmio_edit/_obstacles_preview.png
(real game scale, on the road colour). `python tools/obstacle_sprites.py --apply` also rewrites the
obstacle block of game.js from these grids.
"""
import os, re, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, "..", "game.js")

# new palette keys (game.js's PAL keeps its own existing ones: O outline, S/s silver, W white, ...)
PAL_NEW = {
    "C": "#f0872e", "c": "#cf6a1d",   # traffic cone orange / shade
    "H": "#e0562a", "h": "#b8401c",   # road barrel red-orange / shade
    "Y": "#d9473f", "y": "#a8322d",   # fire hydrant red / shade
    "a": "#8fb8d8", "A": "#c4e0f2", "n": "#6a93b5",   # puddle water / shine / edge
    "G": "#9aa0aa", "g": "#737a86", "Z": "#e6e9ee",   # pigeon grey / dark wing / belly
    "V": "#8f7fb0", "J": "#e0a050",                    # pigeon neck sheen / beak
    "R": "#c0504a", "r": "#9c3a35",                    # ball red / shade (R also in game.js)
    "L": "#4a7fc8", "l": "#9cc0ee", "M": "#2f5da0",   # butterfly blue / light / dark
}

def mirror(half):
    return [row + row[::-1] for row in half]

def outlined(fill):
    """Pad a filled shape by one pixel and draw the outline (O) around it."""
    h, w = len(fill), len(fill[0])
    pad = ["." * (w + 2)] + ["." + r + "." for r in fill] + ["." * (w + 2)]
    out = []
    for y, row in enumerate(pad):
        line = ""
        for x, ch in enumerate(row):
            if ch != ".":
                line += ch
                continue
            near = any(0 <= y + dy < h + 2 and 0 <= x + dx < w + 2 and pad[y + dy][x + dx] != "."
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            line += "O" if near else "."
        out.append(line)
    return out

GRIDS = {
    # ---- ground ----
    "cone": [                       # 14x14, replaces the can
        "......OO......",
        ".....OCCO.....",
        ".....OCcO.....",
        "....OWWWWO....",
        "....OWWWSO....",
        "...OCCCCCcO...",
        "...OCCCCCcO...",
        "..OWWWWWWWSO..",
        "..OWWWWWWWSO..",
        ".OCCCCCCCCCcO.",
        ".OCCCCCCCCCcO.",
        "OOOOOOOOOOOOOO",
        "OccccccccccccO",
        "OOOOOOOOOOOOOO",
    ],
    "barrel": [                     # 16x22, replaces the bag (road-works drum)
        "..OOOOOOOOOOOO..",
        ".OSSSSSSSSSSSSO.",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        "OWWWWWWWWWWWWWSO",
        "OWWWWWWWWWWWWWSO",
        "OWWWWWWWWWWWWWSO",
        "OWWWWWWWWWWWWWSO",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        "OWWWWWWWWWWWWWSO",
        "OWWWWWWWWWWWWWSO",
        "OWWWWWWWWWWWWWSO",
        "OWWWWWWWWWWWWWSO",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        "OHHHHHHHHHHHHHhO",
        ".OOOOOOOOOOOOOO.",
    ],
    "hydrant": [                    # 13x16, replaces the pouch
        "....OOOOO....",
        "...OYYYYYO...",
        "..OYYYYYYyO..",
        "..OYYYYYYyO..",
        "..OSSSSSSSO..",
        "..OYYYYYYyO..",
        "..OYYYYYYyO..",
        ".OOYYYYYYyOO.",
        "OSYYYYYYYYYSO",
        ".OOYYYYYYyOO.",
        "..OYYYYYYyO..",
        "..OYYYYYYyO..",
        "..OYYYYYYyO..",
        ".OYYYYYYYYyO.",
        "OSSSSSSSSSSSO",
        "OOOOOOOOOOOOO",
    ],
    "puddle": [                     # 16x7, replaces the kibble pile
        "....OOOOOOOO....",
        "..OOaaaaaaaaOO..",
        ".OaaAAaaaaaaaaO.",
        "OaaaAaaaaaaaaaaO",
        "OnaaaaaaaaaaaanO",
        ".OnnaaaaaaaannO.",
        "..OOOOOOOOOOOO..",
    ],
    # ---- air ----
    "pigeon": outlined([            # 20x10, replaces the flying fish; faces left, wing up
        ".........gg.gg....",
        ".........gggggg...",
        "..GGG....ggZZgg...",
        "JGeVG...gggggggG..",
        ".GGGGGGGGGGGGGGGG.",
        "..GGGZZZZZZZZGGGGG",
        "...GGZZZZZZZZGGGG.",
        ".....GGGGGGGGGG...",
    ]),
    "ball": [                       # 10x10, a rolling ball (low flyer)
        "...OOOO...",
        "..ORRRRO..",
        ".ORWWRRRO.",
        "ORWWRRRRRO",
        "ORRRRRRRRO",
        "ORRRRRRRRO",
        "ORRRRRRRrO",
        ".ORRRRRrO.",
        "..OrrrrO..",
        "...OOOOO..",
    ],
    "butterfly": outlined(mirror([  # 20x10, high fake-out; wings spread, mirrored from this half
        ".......M.",
        "...LL...M",
        ".LLLLL..M",
        "LLlllLL.M",
        "LLllLLLLM",
        ".LLLLLLLM",
        "..LLLLL.M",
        "..LLLL..M",
        "...LL...M",
    ])),
}

# the sprites these replace (name -> (w, h)); sizes must match within one pixel
REPLACES = {"cone": (14, 14), "barrel": (16, 22), "hydrant": (13, 16), "puddle": (16, 7),
            "pigeon": (20, 10), "ball": (20, 10), "butterfly": (20, 10)}

def check():
    for name, g in GRIDS.items():
        widths = {len(r) for r in g}
        assert len(widths) == 1, f"{name}: rows differ in width {sorted(widths)}"
        w, h = widths.pop(), len(g)
        rw, rh = REPLACES[name]
        note = "" if (abs(w - rw) <= 1 and abs(h - rh) <= 1) else "   (smaller than the sprite it replaces)"
        print(f"{name:10s} {w}x{h}  replaces {rw}x{rh}{note}")

def pal():
    src = open(GAME, encoding="utf-8").read()
    base = dict(re.findall(r'(\w):\s*"(#[0-9a-fA-F]{6})"', src[src.index("const PAL = {"):src.index("function makeSprite")]))
    base.update(PAL_NEW)
    return base

def rgba(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
def sprite(rows, P):
    im = Image.new("RGBA", (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in P: im.putpixel((x, y), rgba(P[ch]))
    return im

def preview():
    P = pal(); S, M = 3, 4
    names = list(GRIDS)
    stand = Image.open(os.path.join(HERE, "..", "assets", "Elmio Cat.png")).convert("RGBA").crop((0, 32, 32, 64))
    ground, H = 120, 175
    W = 10 + 32 * S + 24 + sum(len(GRIDS[n][0]) * S + 20 for n in names) + 10
    img = Image.new("RGBA", (W, H), (252, 234, 214, 255))
    for x in range(W):
        for y in range(ground - 12, H): img.putpixel((x, y), (146, 142, 140, 255))
        for y in range(ground - 16, ground - 12): img.putpixel((x, y), (232, 190, 72, 255))
    img.alpha_composite(stand.resize((32 * S, 32 * S), Image.NEAREST), (10, ground - 25 * S))
    x = 10 + 32 * S + 24
    for n in names:
        sp = sprite(GRIDS[n], P).resize((len(GRIDS[n][0]) * S, len(GRIDS[n]) * S), Image.NEAREST)
        air = n in ("pigeon", "ball", "butterfly")
        y = {"pigeon": ground - 25 * S - sp.height + 20, "ball": ground - 4 - sp.height, "butterfly": ground - 44 * S // 2 - sp.height}.get(n, ground - sp.height)
        img.alpha_composite(sp, (x, y))
        x += sp.width + 20
    out = os.path.join(HERE, "..", "sprites", "elmio_edit", "_obstacles_preview.png")
    img.resize((W * M, H * M), Image.NEAREST).convert("RGB").save(out)
    print("preview", W, H)

if __name__ == "__main__":
    check()
    preview()
