from kit import *
import math
S = {}
STAND = dict(hip=(120,86), torso=90, ankle=(121,136))

def squat(load):
    def pose(hip, tor, c, e):
        sh = pol(hip, tor, TO)
        if load == "back":
            p = pol(sh, tor+120, 7); h = (p[0]+2, p[1]+2); eh = pol(sh, tor+200, 20); tool = plate(p, e, 10)
        elif load == "front":
            p = pol(sh, tor-80, 8); h = p; eh = pol(sh, tor-40, 22); tool = plate(p, e, 10)
        else:
            p = pol(sh, tor-60, 13); h = p; eh = pol(sh, tor-150, 16); tool = kb((p[0], p[1]-6), e)
        s,_ = fig(c, hip, tor, hand=h, eh=eh, ankle=(124,136), kh=(140,110))
        return (tool + s) if load == "back" else (s + tool)
    lo = {"back": ((99,110), 50), "front": ((102,112), 66), "goblet": ((102,112), 64)}[load]
    return two(lambda c, e: pose((122,86), 90, c, e), lambda c, e: pose(lo[0], lo[1], c, e))
S["Kniebeuge"] = lambda: squat("back")
S["Frontkniebeuge"] = lambda: squat("front")
S["Goblet Squat"] = lambda: squat("goblet")

def lunge():
    st = lambda c, e: fig(c, hand=(121,90), eh=(121,70), **STAND)[0]
    en = lambda c, e: fig(c, (116,104), 90, hand=(117,108), eh=(118,88), ankle=(144,136), kh=(146,104),
                          ankle2=(84,128), kh2=(104,134), foot2=(80,138))[0]
    return two(st, en)
S["Ausfallschritt"] = lunge

def bulgarian():
    bx = lambda e: box(54,112,90,140,e)
    st = lambda c, e: bx(e) + fig(c, (122,84), 90, hand=(123,88), eh=(123,68), ankle=(130,136), kh=(140,110),
                                  ankle2=(84,108), kh2=(104,112), foot2=(77,111))[0]
    en = lambda c, e: bx(e) + fig(c, (118,100), 88, hand=(120,104), eh=(121,84), ankle=(144,136), kh=(148,104),
                                  ankle2=(84,108), kh2=(104,126), foot2=(77,111))[0]
    return two(st, en)
S["Bulgarian Split Squat"] = bulgarian

def stepup():
    bx = lambda e: box(124,108,170,140,e)
    st = lambda c, e: bx(e) + fig(c, (108,86), 92, hand=(108,90), eh=(108,70), ankle=(140,104), kh=(140,82), ankle2=(106,136), kh2=(112,112))[0]
    en = lambda c, e: bx(e) + fig(c, (146,56), 90, hand=(147,60), eh=(147,40), ankle=(148,104), kh=(156,80), ankle2=(132,92), kh2=(150,76), foot2=False)[0]
    return two(st, en)
S["Step-up"] = stepup

def ext_frame(e): return pad((104,110),(102,62), e, 5) + line([(100,110),(140,110)], e, 5) + line([(114,110),(114,140)], e, 4)
def leg_ext(a, ft, c, e, roller):
    s,_ = fig(c, (114,104), 94, hand=(118,112), eh=(108,96), ankle=a, kh=(140,100), foot=ft)
    return ext_frame(e) + s + dot(roller, 5, e)
S["Beinstrecker"] = lambda: two(lambda c, e: leg_ext((140,129),(147,132), c, e, (147,124)),
                                lambda c, e: leg_ext((163,101),(165,92), c, e, (164,108)))
S["Isometrischer Beinstrecker"] = lambda: one(lambda c, e: leg_ext((156,122),(162,116), c, e, (160,128)))

def leg_curl():
    def p(a, kh, ft, rol):
        def f(c, e):
            s,_ = fig(c, (104,100), 0, hand=(152,114), eh=(148,96), ankle=a, kh=kh, foot=ft)
            return bench(46,152,108,e) + s + dot(rol, 5, e)
        return f
    return two(p((55,102),(80,98),(54,110),(56,94)), p((80,76),(78,100),(72,72),(74,82)))
