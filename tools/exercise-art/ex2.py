from kit import *
import math
S = {}
STAND = dict(hip=(120,86), torso=90, ankle=(121,136))
BY = (14-141)/SCALE + 141  # Stange oben im Pose-Rahmen
TOPBAR = line([(12,14),(228,14)], STEIN, 4)

# ---------- Rücken ----------
def deadlift(sumo=False, end_tool=plate):
    def st(c, e):
        hip, tor = ((104,104), 40) if sumo else ((100,100), 25)
        sh = pol(hip, tor, TO); h = (sh[0]+0.5, sh[1]+39.5)
        s,_ = fig(c, hip, tor, hand=h, eh=(sh[0]+4, sh[1]+20), ankle=(124,136), kh=(136,112)); return plate((h[0],127), e) + s
    def en(c, e):
        s,_ = fig(c, (121,86), 90, hand=(124,92), eh=(124,72), ankle=(122,136)); return plate((124,94), e) + s
    return two(st, en)
S["Kreuzheben"] = lambda: deadlift()
S["Sumo-Kreuzheben"] = lambda: deadlift(True)

def klimm():
    st = lambda c, e: fig(c, (119, BY+80), 91, hand=(129, BY), eh=(132, BY+20), ankle=(116, BY+128), kh=(128, BY+104))[0]
    en = lambda c, e: fig(c, (117, BY+46), 94, hand=(126, BY), eh=(131, BY+14), ankle=(110, BY+94), kh=(124, BY+72))[0]
    return two(st, en, ground=False, ychev=70, top=TOPBAR)
S["Klimmzug"] = klimm
S["Klimmzug im Untergriff"] = klimm

def latzug():
    def frame(e): return line([(98,110),(128,110)], e, 5) + line([(112,110),(112,140)], e, 4) + dot((138,92), 5, e) + line([(150,140),(150,4),(116,4)], e, 3)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, (112,104), 100, hand=h, eh=eh, ankle=(138,136), kh=(136,102))
            return frame(e) + cable((116,4), h, e) + s + handle(h, e, 0, 8)
        return f
    return two(p((116,30),(112,48)), p((118,64),(98,86)))
S["Latzug"] = latzug

def rudern_bent(tool, tbar=False):
    hip=(104,90)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hip, 30, hand=h, eh=eh, ankle=(122,136), kh=(134,112))
            return (line([(62,139), h], e, 4) if tbar else "") + s + tool(h, e)
        return f
    return two(p((136,110),(137,92)), p((124,94),(112,80)))
S["Langhantelrudern"] = lambda: rudern_bent(plate)
S["Kurzhantelrudern"] = lambda: rudern_bent(db)
S["T-Bar-Rudern"] = lambda: rudern_bent(lambda h, e: plate(h, e, 11), True)

def kabelrudern():
    def frame(e): return line([(94,124),(118,124)], e, 5) + line([(156,108),(156,138)], e, 5) + post(166, 112, e, (164,118))
    def p(tor, h, eh):
        def f(c, e):
            s,_ = fig(c, (106,118), tor, hand=h, eh=eh, ankle=(150,124), kh=(130,100), foot=False)
            return frame(e) + cable((164,118), h, e) + s + handle(h, e, 90, 5)
        return f
    return two(p(75,(153,94),(136,92)), p(95,(124,96),(98,100)))
S["Rudern am Kabelzug"] = kabelrudern

def rudermaschine():
    def frame(e): return line([(98,110),(124,110)], e, 5) + line([(110,110),(110,140)], e, 4) + pad((128,62),(128,96), e, 6) + line([(164,20),(164,140)], e, 3)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, (110,104), 90, hand=h, eh=eh, ankle=(140,136), kh=(138,100))
            return frame(e) + line([(164,24), h], e, 3) + s + handle(h, e, 90, 5)
        return f
    return two(p((150,72),(130,70)), p((132,76),(94,80)))
S["Rudermaschine"] = rudermaschine

def goodmorning():
    st = lambda c, e: plate((114,56), e, 10) + fig(c, hand=(116,60), eh=(110,74), **STAND)[0]
    def en(c, e):
        hip=(108,88); sh=pol(hip,15,TO)
        return plate((sh[0]-3, sh[1]-7), e, 10) + fig(c, hip, 15, hand=(sh[0]-2, sh[1]-4), eh=(sh[0]-6, sh[1]+14), ankle=(120,136), kh=(130,112))[0]
    return two(st, en)
S["Good Morning"] = goodmorning

