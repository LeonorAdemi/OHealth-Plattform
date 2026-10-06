# Übungs-Icons und Übungsskizzen

Figurensprache, Icons je Muskelgruppe, Skizzen je Übung, neue Übung anlegen. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: `tools/exercise-art/`, `public/exercises/`, `src/modules/workouts/exercise-images.ts`, `muscle-group-icon.tsx`.

Icons und Skizzen helfen, eine Übung schneller zu erkennen und richtig auszuführen. Sie sind die einzige Bildsprache der App.

## Figurensprache

Icons und Skizzen teilen eine Sprache, damit sie zusammen wie aus einer Hand wirken:

- Kopf als gefüllter Punkt, Glieder als Linien mit runden Enden.
- Keine Gesichter, keine Muskeln, keine Schatten, keine Verläufe.
- Feste Proportionen für alle Figuren (Rumpf 36, Oberarm 21, Unterarm 19, Oberschenkel 26, Unterschenkel 25). Sie stehen in `tools/exercise-art/kit.py` und werden nicht pro Übung verändert.

## Icons je Muskelgruppe

- Neun Icons, eins je Muskelgruppe, 20 px, Strich 1,5, `currentColor`, also wie alle Icons nach Abschnitt 9.
- Sie stehen nur an Bedienelementen: am Einstieg über die Muskelgruppen und in den Treffern der Übungssuche. Neben Überschriften stehen sie nicht.
- Eingebunden nur über `MuscleGroupIcon` in `src/modules/workouts/components/muscle-group-icon.tsx`.

## Skizzen je Übung

- Eine SVG-Datei je Katalogübung in `public/exercises/`, Format 3 : 2 (240 × 160).
- Seitenansicht, Blick nach rechts. Ausnahmen in Vorderansicht nur, wo die Bewegung seitlich verläuft (Seitheben, Butterfly, Kabelzug-Fliegende, Adduktoren und Abduktoren).
- Bewegte Übungen zeigen zwei Lagen nebeneinander: links hell die Ausgangslage, rechts in Eisen die Endlage, dazwischen ein Winkel in Stein. Haltende Übungen (Plank, Wandsitzen) und Ausdauer zeigen eine Lage.
- Farben nur aus den Tokens: Figur Eisen, Geräte Stein, Ausgangslage und ferne Gliedmaßen `#B4BCB7` (Token `input`), Boden in Linie.
- Moos kommt in Icons und Skizzen nie vor. Es bleibt „du" und „Fortschritt" vorbehalten.
- Beim Loggen steht die Skizze hinter „Ausführung zeigen" unter dem Namen der Übung. Sie wird erst geladen, wenn jemand sie aufklappt.
- Eingebunden nur über `ExerciseSketch` und `exerciseImage(name)` aus `src/modules/workouts/exercise-images.ts`. Ein Test stellt sicher, dass jede Übung aus dem Katalog eine Skizze hat.
- Die Farben stehen als feste Werte in den SVG-Dateien. Ändern sich die Tokens, werden die Skizzen mit dem Generator neu erzeugt.
- Eigene Übungen haben keine Skizze. Dann entfällt die Fläche ganz, es gibt keinen Platzhalter.

## Neue Übung

Pose in `tools/exercise-art/` ergänzen, `python3 tools/exercise-art/build.py` ausführen, Slug in `src/modules/workouts/exercise-images.ts` eintragen, Ergebnis im Browser bei 320 px prüfen.
