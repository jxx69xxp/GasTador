"""
MeowMeow brand generator — regenerates the cat mascot, app icons, splash and login hero art from code.
Run: python3 scripts/make-logo.py   (needs Pillow)
"""
from PIL import Image, ImageDraw

SS = 3  # supersampling for smooth edges
INK, WHITE = (31, 41, 55, 255), (255, 255, 255, 255)        # #1F2937 outline
PINK, ORANGE, GOLD = (249, 168, 212, 255), (251, 146, 60, 255), (251, 191, 36, 255)
TEAL_TOP, TEAL_BOTTOM = (45, 212, 191), (15, 118, 110)       # #2DD4BF -> #0F766E
MINT_TOP, MINT_BOTTOM = (153, 246, 228), (45, 212, 191)       # arch window #99F6E4 -> #2DD4BF
CREAM, TANGERINE, PEACH = (255, 247, 237, 255), (251, 146, 60, 255), (253, 186, 116, 255)


def gradient(w, h, top=TEAL_TOP, bottom=TEAL_BOTTOM):
    """Vertical two-stop gradient."""
    img = Image.new('RGBA', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h - 1)
        d.line((0, y, w, y), fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,))
    return img


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


def paw(d, x, y, r, fill):
    """Paw print: main pad + four toes. r = main pad radius."""
    d.ellipse((x - r, y - r * 0.8, x + r, y + r * 0.8), fill=fill)
    for dx, dy in ((-1.05, -1.05), (-0.38, -1.55), (0.38, -1.55), (1.05, -1.05)):
        d.ellipse((x + dx * r - r * 0.36, y + dy * r - r * 0.42, x + dx * r + r * 0.36, y + dy * r + r * 0.42), fill=fill)


def hero(w, h):
    """Login hero: cat sitting on a cushion inside a mint arch window, coins + paw prints around it, on cream."""
    img = Image.new('RGBA', (w, h), CREAM)
    S = lambda *v: [round(c * SS) for c in v]

    # arch window (mint gradient), clipped by an arch-shaped mask
    x0, x1, top, bottom = w * 0.2, w * 0.8, h * 0.05, h * 0.9
    aw = x1 - x0
    mask = Image.new('L', (w * SS, h * SS), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse(S(x0, top, x1, top + aw), fill=255)
    md.rounded_rectangle(S(x0, top + aw / 2 - 40, x1, bottom), radius=40 * SS, fill=255)  # corners hide under the dome
    window = gradient(w, h, MINT_TOP, MINT_BOTTOM)
    wd = ImageDraw.Draw(window)
    for px, py, pr in ((0.33, 0.3, 22), (0.68, 0.18, 18), (0.71, 0.7, 22), (0.3, 0.68, 18)):  # faint paws inside
        paw(wd, w * px, h * py, pr, (255, 255, 255, 90))
    img.paste(window, (0, 0), mask.resize((w, h), Image.LANCZOS))

    # coins + paw prints scattered on the cream
    deco = Image.new('RGBA', (w * SS, h * SS), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    for cx, cy, r in ((0.09, 0.34, 0.045), (0.9, 0.2, 0.055), (0.91, 0.6, 0.035), (0.12, 0.62, 0.03)):
        R, lw = w * r * SS, round(w * 0.007 * SS)
        X, Y = w * cx * SS, h * cy * SS
        dd.ellipse((X - R, Y - R, X + R, Y + R), fill=GOLD, outline=INK, width=lw)
        dd.ellipse((X - R * 0.55, Y - R * 0.55, X + R * 0.55, Y + R * 0.55), outline=(217, 119, 6, 255), width=round(lw * 0.7))
    for px, py, pr in ((0.07, 0.86, 16), (0.93, 0.83, 13), (0.85, 0.42, 11)):
        paw(dd, w * px * SS, h * py * SS, pr * SS, PEACH)
    img.alpha_composite(deco.resize((w, h), Image.LANCZOS))

    # the cat (body ends inside the cushion), then the cushion in front of it
    s = w * 0.15
    img.alpha_composite(cat((w, round(h * 0.95)), s, w / 2, h * 0.5, body=True), (0, 0))
    cush = Image.new('RGBA', (w * SS, h * SS), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cush)
    cd.rounded_rectangle(S(w * 0.14, h * 0.82, w * 0.86, h * 0.97), radius=h * 0.075 * SS, fill=TANGERINE,
                         outline=INK, width=round(s * 0.07 * SS))
    cd.rounded_rectangle(S(w * 0.22, h * 0.845, w * 0.78, h * 0.865), radius=h * 0.01 * SS, fill=PEACH)  # highlight
    img.alpha_composite(cush.resize((w, h), Image.LANCZOS))
    return img


if __name__ == '__main__':
    # head extents: whiskers ±1.22s wide, ears -1.22s .. chin +0.85s tall -> center sits 0.19s below middle
    icon = gradient(1024, 1024)
    icon.alpha_composite(cat((1024, 1024), 300, 512, 512 + 57))
    icon.save('assets/icon.png')                                              # iOS masks corners itself
    cat((1024, 1024), 215, 512, 512 + 41).save('assets/adaptive-icon.png')    # Android 66% safe zone
    cat((1024, 1024), 380, 512, 512 + 72).save('assets/splash-icon.png')      # on teal splash bg
    rounded(icon).save('assets/logo.png')
    rounded(icon).resize((48, 48), Image.LANCZOS).save('assets/favicon.png')
    hero(1200, 1100).save('assets/hero.png')                                  # login hero (cat included)
    print('assets written')
