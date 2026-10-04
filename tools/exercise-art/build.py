"""Erzeugt public/exercises/*.svg neu. Aufruf aus dem Repo-Wurzelverzeichnis:
    python3 tools/exercise-art/build.py
Neue Übung: Pose in ex1.py bis ex4.py ergänzen (Seitenansicht, Blick nach rechts),
Slug in src/modules/workouts/exercise-images.ts eintragen, Skript laufen lassen."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from all import S
from kit import svg
def slug(n):
    s = n.lower()
    for a, b in (("ä","ae"),("ö","oe"),("ü","ue"),("ß","ss")): s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")
out = os.path.join(os.getcwd(), "public", "exercises"); os.makedirs(out, exist_ok=True)
for n, f in S.items():
    open(os.path.join(out, slug(n) + ".svg"), "w").write(svg(f(), n))
print(f"{len(S)} Skizzen geschrieben nach {out}")
