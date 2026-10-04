from kit import *
S = {}
def flat_bench(e): return bench(66, 150, 107, e)
LIE = dict(hip=(132,99), torso=180, ankle=(156,137))

# ---------- Brust ----------
def bankdruecken(tool=plate, lo=((104,82),(106,106)), hi=((98,62),(102,80))):
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hand=h, eh=eh, **LIE); return flat_bench(e) + s + tool(h, e)
        return f
    return two(p(*lo), p(*hi))
S["Bankdrücken"] = lambda: bankdruecken()
S["Enges Bankdrücken"] = lambda: bankdruecken(lo=((106,84),(110,104)))
S["Kurzhantel-Bankdrücken"] = lambda: bankdruecken(db, lo=((102,90),(108,108)))
S["Fliegende"] = lambda: bankdruecken(db, lo=((100,112),(112,106)), hi=((98,62),(104,80)))

def incline(tool):
    hip=(130,104); sh=pol(hip,140,TO)
    def frame(e):
        return pad((138,112),(96,77), e, 5) + line([(126,112),(152,112)], e, 5) + line([(140,112),(140,140)], e, 4) + line([(108,88),(108,140)], e, 4)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hip, 140, hand=h, eh=eh, ankle=(162,137)); return frame(e) + s + tool(h, e)
        return f
    return two(p((110,72),(112,94)), p((104,42),(108,60)))
S["Schrägbankdrücken"] = lambda: incline(plate)
S["Kurzhantel-Schrägbankdrücken"] = lambda: incline(db)

def negativ():
    hip=(128,94)
    def frame(e):
        return pad((136,101),(72,118), e, 5) + line([(84,115),(84,140)], e, 4) + line([(128,103),(128,140)], e, 4) + dot((158,112), 4, e)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hip, 195, hand=h, eh=eh, ankle=(152,112), kh=(146,84), foot=False); return frame(e) + s + plate(h, e)
        return f
    return two(p((100,90),(104,112)), p((95,66),(98,86)))
S["Negativbankdrücken"] = negativ

def brustpresse():
    hip=(112,104)
    def frame(e): return pad((103,110),(101,60), e, 5) + line([(98,110),(128,110)], e, 5) + line([(112,110),(112,140)], e, 4)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hip, 92, hand=h, eh=eh, ankle=(140,136), kh=(138,100)); return frame(e) + s + handle(h, e)
        return f
    return two(p((128,70),(104,78)), p((150,69),(130,70)))
S["Brustpresse"] = brustpresse

def butterfly():
    LEG = dict(ankles=((108,136),(132,136)), khs=((102,112),(138,112)))
    def seat(e): return line([(98,96),(142,96)], e, 5) + line([(120,96),(120,140)], e, 4)
    st = lambda c, e: seat(e) + front(c, hands=((84,36),(156,36)), ehs=((86,58),(154,58)), **LEG)
    en = lambda c, e: seat(e) + front(c, hands=((115,60),(125,60)), ehs=((100,66),(140,66)), **LEG)
    return two(st, en)
S["Butterfly"] = butterfly

def kabelfly():
    LEG = dict(ankles=((110,136),(130,136)), khs=((104,114),(136,114)))
    def posts(e): return post(66, 24, e, (68,30)) + post(174, 24, e, (172,30))
    def p(hl, hr, el, er):
        def f(c, e): return posts(e) + cable((68,30), hl, e) + cable((172,30), hr, e) + front(c, hands=(hl,hr), ehs=(el,er), **LEG)
        return f
    return two(p((86,44),(154,44),(84,62),(156,62)), p((114,96),(126,96),(100,80),(140,80)))
S["Kabelzug-Fliegende"] = kabelfly

def liegestuetz():
    def p(sh, hip, h, eh):
        def f(c, e):
            s,_ = fig(c, hip, shoulder=sh, hand=h, eh=eh, ankle=(68,133), kh=(92,124), foot=(66,140)); return s
        return f
    return two(p((150,100),(115.3,114),(151,138),(154,120)), p((154,122),(118.4,126.6),(156,136),(140,112)))
