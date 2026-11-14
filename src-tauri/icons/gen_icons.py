#!/usr/bin/env python3
"""Generate UNOEditor icon set from the design geometry (matches icon.svg)."""
from PIL import Image, ImageDraw

S = 4  # supersample factor (draw at 4096, downscale)
DARK = (22, 24, 29, 255)
LIGHT = (244, 245, 247, 255)
SWATCHES = [(316, (226, 35, 26)), (447, (107, 79, 138)),
            (578, (29, 158, 117)), (709, (239, 159, 39))]
R_SW = 58
STROKE = 110
R_U = 146
STEM_L, STEM_R = 366, 658
TOP, JOIN = 262, 452

img = Image.new("RGBA", (1024 * S, 1024 * S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def p(*xy):
    return [v * S for v in xy]

# dark squircle tile
d.rounded_rectangle(p(0, 0, 1024, 1024), radius=230 * S, fill=DARK)

# U glyph: stems + bottom semicircular arc, round caps
cap_r = STROKE // 2
d.line(p(STEM_L, TOP, STEM_L, JOIN), fill=LIGHT, width=STROKE * S)
d.line(p(STEM_R, TOP, STEM_R, JOIN), fill=LIGHT, width=STROKE * S)
d.ellipse(p(STEM_L - cap_r, TOP - cap_r, STEM_L + cap_r, TOP + cap_r), fill=LIGHT)
d.ellipse(p(STEM_R - cap_r, TOP - cap_r, STEM_R + cap_r, TOP + cap_r), fill=LIGHT)
CX = (STEM_L + STEM_R) // 2
d.arc(p(CX - R_U - cap_r, JOIN - R_U - cap_r, CX + R_U + cap_r, JOIN + R_U + cap_r),
      start=0, end=180, fill=LIGHT, width=STROKE * S)

# theme color swatches
for cx, color in SWATCHES:
    d.ellipse(p(cx - R_SW, 759 - R_SW, cx + R_SW, 759 + R_SW), fill=color)

base = img.resize((1024, 1024), Image.LANCZOS)
base.save("icon.png")

for name, size in [("32x32.png", 32), ("128x128.png", 128),
                   ("128x128@2x.png", 256), ("icon-512.png", 512)]:
    base.resize((size, size), Image.LANCZOS).save(name)

# icns + ico
base.save("icon.icns")
base.save("icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48),
                             (64, 64), (128, 128), (256, 256)])
print("done")