S["Beinbeuger"] = leg_curl

def legpress():
    u = (math.cos(math.radians(130)), -math.sin(math.radians(130)))
    def p(a, kh):
        def f(c, e):
            sled = line([(a[0]+3-14*u[0], a[1]-2-14*u[1]), (a[0]+3+14*u[0], a[1]-2+14*u[1])], e, 5)
            frame = pad((62,80),(98,118), e, 5) + line([(96,118),(120,118)], e, 5) + line([(108,118),(108,140)], e, 4)
            s,_ = fig(c, (100,110), 140, hand=(110,118), eh=(96,104), ankle=a, kh=kh, foot=(a[0]+9*u[0], a[1]+9*u[1]))
            return frame + sled + s
        return f
    return two(p((126,88),(110,76)), p((138,78),(124,90)))
S["Beinpresse"] = legpress

def hack():
    d = (math.cos(math.radians(105)), -math.sin(math.radians(105))); n = (-d[1]*-1, d[0]*-1)
    h0 = (112,86); k = 22; h1 = (h0[0]-d[0]*k, h0[1]-d[1]*k)
    def frame(e):
        b = (h1[0]-8*d[1]*-1 - 10*0, h1[1]); 
        a1 = (h1[0]-7 - d[0]*-14, h1[1]+2 - d[1]*-14); a2 = (h0[0]-7 + d[0]*44, h0[1]+2 + d[1]*44)
        return pad(a1, a2, e, 6) + line([(a1[0], a1[1]), (a1[0]-4, 140)], e, 4) + line([(126,140),(160,128)], e, 4)
    def p(hip):
        def f(c, e):
            sh = pol(hip, 105, TO)
            s,_ = fig(c, hip, 105, hand=(sh[0]+5, sh[1]+1), eh=(sh[0]+4, sh[1]+20), ankle=(142,130), kh=(150,104))
            return frame(e) + s
        return f
    return two(p(h0), p(h1))
S["Hackenschmidt-Kniebeuge"] = hack

def rdl():
    st = lambda c, e: fig(c, hand=(124,90), eh=(123,70), **STAND)[0] + plate((124,94), e)
    def en(c, e):
        hip=(104,86); sh=pol(hip,22,TO); h=(sh[0]+0.5, sh[1]+39.5)
        return plate((h[0], h[1]+3), e) + fig(c, hip, 22, hand=h, eh=(sh[0]+2, sh[1]+20), ankle=(122,136), kh=(134,108))[0]
    return two(st, en)
S["Rumänisches Kreuzheben"] = rdl

def nordic():
    K=(110,135); A=(85,135)
    anchor = lambda e: dot((86,128), 5, e)
    st = lambda c, e: anchor(e) + fig(c, (110,109), 90, hand=(126,96), eh=(116,82), ankle=A, kh=K, foot=(78,138))[0]
    def en(c, e):
        hip = pol(K, 48, TH)
        return anchor(e) + fig(c, hip, 48, hand=(164,126), eh=(162,104), ankle=A, kh=K, foot=(78,138))[0]
    return two(st, en)
S["Nordic Hamstring Curl"] = nordic

def calf(pos):
    def f(c, e):
        if pos == "down": a, hip = (122,130), (121,80)
        elif pos == "up": a, hip = (124,118), (122,68)
        return box(128,126,160,140,e) + fig(c, hip, 90, hand=(hip[0]+1, hip[1]+4), eh=(hip[0]+1, hip[1]-16), ankle=a, kh=(hip[0]+20, hip[1]+20), foot=(131,124))[0]
    return f
S["Wadenheben"] = lambda: two(calf("down"), calf("up"))
S["Isometrisches Wadenheben"] = lambda: one(calf("up"))
S["Exzentrisches Wadenheben"] = lambda: two(calf("up"), calf("down"))

