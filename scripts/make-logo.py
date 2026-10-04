"""
MeowMeow brand generator — regenerates the cat mascot, app icons, splash and hero art from code.
Run: python3 scripts/make-logo.py   (needs Pillow)
"""
from PIL import Image, ImageDraw

SS = 3  # supersampling for smooth edges
INK, WHITE = (31, 41, 55, 255), (255, 255, 255, 255)        # #1F2937 outline
PINK, ORANGE, GOLD = (249, 168, 212, 255), (251, 146, 60, 255), (251, 191, 36, 255)
CORAL, PURPLE, SKY = (251, 113, 133), (167, 139, 250), (56, 189, 248)  # gradient stops


def gradient(w, h):
    """Coral (bottom-left) -> purple -> sky (top-right)."""
    def lerp(a, b, t):
        return tuple(round(x + (y - x) * t) for x, y in zip(a, b))
    data = []
    for y in range(h):
        for x in range(w):
            t = (x / (w - 1) + 1 - y / (h - 1)) / 2
            data.append(lerp(CORAL, PURPLE, t * 2) if t < .5 else lerp(PURPLE, SKY, t * 2 - 1))
    img = Image.new('RGB', (w, h))
    img.putdata(data)
    return img.convert('RGBA')


def cat(size, s, cx, cy, body=False):
    """Draw the cat on a transparent `size` canvas. s = head radius, (cx, cy) = head center (px, pre-supersample)."""
    W, H = size
    img = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s, cx, cy = s * SS, cx * SS, cy * SS
    lw = round(s * 0.07)
    P = lambda x, y: (cx + x * s, cy + y * s)                  # head-relative coords
    E = lambda x, y, rx, ry: (cx + (x - rx) * s, cy + (y - ry) * s, cx + (x + rx) * s, cy + (y + ry) * s)

    if body:  # torso runs off the bottom edge, paws hold a gold coin
        d.rounded_rectangle((*P(-0.78, 0.55), cx + 0.78 * s, H * SS + 0.7 * s), radius=0.6 * s, fill=WHITE, outline=INK, width=lw)
        d.ellipse(E(0, 1.12, 0.3, 0.3), fill=GOLD, outline=INK, width=lw)
        d.ellipse(E(0, 1.12, 0.17, 0.17), outline=(217, 119, 6, 255), width=round(lw * 0.7))
        for side in (-1, 1):
            d.ellipse(E(side * 0.32, 1.2, 0.2, 0.16), fill=WHITE, outline=INK, width=lw)

    # ears (behind head): left white, right orange tabby
    for side, fill in ((-1, WHITE), (1, ORANGE)):
        outer = [P(side * 0.88, -0.3), P(side * 0.72, -1.22), P(side * 0.18, -0.78)]
        d.polygon(outer, fill=fill, outline=INK, width=lw)
        gx, gy = sum(p[0] for p in outer) / 3, sum(p[1] for p in outer) / 3
        d.polygon([(gx + (x - gx) * 0.5, gy + (y - gy) * 0.5 + s * 0.05) for x, y in outer], fill=PINK)

    # head + tabby patch + outline
    head = E(0, 0, 1.0, 0.85)
    d.ellipse(head, fill=WHITE)
    d.ellipse(E(0.5, -0.38, 0.27, 0.24), fill=ORANGE)
    d.ellipse(head, outline=INK, width=lw)

    # face
    for side in (-1, 1):
        d.ellipse(E(side * 0.38, 0.0, 0.11, 0.15), fill=INK)                     # eye
        d.ellipse(E(side * 0.38 + 0.04, -0.06, 0.04, 0.04), fill=WHITE)          # highlight
        d.ellipse(E(side * 0.62, 0.28, 0.14, 0.08), fill=PINK)                   # blush
        for dy, tilt in ((0.12, -0.08), (0.24, 0.0)):                            # whiskers
            d.line((*P(side * 0.72, dy), *P(side * 1.22, dy + tilt)), fill=INK, width=round(lw * 0.6))
        d.arc(E(side * 0.085, 0.24, 0.085, 0.085), start=0, end=180, fill=INK, width=round(lw * 0.8))  # "w" mouth
    d.polygon([P(-0.08, 0.1), P(0.08, 0.1), P(0, 0.2)], fill=PINK, outline=INK, width=round(lw * 0.6))  # nose

    return img.resize((W, H), Image.LANCZOS)


def rounded(img, radius_frac=0.225):
    mask = Image.new('L', (img.width * SS, img.height * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, mask.width, mask.height), radius=mask.width * radius_frac, fill=255)
    out = img.copy()
    out.putalpha(mask.resize(img.size, Image.LANCZOS))
    return out


def hero(w, h):
    """Gradient with a white wave rising from the bottom-right (login hero background)."""
    img = gradient(w, h)
    m = Image.new('L', (w * SS, h * SS), 0)
    md = ImageDraw.Draw(m)
    md.ellipse((w * 0.05 * SS, h * 0.62 * SS, w * 1.75 * SS, h * 1.6 * SS), fill=255)   # big right swell
    md.ellipse((-w * 0.6 * SS, h * 0.9 * SS, w * 0.7 * SS, h * 1.4 * SS), fill=255)     # low left
    img.paste(Image.new('RGBA', (w, h), WHITE), (0, 0), m.resize((w, h), Image.LANCZOS))
    return img


if __name__ == '__main__':
    # head extents: whiskers ±1.22s wide, ears -1.22s .. chin +0.85s tall -> center sits 0.19s below middle
    icon = gradient(1024, 1024)
    icon.alpha_composite(cat((1024, 1024), 300, 512, 512 + 57))
    icon.save('assets/icon.png')                                              # iOS masks corners itself
    cat((1024, 1024), 215, 512, 512 + 41).save('assets/adaptive-icon.png')    # Android 66% safe zone
    cat((1024, 1024), 380, 512, 512 + 72).save('assets/splash-icon.png')      # on purple splash bg
    rounded(icon).save('assets/logo.png')
    rounded(icon).resize((48, 48), Image.LANCZOS).save('assets/favicon.png')
    cat((1000, 1000), 270, 500, 360, body=True).save('assets/cat.png')        # login mascot
    hero(1206, 1400).save('assets/hero-bg.png')
    print('assets written')
