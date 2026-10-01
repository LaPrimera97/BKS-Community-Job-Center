#!/usr/bin/env python3
"""
Rebuilds the favicons from logo-src.png with a border so the icon pops in a browser tab.
Run from the repo root:  python3 favicon_badge.py            (circle, default)
                         python3 favicon_badge.py square     (rounded square)
"""
import os, re, sys

try:
    from PIL import Image, ImageChops, ImageDraw
except ImportError:
    os.system(f"{sys.executable} -m pip install --quiet pillow")
    from PIL import Image, ImageChops, ImageDraw

ROOT = os.getcwd()
SHAPE = sys.argv[1].lower() if len(sys.argv) > 1 else "circle"
if SHAPE not in ("circle", "square"):
    sys.exit("Use: python3 favicon_badge.py [circle|square]")

FILL = (255, 255, 255, 255)      # badge background (white pops on dark and light tab bars)
RING = (4, 59, 40, 255)          # deep green border (matches the site)
ACCENT = (245, 200, 66, 255)     # thin gold inner line
SRC = os.path.join(ROOT, "logo-src.png")
if not os.path.exists(SRC):
    sys.exit("logo-src.png not found in the repo root.")

# ---- trim the logo
logo = Image.open(SRC).convert("RGBA")
corner = logo.getpixel((0, 0))
if corner[3] < 10:
    mask = logo.getchannel("A").point(lambda v: 255 if v > 12 else 0)
else:
    diff = ImageChops.difference(logo, Image.new("RGBA", logo.size, corner)).convert("L")
    mask = diff.point(lambda v: 255 if v > 24 else 0)
box = mask.getbbox()
logo = logo.crop(box)


def badge(n):
    S = n * 4  # supersample for smooth edges
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ring_w = max(int(S * 0.075), 4)
    gold_w = max(int(S * 0.02), 2)
    r = int(S * 0.22)

    def shape(bounds, **kw):
        if SHAPE == "circle":
            d.ellipse(bounds, **kw)
        else:
            d.rounded_rectangle(bounds, radius=r, **kw)

    shape((0, 0, S - 1, S - 1), fill=RING)
    i1 = ring_w
    shape((i1, i1, S - 1 - i1, S - 1 - i1), fill=ACCENT)
    i2 = ring_w + gold_w
    shape((i2, i2, S - 1 - i2, S - 1 - i2), fill=FILL)

    # logo scaled to sit inside the badge (circle needs more inset than a square)
    inner = S - 2 * i2
    target = int(inner * (0.72 if SHAPE == "circle" else 0.80))
    scale = target / max(logo.size)
    lw, lh = max(int(logo.width * scale), 1), max(int(logo.height * scale), 1)
    lg = logo.resize((lw, lh), Image.LANCZOS)
    img.alpha_composite(lg, ((S - lw) // 2, (S - lh) // 2))
    return img.resize((n, n), Image.LANCZOS)


badge(32).save(os.path.join(ROOT, "favicon-32.png"))
badge(192).save(os.path.join(ROOT, "favicon-192.png"))
badge(512).save(os.path.join(ROOT, "favicon-512.png"))
badge(64).save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
touch = Image.new("RGBA", (180, 180), (4, 59, 40, 255))
touch.alpha_composite(badge(180))
touch.convert("RGB").save(os.path.join(ROOT, "apple-touch-icon.png"))
print(f"OK  favicons rebuilt as a {SHAPE} badge")

# ---- bump the cache-buster so browsers fetch the new icons
for page in ["index.html", "portal.html", "tracker.html", "admin.html", "privacy.html"]:
    p = os.path.join(ROOT, page)
    s = open(p, encoding="utf-8").read()
    n = re.sub(r"(favicon[\w.-]*\.(?:ico|png)|apple-touch-icon\.png)\?v=\d+", r"\1?v=3", s)
    if n != s:
        open(p, "w", encoding="utf-8", newline="").write(n)
        print(f"OK  {page}: cache version bumped")
print("Done. Hard refresh (Ctrl+Shift+R) or open a private window to see it.")
