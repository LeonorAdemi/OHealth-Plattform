from kit import *
S = {}
STAND = dict(hip=(120,86), torso=90, ankle=(121,136))
BY = (14-141)/SCALE + 141
TOPBAR = line([(12,14),(228,14)], STEIN, 4)

# ---------- Rumpf ----------
S["Plank"] = lambda: one(lambda c, e: fig(c, (128,120), 13, hand=(182,137), eh=(163,137), ankle=(78,131), kh=(103,125.5), foot=(77,140))[0])

def onaline(a, sh, frac=51/87): return (a[0]+(sh[0]-a[0])*frac, a[1]+(sh[1]-a[1])*frac)
def seitstuetz(c, e):
    a=(76,133); sh=(160,115); hip=onaline(a, sh)
    return fig(c, hip, shoulder=sh, hand=(162,78), eh=(162,96), hand2=(179,137), eh2=(160,136), ankle=a, kh=onaline(a, hip, .5), foot=(74,140))[0]
S["Seitstütz"] = lambda: one(seitstuetz)

def copenhagen(c, e):
    a=(84,104); sh=(160,116); hip=onaline(a, sh, .58)
    return box(52,108,94,140,e) + fig(c, hip, shoulder=sh, hand=(179,137), eh=(160,136), ankle=a, kh=onaline(a, hip, .5), foot=(78,100),
                                       ankle2=(104,136), kh2=(112,118))[0]
S["Copenhagen Plank"] = lambda: one(copenhagen)

S["Hollow Hold"] = lambda: one(lambda c, e: fig(c, (120,131), 166, hand=(48,112), eh=(66,116), ankle=(168,116), kh=(144,124), foot=(176,113))[0])

def rollout():
    K=(96,136); A=(72,136)
    def st(c, e):
        hip=pol(K,95,TH); return fig(c, hip, 32, hand=(130,128), eh=(132,108), ankle=A, kh=K, foot=(66,138))[0] + wheel((130,130), 7, e)
    def en(c, e):
        hip=pol(K,22,TH); sh=pol(hip,10,TO); return fig(c, hip, 10, hand=(186,130), eh=(170,124), ankle=A, kh=K, foot=(66,138))[0] + wheel((186,131), 7, e)
    return two(st, en)
S["Bauchroller"] = rollout

def hanging_raise():
    st = lambda c, e: fig(c, (119, BY+80), 91, hand=(124, BY), eh=(126, BY+20), ankle=(118, BY+130), kh=(126, BY+105), foot=(124, BY+134))[0]
    en = lambda c, e: fig(c, (119, BY+80), 93, hand=(124, BY), eh=(126, BY+20), ankle=(169, BY+80), kh=(144, BY+70), foot=(173, BY+72))[0]
    return two(st, en, ground=False, ychev=70, top=TOPBAR)
S["Beinheben hängend"] = hanging_raise

def lying_raise():
    def p(a, kh, ft):
        def f(c, e): return fig(c, (110,134), 180, hand=(112,138), eh=(93,138), ankle=a, kh=kh, foot=ft)[0]
        return f
    return two(p((160,126),(136,128),(168,124)), p((112,84),(116,108),(120,82)))
S["Beinheben liegend"] = lying_raise

def crunchlike(end_torso, arms_forward=False):
    def p(tor, up):
        def f(c, e):
            sh = pol((110,134), tor, TO); hd = pol(sh, tor, NECK+HEAD)
            if arms_forward and up: h, eh = (sh[0]+38, sh[1]+6), (sh[0]+20, sh[1]+4)
            else: h, eh = (hd[0]+2, hd[1]-6 if up else hd[1]), pol(sh, tor-60 if up else tor+40, 14)
            return fig(c, (110,134), tor, hand=h, eh=eh, ankle=(146,136), kh=(132,106))[0]
        return f
    return two(p(180, False), p(end_torso, True))
S["Crunch"] = lambda: crunchlike(150)
S["Sit-up"] = lambda: crunchlike(72, True)

def cable_crunch():
    K=(110,136); A=(86,136)
    def p(tor):
        def f(c, e):
            hip = (110,110) if tor == 90 else (106,112); sh = pol(hip, tor, TO); hd = pol(sh, tor, NECK+HEAD)
            h = (hd[0]+6, hd[1]+2)
            return post(168, 16, e, (166,24)) + cable((166,24), h, e) + fig(c, hip, tor, hand=h, eh=(sh[0]+12, sh[1]+14), ankle=A, kh=K, foot=(80,138))[0] + handle(h, e, 90, 5)
        return f
    return two(p(90), p(28))
