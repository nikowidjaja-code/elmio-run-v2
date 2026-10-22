"""Builds the app icons (Elmio's face on the morning peach) from assets/Elmio Cat.png."""
from PIL import Image
sheet = Image.open("assets/Elmio Cat.png").convert("RGBA")
face = sheet.crop((14, 7, 26, 19))                      # head from the first stand frame, 12x12
PEACH = (252, 234, 214, 255)
def icon(size, pad):
    cells = 12 + 2 * pad
    base = Image.new("RGBA", (cells, cells), PEACH)
    base.alpha_composite(face, (pad, pad))
    return base.resize((size, size), Image.NEAREST)
for size, pad in ((32, 1), (180, 2), (192, 2), (512, 2)):
    icon(size, pad).save(f"assets/icon-{size}.png")