def calf_seat():
    def p(a):
        def f(c, e):
            frame = line([(86,110),(114,110)], e, 5) + line([(100,110),(100,140)], e, 4) + box(126,128,150,140,e) + pad((116,96),(138,96), e, 6)
            s,_ = fig(c, (100,104), 90, hand=(124,100), eh=(112,96), ankle=a, kh=(128,104), foot=(134,126))
            return frame + s
        return f
    return two(p((126,131)), p((128,121)))
S["Wadenheben sitzend"] = calf_seat

def adduct(open_first):
    def seat(e): return line([(96,92),(144,92)], e, 5) + line([(120,92),(120,140)], e, 4)
    OPEN = dict(ankles=((90,126),(150,126)), khs=((86,104),(154,104)))
    SHUT = dict(ankles=((112,132),(128,132)), khs=((104,110),(136,110)))
    def p(L):
        def f(c, e):
            k = L["khs"]
            pads = line([(k[0][0]-6, k[0][1]-8),(k[0][0]-6, k[0][1]+8)], e, 5) + line([(k[1][0]+6, k[1][1]-8),(k[1][0]+6, k[1][1]+8)], e, 5)
            return seat(e) + front(c, neck=(120,54), pelvis=(120,88), hands=((100,98),(140,98)), ehs=((96,78),(144,78)), **L) + pads
        return f
    return two(p(OPEN), p(SHUT)) if open_first else two(p(SHUT), p(OPEN))
S["Adduktorenmaschine"] = lambda: adduct(True)
S["Abduktorenmaschine"] = lambda: adduct(False)

def boxjump():
    bx = lambda e: box(140,104,186,140,e)
    st = lambda c, e: bx(e) + fig(c, (98,106), 55, hand=(96,98), eh=(108,96), ankle=(118,136), kh=(132,110))[0]
    en = lambda c, e: bx(e) + fig(c, (150,80), 62, hand=(186,70), eh=(172,74), ankle=(164,100), kh=(174,82))[0]
    return two(st, en)
S["Box Jump"] = boxjump

def wallsit(c, e):
    return line([(88,20),(88,140)], e, 4) + fig(c, (96,108), 90, hand=(118,104), eh=(104,100), ankle=(122,136), kh=(124,108))[0]
S["Wandsitzen"] = lambda: one(wallsit)

def spanish(c, e):
    s,_ = fig(c, (100,104), 78, hand=(146,80), eh=(126,78), ankle=(124,136), kh=(126,104))
    return post(172, 92, e) + cable((126,106),(172,104), e) + s
S["Spanish Squat"] = lambda: one(spanish)

def tibialis():
    def p(ft):
        def f(c, e):
            return line([(86,20),(86,140)], e, 4) + fig(c, (98,92), shoulder=(92,56), hand=(100,94), eh=(92,76), ankle=(128,136), kh=(116,110), foot=ft)[0]
        return f
    return two(p((137,137)), p((134,128)))
S["Tibialis-Heben"] = tibialis

# ---------- Gesäß ----------
def hipthrust():
    bx = lambda e: box(54,110,90,140,e)
    def p(hip, kh):
        def f(c, e):
            pl = (hip[0], hip[1]-10)
            return bx(e) + fig(c, hip, shoulder=(90,106), hand=(pl[0]-2, pl[1]), eh=(102,96), ankle=(148,136), kh=kh)[0] + plate(pl, e, 10)
        return f
    return two(p((118,128),(140,108)), p((124,102),(148,102)))
S["Hip Thrust"] = hipthrust

def bridge():
    def p(hip):
        def f(c, e): return fig(c, hip, shoulder=(88,134), hand=(112,138), eh=(100,140), ankle=(150,136), kh=(146,108))[0]
        return f
    return two(p((124,132)), p((120,112)))
S["Glute Bridge"] = bridge

def glute_kick():
    def p(a, kh):
        def f(c, e):
            return post(64, 112, e, (66,132)) + cable((66,132), a, e) + fig(c, (118,86), 84, hand=(126,88), eh=(130,72),
                       ankle=a, kh=kh, foot=False, ankle2=(121,136), kh2=(126,110))[0]
        return f
    return two(p((112,132),(122,110)), p((76,112),(96,100)))
S["Kickback am Kabel"] = glute_kick