S["Crunch am Kabel"] = cable_crunch

def mountain(c, e):
    return fig(c, (115.3,114), shoulder=(150,100), hand=(151,138), eh=(154,120), ankle=(130,124), kh=(140,104), foot=(136,131),
               ankle2=(68,133), kh2=(92,124), foot2=(66,140))[0]
S["Mountain Climber"] = lambda: one(mountain)

def pallof():
    def p(h, eh):
        def f(c, e): return post(64, 50, e, (66,62)) + cable((66,62), h, e) + fig(c, hand=h, eh=eh, **STAND)[0] + handle(h, e, 90, 5)
        return f
    return two(p((132,64),(118,72)), p((159,62),(140,60)))
S["Pallof Press"] = pallof

S["Russian Twist"] = lambda: one(lambda c, e: fig(c, (112,132), 122, hand=(124,108), eh=(108,116), ankle=(152,114), kh=(138,100), foot=(160,112))[0] + plate((126,106), e, 9))

# ---------- Ganzkörper ----------
def plankhigh(c, e): return fig(c, (115.3,114), shoulder=(150,100), hand=(151,138), eh=(154,120), ankle=(68,133), kh=(92,124), foot=(66,140))[0]
def jump_up(c, e): return fig(c, (120,74), 90, hand=(126,0), eh=(124,20), ankle=(121,124), kh=(130,100), foot=(126,131))[0]
S["Burpee"] = lambda: two(plankhigh, jump_up)

def swing():
    st = lambda c, e: fig(c, (102,90), 32, hand=(122,112), eh=(128,92), ankle=(122,136), kh=(134,112))[0] + kb((122,112), e)
    en = lambda c, e: fig(c, hand=(159,52), eh=(140,51), **STAND)[0] + kb((161,52), e)
    return two(st, en)
S["Kettlebell Swing"] = swing

def dl_start(c, e):
    hip, tor = (100,100), 25; sh = pol(hip, tor, TO); h = (sh[0]+0.5, sh[1]+39.5)
    return plate((h[0],127), e) + fig(c, hip, tor, hand=h, eh=(sh[0]+4, sh[1]+20), ankle=(124,136), kh=(136,112))[0]
def overhead(tool):
    return lambda c, e: fig(c, hand=(122,11), eh=(122,30), **STAND)[0] + tool((122,11), e)
def front_rack(c, e):
    sh = pol((120,86), 90, TO); p = (sh[0]+8, sh[1]+1)
    return fig(c, hand=p, eh=(sh[0]+16, sh[1]+12), **STAND)[0] + plate(p, e, 10)
def front_squat_low(c, e):
    hip, tor = (102,112), 66; sh = pol(hip, tor, TO); p = pol(sh, tor-80, 8)
    return fig(c, hip, tor, hand=p, eh=pol(sh, tor-40, 22), ankle=(124,136), kh=(140,110))[0] + plate(p, e, 10)
S["Reißen"] = lambda: two(dl_start, overhead(plate))
S["Umsetzen"] = lambda: two(dl_start, front_rack)
S["Thruster"] = lambda: two(front_squat_low, overhead(plate))
def jerk(c, e):
    return fig(c, (116,96), 90, hand=(119,22), eh=(118,40), ankle=(146,136), kh=(150,110), ankle2=(84,132), kh2=(100,118), foot2=(80,140))[0] + plate((119,22), e)
S["Umsetzen und Stoßen"] = lambda: two(front_rack, jerk)

def tgu():
    st = lambda c, e: fig(c, (110,134), 180, hand=(76,95), eh=(76,114), ankle=(146,136), kh=(132,106))[0] + kb((76,95), e)
    return two(st, overhead(kb))
S["Turkish Get-up"] = tgu

def walkpose(c, e, carry=False):
    s,_ = fig(c, (120,86), 88, hand=(122,90) if carry else (110,90), eh=(122,70) if carry else (116,70),
              ankle=(138,136), kh=(136,110), hand2=None if carry else (134,88), eh2=(124,72),
              ankle2=(102,134), kh2=(112,112), foot2=(110,140), far=HELL)
    return s + (db((122,94), e) if carry else "")
S["Farmers Walk"] = lambda: one(lambda c, e: walkpose(c, e, True))