def hyper():
    ang=40; d=(math.cos(math.radians(ang)), -math.sin(math.radians(ang))); n=(-d[1], d[0])
    ank=(80,118); hip=(ank[0]+50*d[0], ank[1]+50*d[1])
    def frame(e):
        a=(hip[0]-16*d[0]+9*n[0], hip[1]-16*d[1]+9*n[1]); b=(hip[0]+4*d[0]+9*n[0], hip[1]+4*d[1]+9*n[1])
        return pad(a, b, e, 6) + line([((a[0]+b[0])/2, (a[1]+b[1])/2), (110,140)], e, 4) + dot((ank[0]+2, ank[1]+10), 4.5, e) + line([(70,140),(ank[0]+2, ank[1]+10)], e, 3)
    def p(tor):
        def f(c, e):
            s,_ = fig(c, hip, tor, ankle=ank, foot=(ank[0]-2, ank[1]+9))
            return frame(e) + s
        return f
    return two(p(-60), p(ang))
S["Rückenstrecker"] = hyper

def shrug():
    st = lambda c, e: fig(c, hand=(121,90), eh=(121,70), **STAND)[0] + db((121,92), e)
    en = lambda c, e: fig(c, hand=(121,84), eh=(121,64), shrug=5, **STAND)[0] + db((121,86), e)
    return two(st, en)
S["Schulterheben"] = shrug

def pullover():
    LIE = dict(hip=(132,99), torso=180, ankle=(156,137))
    def p(h, eh):
        def f(c, e): return bench(66,150,107,e) + fig(c, hand=h, eh=eh, **LIE)[0] + db(h, e)
        return f
    return two(p((60,102),(78,96)), p((98,61),(98,80)))
S["Überzüge"] = pullover

# ---------- Schultern ----------
def press_stand():
    def p(h, eh):
        def f(c, e): return fig(c, hand=h, eh=eh, **STAND)[0] + plate(h, e)
        return f
    return two(p((131,50),(130,70)), p((122,11),(122,30)))
S["Schulterdrücken"] = press_stand

SEAT = dict(hip=(114,104), torso=90, ankle=(142,136), kh=(140,100))
def seat_frame(e): return pad((105,110),(105,58), e, 5) + line([(100,110),(130,110)], e, 5) + line([(114,110),(114,140)], e, 4)
def press_seat(tool, lo):
    def p(h, eh):
        def f(c, e): return seat_frame(e) + fig(c, hand=h, eh=eh, **SEAT)[0] + tool(h, e)
        return f
    return two(p(*lo), p((116,29),(116,48)))
S["Kurzhantel-Schulterdrücken"] = lambda: press_seat(db, ((123,62),(126,86)))
S["Schulterpresse"] = lambda: press_seat(lambda h, e: handle(h, e, 0, 7), ((123,62),(126,86)))
S["Arnold Press"] = lambda: press_seat(db, ((131,56),(132,80)))

FLEG = dict(ankles=((111,136),(129,136)), khs=((104,114),(136,114)))
def seitheben():
    def p(hl, hr, el, er):
        def f(c, e): return front(c, hands=(hl,hr), ehs=(el,er), **FLEG) + db(hl, e) + db(hr, e)
        return f
    return two(p((101,94),(139,94),(100,76),(140,76)), p((68,60),(172,60),(88,58),(152,58)))
S["Seitheben"] = seitheben

def frontheben():
    def p(h, eh):
        def f(c, e): return fig(c, hand=h, eh=eh, **STAND)[0] + db(h, e)
        return f
    return two(p((122,90),(122,70)), p((160,52),(140,50)))
S["Frontheben"] = frontheben

def reverse_fly():
    LEG = dict(ankles=((110,136),(130,136)), khs=((100,112),(140,112)))
    def p(hl, hr, el, er):
        def f(c, e): return front(c, neck=(120,72), pelvis=(120,86), head=(120,60), hands=(hl,hr), ehs=(el,er), **LEG) + db(hl, e) + db(hr, e)
        return f
    return two(p((108,112),(132,112),(104,94),(136,94)), p((70,78),(170,78),(88,76),(152,76)))
S["Vorgebeugtes Seitheben"] = reverse_fly

def upright_row():
    def p(h, eh):
        def f(c, e): return fig(c, hand=h, eh=eh, **STAND)[0] + plate(h, e, 11)
        return f
    return two(p((124,90),(123,70)), p((127,48),(116,30)))
S["Aufrechtes Rudern"] = upright_row

def facepull():
    def p(h, eh):
        def f(c, e): return post(166, 30, e, (164,44)) + cable((164,44), h, e) + fig(c, hand=h, eh=eh, **STAND)[0] + handle(h, e, 90, 5)
        return f
    return two(p((158,48),(140,50)), p((130,40),(108,40)))
S["Face Pull"] = facepull
