# OHealth Skizzen-Baukasten v2: feste Gliedlängen, Gelenke über Hinweis-Punkte.
import math
EISEN, STEIN, HELL, LINIE, WEISS = "#18201C", "#636B67", "#B4BCB7", "#E1E6E3", "#FFFFFF"
UP, FO, TH, SH, TO, NECK, HEAD, FOOT = 21, 19, 26, 25, 36, 3.5, 7.5, 9
W = 6

def pol(p, ang, l):
    a = math.radians(ang); return (p[0] + l*math.cos(a), p[1] - l*math.sin(a))
def dist(a, b): return math.hypot(a[0]-b[0], a[1]-b[1])
def ik(a, t, l1, l2, hint):
    dx, dy = t[0]-a[0], t[1]-a[1]; d = max(1e-6, min(math.hypot(dx, dy), l1+l2-0.01))
    base = math.atan2(dy, dx); c = max(-1, min(1, (l1*l1 + d*d - l2*l2) / (2*l1*d))); off = math.acos(c)
    cands = [(a[0]+l1*math.cos(base+s*off), a[1]+l1*math.sin(base+s*off)) for s in (1, -1)]
    return min(cands, key=lambda p: dist(p, hint))
def P(pts): return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
def line(pts, c, w=W): return f'<path d="{P(pts)}" stroke="{c}" stroke-width="{w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
def dot(p, r, c): return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="{c}"/>'
def ring(p, r, c, w=3): return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="none" stroke="{c}" stroke-width="{w}"/>'

def fig(c, hip, torso=90, shoulder=None, hand=None, eh=None, ankle=None, kh=None, foot=None,
        hand2=None, eh2=None, ankle2=None, kh2=None, foot2=None, shrug=0, head=None, far=None):
    """Seitenansicht, Blick nach rechts. Rückgabe: (svg, Punkte)."""
    if shoulder is None: shoulder = pol(hip, torso, TO + shrug)
    ang = math.degrees(math.atan2(-(shoulder[1]-hip[1]), shoulder[0]-hip[0]))
    hd = head or pol(shoulder, ang, NECK + HEAD)
    fc = far or c; out = []
    def leg(a, k, f, col):
        kn = ik(hip, a, TH, SH, k or (hip[0]+16, hip[1]+12))
        pts = [hip, kn, a]
        if f is not False: pts.append(f if f is not None else (a[0]+FOOT, a[1]))
        out.append(line(pts, col)); return kn
    def arm(h, e, col):
        el = ik(shoulder, h, UP, FO, e or (shoulder[0], shoulder[1]+20))
        out.append(line([shoulder, el, h], col)); return el
    if ankle2: leg(ankle2, kh2, foot2, fc)
    if hand2: arm(hand2, eh2, fc)
    if ankle: leg(ankle, kh, foot, c)
    out.append(line([hip, shoulder], c, W+1.5))
    if hand: arm(hand, eh, c)
    out.append(dot(hd, HEAD, c))
    return "".join(out), dict(sh=shoulder, hd=hd, hip=hip)

def front(c, neck=(120,50), pelvis=(120,86), hands=None, ehs=None, ankles=None, khs=None, feet=True, head=None, sw=13, hw=7):
    """Vorderansicht. hands/ankles: (links, rechts) im Bild."""
    out = []; L = (neck[0]-sw, neck[1]+2); R = (neck[0]+sw, neck[1]+2)
    pl = (pelvis[0]-hw, pelvis[1]); pr = (pelvis[0]+hw, pelvis[1])
    if ankles:
        for i, (hp, a) in enumerate(zip((pl, pr), ankles)):
            k = ik(hp, a, TH, SH, (khs[i] if khs else (hp[0]+(-8 if i==0 else 8), (hp[1]+a[1])/2)))
            pts = [hp, k, a] + ([(a[0]+(-6 if i==0 else 6), a[1]+1)] if feet else [])
            out.append(line(pts, c))
    out.append(line([pl, pr], c, W)); out.append(line([neck, pelvis], c, W+1.5)); out.append(line([L, R], c, W))
    if hands:
        for i, (s, h) in enumerate(zip((L, R), hands)):
            e = ik(s, h, UP, FO, (ehs[i] if ehs else (s[0]+(-6 if i==0 else 6), s[1]+18)))
            out.append(line([s, e, h], c))
    out.append(dot(head or (neck[0], neck[1]-NECK-HEAD-1), HEAD, c))
    return "".join(out)

# Geräte
def plate(p, c, r=13): return dot(p, r, c) + dot(p, 2.5 if r >= 10 else 1.8, WEISS)
def db(p, c): return plate(p, c, 7)
def dbv(p, c, ang=90):  # Kurzhantel längs (Hammergriff)
    a, b = pol(p, ang, 6), pol(p, ang+180, 6)
    return line([a, b], c, 3) + dot(a, 4.5, c) + dot(b, 4.5, c)
def kb(p, c): return dot((p[0], p[1]+6), 8, c) + f'<path d="M{p[0]-5:.1f} {p[1]+2:.1f} V{p[1]-3:.1f} a5 5 0 0 1 10 0 V{p[1]+2:.1f}" stroke="{c}" stroke-width="3" fill="none"/>'
def bar(x0, x1, y, c, w=4): return line([(x0, y), (x1, y)], c, w)
def bench(x0, x1, y, c, legs=True):
    s = line([(x0, y), (x1, y)], c, 5)
    if legs: s += line([(x0+10, y), (x0+10, 140)], c, 4) + line([(x1-10, y), (x1-10, 140)], c, 4)
    return s
def pad(a, b, c, w=6): return line([a, b], c, w)
def post(x, y0, c, pulley=None): return line([(x, y0), (x, 140)], c, 3) + (ring(pulley, 3.5, c, 2.5) if pulley else "")
def cable(a, b, c): return line([a, b], c, 1.5)
def box(x0, y0, x1, y1, c): return f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="2" fill="none" stroke="{c}" stroke-width="4"/>'
def wheel(p, r, c): return ring(p, r, c, 3)
def handle(p, c, ang=90, l=6): return line([pol(p, ang, l), pol(p, ang+180, l)], c, 4)

# Komposition
SCALE = 0.8
GROUND = f'<path d="M12 141H228" stroke="{LINIE}" stroke-width="2" stroke-linecap="round"/>'
def place(body, cx): return f'<g transform="translate({cx:.1f} 141) scale({SCALE}) translate(-120 -141)">{body}</g>'
def chevron(y=100): return f'<path d="M117 {y-6}l6 6-6 6" stroke="{STEIN}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
def two(start, end, ground=True, ychev=100, top=""):
    return (GROUND if ground else "") + top + place(start(HELL, HELL), 62) + chevron(ychev) + place(end(EISEN, STEIN), 178)
def one(pose, ground=True, top=""):
    return (GROUND if ground else "") + top + place(pose(EISEN, STEIN), 120)
def svg(body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>')