# ---------- Ausdauer ----------
S["Gehen"] = lambda: one(walkpose)
S["Laufen"] = lambda: one(lambda c, e: fig(c, (118,92), 78, hand=(147,69), eh=(130,77), ankle=(134,126), kh=(143,104), foot=(143,128),
                                           hand2=(106,87), eh2=(111,70), ankle2=(89,131), kh2=(109,115), foot2=(97,139), far=HELL)[0])

def bike(fan=False):
    def f(c, e):
        frame = line([(104,84),(118,122),(150,80)], e, 3) + line([(118,122),(78,122)], e, 3) + line([(150,80),(162,122)], e, 3) + line([(98,82),(110,82)], e, 4) + line([(146,74),(156,72)], e, 4)
        wheels = wheel((78,122), 17, e) + (wheel((162,118), 21, e) + wheel((162,118), 5, e) if fan else wheel((162,122), 17, e))
        s,_ = fig(c, (104,78), 42, hand=(152,72), eh=(140,84), ankle=(126,128), kh=(130,100), foot=(134,130),
                  ankle2=(110,114), kh2=(126,90), foot2=(118,116), far=HELL)
        return wheels + frame + s
    return lambda: one(f)
S["Radfahren"] = bike()
S["Air Bike"] = bike(True)

def erg():
    rail = lambda e: line([(54,132),(184,132)], e, 3) + wheel((178,114), 11, e) + line([(156,118),(156,132)], e, 4)
    def st(c, e):
        h=(160,100); return rail(e) + cable((178,110), h, e) + fig(c, (112,122), 70, hand=h, eh=(144,96), ankle=(152,124), kh=(140,96), foot=(156,116))[0] + handle(h, e, 90, 5)
    def en(c, e):
        h=(98,102); return rail(e) + cable((178,110), h, e) + fig(c, (98,122), 108, hand=h, eh=(76,104), ankle=(148,122), kh=(124,116), foot=(156,116))[0] + handle(h, e, 90, 5)
    return two(st, en)
S["Rudern"] = erg

S["Schwimmen"] = lambda: one(lambda c, e: line([(30,104),(210,104)], LINIE, 2) + fig(c, (104,110), 2, hand=(178,106), eh=(160,104),
                                  hand2=(114,124), eh2=(128,126), ankle=(56,108), kh=(80,108), foot=(48,110), ankle2=(56,118), kh2=(80,116), foot2=(48,120), far=HELL)[0], ground=False)

def skierg():
    mach = lambda e: line([(168,6),(168,140)], e, 4) + line([(160,140),(184,140)], e, 4)
    st = lambda c, e: mach(e) + cable((166,8),(138,14), e) + fig(c, hand=(138,14), eh=(132,32), **STAND)[0] + handle((138,14), e, 90, 5)
    def en(c, e):
        hip=(106,92); sh=pol(hip,45,TO); h=(sh[0]+8, sh[1]+38)
        return mach(e) + cable((166,8), h, e) + fig(c, hip, 45, hand=h, eh=(sh[0]+6, sh[1]+20), ankle=(122,136), kh=(136,112))[0] + handle(h, e, 90, 5)
    return two(st, en)
S["Ski-Ergometer"] = skierg

def crosstrainer(c, e):
    mach = line([(70,132),(152,132)], e, 4) + line([(152,40),(138,128)], e, 3) + dot((152,124), 7, e)
    s,_ = fig(c, (116,80), 88, hand=(150,58), eh=(138,74), ankle=(132,124), kh=(140,100), foot=(141,126),
              ankle2=(98,116), kh2=(116,100), foot2=(107,118), far=HELL)
    return mach + s
S["Crosstrainer"] = lambda: one(crosstrainer)

def jumprope(c, e):
    rope = f'<path d="M134 92 C158 152, 84 152, 108 92" stroke="{e}" stroke-width="1.5" fill="none"/>'
    return rope + fig(c, (120,80), 90, hand=(134,92), eh=(124,64), hand2=(108,92), eh2=(116,64), ankle=(121,128), kh=(130,104), foot=(127,134), far=HELL)[0]
S["Seilspringen"] = lambda: one(jumprope)

def stairs(c, e):
    st = line([(78,140),(78,122),(102,122),(102,104),(126,104),(126,86),(150,86),(150,140)], e, 3)
    s,_ = fig(c, (110,70), 86, hand=(132,76), eh=(118,92), ankle=(124,100), kh=(130,76), ankle2=(100,118), kh2=(112,96), foot2=(109,120), far=HELL)
    return st + s
S["Treppensteiger"] = lambda: one(stairs)