S["Liegestütz"] = liegestuetz

def dips():
    def bars(e): return line([(92,78),(152,78)], e, 4) + line([(100,78),(100,140)], e, 3) + line([(144,78),(144,140)], e, 3)
    def p(hip, h, eh, a, kh):
        def f(c, e):
            s,_ = fig(c, hip, 95, hand=h, eh=eh, ankle=a, kh=kh, foot=False); return bars(e) + s
        return f
    return two(p((127,76),(126,78),(122,58),(104,110),(118,104)), p((127,98),(126,78),(104,62),(102,132),(116,126)))
S["Dips"] = dips

# ---------- Arme ----------
STAND = dict(hip=(120,86), torso=90, ankle=(121,136))
def curl(tool, extra=None):
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hand=h, eh=eh, **STAND); return (extra(e, h) if extra else "") + s + tool(h, e)
        return f
    return two(p((123,92),(121,72)), p((134,58),(121,74)))
S["Bizepscurl"] = lambda: curl(lambda h, e: plate(h, e, 10))
S["Kurzhantelcurl"] = lambda: curl(db)
S["Hammercurl"] = lambda: curl(dbv)
S["Kabelcurl"] = lambda: curl(lambda h, e: handle(h, e, 0), lambda e, h: post(166, 120, e, (164,134)) + cable((164,134), h, e))

def konzentration():
    hip=(108,105)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hip, 55, hand=h, eh=eh, ankle=(140,136), kh=(134,100)); return bench(82, 128, 112, e) + s + db(h, e)
        return f
    return two(p((134,115),(133,96)), p((145,81),(133,96)))
S["Konzentrationscurl"] = konzentration

def scott():
    hip=(112,104)
    def frame(e): return pad((120,78),(140,100), e, 6) + line([(130,90),(130,140)], e, 4) + line([(98,110),(122,110)], e, 5) + line([(110,110),(110,140)], e, 4)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hip, 88, hand=h, eh=eh, ankle=(136,136), kh=(138,100)); return frame(e) + s + plate(h, e, 9)
        return f
    return two(p((143,96),(128,82)), p((131,63),(128,83)))
S["Scottcurl"] = scott

def trizeps_kabel():
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hand=h, eh=eh, **STAND); return post(160, 24, e, (158,30)) + cable((158,30), h, e) + s + handle(h, e, 0)
        return f
    return two(p((136,60),(122,73)), p((127,92),(123,72)))
S["Trizepsdrücken am Kabel"] = trizeps_kabel

def trizeps_kopf():
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hand=h, eh=eh, **STAND); return s + db(h, e)
        return f
    return two(p((108,40),(125,31)), p((124,13),(122,32)))
S["Trizepsdrücken über Kopf"] = trizeps_kopf

def stirn():
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hand=h, eh=eh, **LIE); return flat_bench(e) + s + plate(h, e, 10)
        return f
    return two(p((83,86),(100,78)), p((99,60),(98,80)))
S["Stirndrücken"] = stirn

def kickback():
    hip=(106,92)
    def p(h, eh):
        def f(c, e):
            s,_ = fig(c, hip, 20, hand=h, eh=eh, ankle=(118,136), kh=(130,112)); return s + db(h, e)
        return f
    return two(p((121,103),(120,84)), p((101,88),(120,84)))
S["Trizeps-Kickback"] = kickback

def unterarm():
    hip=(108,105)
    def p(h):
        def f(c, e):
            s,_ = fig(c, hip, 60, hand=h, eh=(122,94), ankle=(138,136), kh=(134,100)); return bench(82, 126, 112, e) + s + plate(h, e, 8)
        return f
    return two(p((141,102)), p((141,90)))
S["Unterarmcurl"] = unterarm
