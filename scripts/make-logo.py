"""
GasTador logo generator — regenerates every app icon/splash asset from code.
Mark: a white coin-style "G" with a green growth arrow, on trust-blue.
Run: python3 scripts/make-logo.py   (needs Pillow)
"""
import math
from PIL import Image, ImageDraw

BLUE_TOP, BLUE_BOTTOM = (59, 130, 246), (30, 64, 175)   # #3B82F6 -> #1E40AF
WHITE, GREEN = (255, 255, 255, 255), (16, 185, 129, 255)  # #10B981
SS = 4  # supersampling for smooth edges


def gradient(size):
    img = Image.new('RGBA', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size - 2)  # diagonal top-left -> bottom-right
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(BLUE_TOP, BLUE_BOTTOM)) + (255,)
    return img


def glyph(size, scale):
    """The 'G' + arrow on a transparent canvas; `scale` = mark diameter as fraction of canvas."""
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c, r = S / 2, S * scale / 2
    w = r * 0.28                                   # stroke width
    rc = r - w / 2                                 # stroke centerline radius
    dot = lambda x, y, rad, fill: d.ellipse((x - rad, y - rad, x + rad, y + rad), fill=fill)

    # G ring: from 3 o'clock clockwise round to upper-right, leaving a gap for the arrow
    end = math.radians(305)
    d.arc((c - r, c - r, c + r, c + r), start=0, end=305, fill=WHITE, width=round(w))
    dot(c + rc * math.cos(end), c + rc * math.sin(end), w / 2, WHITE)   # round cap
    # crossbar, joined to the ring at 3 o'clock
    # bottom edge sits on the ring's flat 3 o'clock end, outer edge flush -> clean square corner
    d.rectangle((c + rc * 0.15, c - w, c + r, c), fill=WHITE)

    # green growth arrow: rises from the crossbar's inner end out through the gap
    th = math.radians(-38)
    ux, uy = math.cos(th), math.sin(th)
    nx, ny = -uy, ux
    sx, sy = c + rc * 0.15, c - w / 2
    tx, ty = c + r * 1.02 * ux, c + r * 1.02 * uy
    h, aw = r * 0.42, w * 0.62
    bx, by = tx - ux * h * 0.9, ty - uy * h * 0.9
    d.line((sx, sy, bx, by), fill=GREEN, width=round(aw))
    dot(sx, sy, aw / 2, GREEN)
    d.polygon([(tx, ty),
               (tx - ux * h + nx * h * 0.6, ty - uy * h + ny * h * 0.6),
               (tx - ux * h - nx * h * 0.6, ty - uy * h - ny * h * 0.6)], fill=GREEN)
    return img.resize((size, size), Image.LANCZOS)


def rounded(img, radius_frac=0.225):
    mask = Image.new('L', (img.width * SS, img.height * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, mask.width, mask.height), radius=mask.width * radius_frac, fill=255)
    out = img.copy()
    out.putalpha(mask.resize(img.size, Image.LANCZOS))
    return out


if __name__ == '__main__':
    icon = gradient(1024)
    icon.alpha_composite(glyph(1024, 0.56))
    icon.save('assets/icon.png')                                   # iOS masks the corners itself
    glyph(1024, 0.42).save('assets/adaptive-icon.png')             # Android: inside the 66% safe zone
    glyph(1024, 0.80).save('assets/splash-icon.png')               # centered on blue splash bg
    rounded(icon).save('assets/logo.png')                          # in-app logo
    rounded(icon).resize((48, 48), Image.LANCZOS).save('assets/favicon.png')
    print('assets written')
