# OHealth Design

Verbindliche Gestaltungsgrundlage für alle Oberflächen der OHealth-Plattform (Web, PWA, später Desktop). Wer UI baut, ob Mensch oder KI-Assistent, hält sich an dieses Dokument. Abweichungen werden hier geändert, nicht im Code.

## 1. Leitidee: das Logbuch

OHealth sieht aus wie ein sorgfältig gesetztes Trainingslogbuch: weißes Blatt, klare Schrift, große Zahlen. Die App tritt zurück, die eigene Leistung steht vorn.

## 2. Warum Design unser Differenzierer ist

Fitness-Apps sind fast alle dunkel, laut und verspielt: Neonfarben, Abzeichen, Konfetti, Motivationssprüche. OHealth ist das Gegenteil und dadurch sofort wiedererkennbar.

| Üblich im Markt | OHealth |
| --- | --- |
| Dunkler Hintergrund, Neon-Akzente | Weißes Blatt, eine ruhige Akzentfarbe |
| Abzeichen, Flammen, Konfetti | Fortschritt zeigt sich in Zahl, Typografie und einem Ring, der sich füllt |
| Motivationssprüche | Nüchterne, genaue Sätze |
| Karten, Schatten, Verläufe | Weißraum und feine Linien |

Drei Versprechen an die Nutzer, an denen jede Entscheidung gemessen wird:

1. **In zwei Sekunden erfasst.** Jede Ansicht hat genau eine Hauptaussage, meist eine Zahl.
2. **Nichts schreit.** Keine Elemente, die um Aufmerksamkeit kämpfen. Auch Wettbewerb (Leaderboard, Streaks) bleibt ruhig.
3. **Genau statt geschönt.** Zahlen stehen exakt da, mit Einheit, ohne Rundung nach oben und ohne Ausrufezeichen.

Diese Ruhe trägt auch die späteren Ausbaustufen: Eine Physio- oder Gesundheitsanwendung braucht Vertrauen, und das entsteht durch dieselbe Zurückhaltung.

## 3. Prinzipien

1. **Weiß ist die Fläche.** Der Hintergrund ist reines Weiß. Gliederung entsteht durch Abstand, erst danach durch eine feine Linie, nie durch graue Flächen, Kästen oder Schatten.
2. **Zahlen sind die Hauptdarsteller.** Die wichtigste Zahl einer Ansicht ist groß und schmal gesetzt. Alles andere ordnet sich unter.
3. **Schwarz handelt, Farbe bedeutet.** Buttons und Bedienelemente sind in Eisen (fast schwarz). Farbe ist ausschließlich für Bedeutung reserviert: die Sportfarben für „was du gemacht hast“, Moos für „das bist du" und „das ist Fortschritt".
4. **Eine Schriftfamilie.** Ausdruck entsteht über Breite, Gewicht und Größe, nicht über weitere Schriften.
5. **Listen statt Karten.** Inhalte stehen als Zeilen untereinander. Karten nur dort, wo ein Element wirklich einzeln bewegt oder ausgewählt wird.
6. **Bewegung antwortet.** Animation gibt es nur als Reaktion auf eine Handlung.

## 4. Farben

Sechs Grundfarben und die Sportfarben, mehr gibt es nicht. Werte stehen als Tokens in `src/app/globals.css`; in Komponenten werden nie Hex-Werte geschrieben.

| Name | Hex | Token | Einsatz |
| --- | --- | --- | --- |
| Kreide | `#FFFFFF` | `background` | Hintergrund jeder Ansicht |
| Eisen | `#18201C` | `foreground`, `primary` | Text, Zahlen, Buttons |
| Stein | `#636B67` | `muted-foreground` | Beschriftungen, Einheiten, Nebentext |
| Linie | `#E1E6E3` | `border` | Trennlinien, Rahmen |
| Nebel | `#F3F6F4` | `muted`, `secondary` | Hover, gedrückter Zustand, leere Rasterpunkte |
| Moos | `#156B4A` | `brand` | Eigene Zeile, eigener Fortschritt, neuer Bestwert |

Dazu Signal `#BE2323` (`destructive`) nur für Fehler und Löschen, sowie Moos hell `#DFF7EA` (`brand-subtle`) als Markierung hinter einem neuen Bestwert und dem erreichten Wochenziel.

**Sportfarben.** Jede Gruppe des Sportarten-Katalogs hat eine Farbe (Token `sport-<gruppe>`). Sie zeigt, was jemand gemacht hat oder vorhat, und ist dadurch auf einen Blick lesbar: im Wochenring, in den Balken des Wochenstreifens, als Punkt vor Aktivitäten und Events.

| Gruppe | Hex | Token | Kontrast auf Weiß |
| --- | --- | --- | --- |
| Ausdauer | `#2563EB` | `sport-ausdauer` | 5,2:1 |
| Outdoor | `#0E7490` | `sport-outdoor` | 5,4:1 |
| Kraft und Fitness | `#EA580C` | `sport-kraft` | 3,6:1 |
| Klettern | `#7C3AED` | `sport-klettern` | 5,7:1 |
| Ballsport | `#B45309` | `sport-ballsport` | 5,0:1 |
| Körper und Geist | `#DB2777` | `sport-koerper` | 4,6:1 |
| Sonstiges | `#64748B` | `sport-sonstiges` | 4,8:1 |

Eine neue Gruppe im Katalog braucht eine neue Farbe hier und in `globals.css`; eine neue Sportart in einer bestehenden Gruppe nicht.

Regeln:

- Moos erscheint pro Ansicht an höchstens zwei Stellen. Wenn alles grün ist, bedeutet Grün nichts mehr. Ausnahme „Heute“: dazu die Heatmap der letzten Wochen, die nur den eigenen Fortschritt zeigt.
- Sportfarben nur als Fläche, Punkt oder Linie, nie als Textfarbe und nie für Buttons. Der Name der Sportart steht immer dabei, Farbe trägt Bedeutung nie allein.
- Moos ist nie die Farbe eines Buttons.
- Achtung bei shadcn/Origin UI: Das Token `accent` ist dort die Hover-Fläche (bei uns Nebel), nicht die Markenfarbe. Die Markenfarbe heißt `brand`.
- Kontraste auf Weiß: Eisen 16,6:1, Moos 6,5:1, Stein 5,5:1. Text in Linie oder Nebel ist verboten.
- Einzige Ausnahme von der Farbregel sind Fremdmarken: Die Logos von Apple, Google und Facebook in den Anmelde-Buttons behalten ihre Originalfarben, wie es die Richtlinien der Anbieter verlangen.
- Kein Dunkelmodus in Draft 1. Er wird später als eigener Token-Satz ergänzt, nicht durch Einzelanpassungen.

## 5. Typografie

Schrift: **Archivo** (variabel, SIL Open Font License). Die Schriftdatei liegt im Repo unter `src/app/fonts/` und wird über `next/font/local` eingebunden, es wird also nichts von Dritten geladen. Sie bringt eine Breitenachse und Tabellenziffern mit, damit kommen wir mit einer Familie aus.

| Rolle | Größe / Zeilenhöhe | Gewicht | Breite | Klasse | Einsatz |
| --- | --- | --- | --- | --- | --- |
| Großzahl | 72 / 72 | 600 | 75 % | `text-grosszahl num-display` | Die eine Hauptzahl einer Ansicht |
| Zahl | 44 / 48 | 600 | 75 % | `text-zahl num-display` | Bestwerte, Rang 1 |
| Titel | 28 / 34 | 600 | 100 % | `text-titel font-semibold` | Seitentitel |
| Abschnitt | 20 / 28 | 600 | 100 % | `text-xl font-semibold` | Abschnittsüberschriften |
| Text | 16 / 24 | 400 | 100 % | `text-base` | Fließtext, Listen, Eingaben |
| Klein | 14 / 20 | 400 | 100 % | `text-sm` | Beschriftungen, Einheiten |
| Mini | 12 / 16 | 500 | 100 % | `text-xs font-medium` | Wochentage im Raster, Tab-Leiste |

Regeln:

- Zahlen immer mit Tabellenziffern (`tabular-nums`), damit Spalten sauber untereinander stehen.
- Die Einheit steht in Klein und Stein direkt hinter der Zahl: `82,5` `kg`.
- Deutsche Schreibweise: Dezimalkomma, geschütztes Leerzeichen vor der Einheit.
- Keine Versalien für Beschriftungen, keine gesperrte Schrift, keine Kursive.
- Nur die Gewichte 400, 500 und 600.
- Hilfsklassen: `num` (Tabellenziffern) und `num-display` (schmal, 600) aus `globals.css`.

## 6. Signatur-Elemente

Diese zwei Elemente machen OHealth wiedererkennbar. Sie werden überall gleich gebaut.

**Die Großzahl.** Jede Hauptansicht beginnt mit einer einzigen großen, schmal gesetzten Zahl und einer Zeile darunter, die sagt, was sie bedeutet. Beispiel: `3`, darunter „Workouts diese Woche".

**Das Wochenraster.** Sieben Quadrate für Montag bis Sonntag, 10 px groß, 4 px Abstand, 2 px Eckenradius. Trainiert: Eisen gefüllt. Nicht trainiert: Nebel. Eigene Zeile: Moos statt Eisen. Es ersetzt Flammen und Streak-Abzeichen und zeigt Konstanz auf einen Blick, im Leaderboard für jede Person in derselben Form.

**Der Wochenring.** Oben auf „Heute“ steht statt des Wochenrasters ein Ring (176 px, Strich 16 px, runde Enden) mit der Großzahl der Trainingstage in der Mitte und „von 4“ darunter. Er hat so viele Segmente wie das Wochenziel (ohne Ziel sieben, mehr, wenn mehr trainiert wurde, höchstens sieben). Jeder Trainingstag füllt ein Segment in der Sportfarbe des Tages, in zeitlicher Reihenfolge; offene Segmente sind Nebel. Daneben die Sportgruppen der Woche mit Punkt und Zahl der Tage. Er zeigt den Fortschritt zum selbst gewählten Ziel, nie einen vorgefüllten oder geschönten Stand. Überall sonst bleibt das Wochenraster.

## 7. Logo

Das Logo besteht aus der Bildmarke (das O mit Kirchturm, Welle und Schilf) und dem Schriftzug „OHealth". Es steht in Logo-Grün `#284238` und wird nie umgefärbt, verzerrt oder mit Effekten versehen.

| Datei | Inhalt | Einsatz |
| --- | --- | --- |
| `public/logo.png` | Bildmarke mit Schriftzug | Anmeldung und Registrierung |
| `public/logo-mark.png` | Nur die Bildmarke | Seitenleiste am Desktop |
| `public/icons/`, `src/app/icon.png`, `apple-icon.png`, `favicon.ico` | Bildmarke auf Weiß | App-Icon, Homescreen, Browser-Tab |

- Eingebunden wird das Logo ausschließlich über die Komponente `Logo` in `src/components/logo.tsx`.
- Rund um das Logo bleibt mindestens die halbe Höhe der Bildmarke frei.
- In den Inhaltsansichten am Handy steht kein Logo. Dort gehört der Platz der Großzahl.
- Logo-Grün ist dem Logo vorbehalten. Für Bedeutung in der Oberfläche bleibt Moos zuständig, weil es sich deutlicher von der Textfarbe Eisen abhebt.
- Die Dateien stammen aus einer Pixelgrafik. Sobald eine Vektordatei (SVG) vorliegt, ersetzt sie die PNG-Dateien.

## 8. Layout

Alles ist linksbündig. Zentriert wird nichts außer leeren Zuständen.

Raster: 4 px. Erlaubte Abstände: 4, 8, 12, 16, 24, 32, 48, 64.

```
Handy (bis 767 px)            Desktop (ab 1024 px)
┌────────────────────┐        ┌──────────┬───────────────────────────┐
│             🔔  (A)│        │ OHealth  │                     🔔  (A)│
│ Titel              │        │          │ Titel                     │
│                    │        │ Heute    │                           │
│ 3                  │        │ Entdecken│ 3                         │
│ Trainingstage      │        │ Gruppen  │ Trainingstage diese Woche │
│ ■ ■ □ ■ □ □ □      │        │ Chats    │ ■ ■ □ ■ □ □ □             │
│                    │        │          │                           │
│ Zeile ──────────── │        │          │ Zeile ─────────── Zeile   │
│ Zeile ──────────── │        │          │ Zeile ─────────── Zeile   │
│                    │        │          │                           │
│ [Aktivität eintr.] │        │          │                           │
├────────────────────┤        └──────────┴───────────────────────────┘
│Heute Entd Grup Chat│         240 px      Inhalt max. 960 px
└────────────────────┘
```

- Handy: Seitenrand 20 px, Tab-Leiste unten mit höchstens vier Einträgen, Hauptaktion als Button in voller Breite über der Tab-Leiste.
- Desktop: Seitenleiste links 240 px, weiß, durch eine Linie getrennt. Inhalt höchstens 960 px breit, Textspalten höchstens 640 px. Zusätzliche Breite wird für eine zweite Spalte genutzt, nicht für größere Elemente.
- Oben rechts stehen auf jeder Ansicht, am Handy und am Desktop, die Glocke und das eigene Profilbild (A). Das Profilbild führt zum Profil; dort liegen der Verlauf und die Einstellungen. Ein eigener Tab für den Verlauf entfällt. Die vier Tabs sind „Heute“ (eigener Plan, Aktivitäten und der Kraft-Modus mit Vorlagen und Training), „Entdecken“ (Trainings der nächsten 14 Tage und öffentliche Communities der eigenen Stadt, Filter nach Sportart als `ChoiceChip`), „Gruppen“ (eigene Communities, Menschen finden, gründen und mit Code beitreten) und „Chats“. Vorlagen haben keinen eigenen Tab mehr; man erreicht sie über „Mit Vorlage trainieren“ und bei Sportarten mit Sätzen. Der Tab „Chats“ zeigt in einem Kreis in Eisen, in wie vielen Chats neue Nachrichten sind. Die Glocke zählt nur Zusagen, neue Trainings, Absagen und Erinnerungen, keine Chat-Nachrichten.
- Listenzeilen sind mindestens 56 px hoch, mit Linie darunter, ohne Rahmen und ohne Hintergrund.

## 9. Komponenten

Basis sind die Bausteine aus Origin UI in `src/components/ui/`. Sie werden über die Tokens gestaltet, nicht einzeln umgefärbt.

- **Ecken:** 8 px für Buttons, Eingaben und Overlays. Zeilen, Tabellen und Trennlinien haben keine Rundung. Vollrund nur Avatare.
- **Profilbild:** Rund, 32 px oben rechts, 96 px auf dem Profil. Ohne Bild stehen die Initialen in Stein auf Nebel. Eingebunden nur über `Avatar` aus `src/components/ui/avatar.tsx`. Es steht dort, wo es um die Person geht (Kopfzeile, Profil, später Chat), nicht als Schmuck in Ranglisten.
- **Auswahl-Chips** (zum Beispiel Sportarten): Umriss mit 8 px Rundung. Gewählt: Rahmen und Schrift in Eisen mit Häkchen, nicht gefüllt. Nicht gewählt: Rahmen in Linie, Schrift in Stein.
- **Schatten:** keine. Einzige Ausnahme sind Overlays (Dialog, Drawer, Menü) mit einem einzigen weichen Schatten.
- **Buttons:** Pro Ansicht genau ein gefüllter Button (Eisen auf Weiß). Alle weiteren sind Umriss oder reiner Text. Höhe 48 px am Handy, 40 px am Desktop. Beschriftung ist ein Verb und sagt genau, was passiert: „Aktivität speichern".
- **Eingaben:** Beschriftung steht immer über dem Feld. Zahlenfelder für Gewicht und Wiederholungen sind groß (Zahl-Stil), rechtsbündig und öffnen die Zifferntastatur.
- **Leaderboard:** Eine gesetzte Tabelle: Rang, Name, Wochenraster, Zahl. Die eigene Zeile hat Namen und Zahl in Moos, sonst keine Hervorhebung. Keine Medaillen, keine Podeste, keine Avatare als Schmuck.
- **Bestwert:** Ein neuer Bestwert wird einmalig mit Moos hell hinterlegt und mit dem Wort „Bestwert" in Klein gekennzeichnet.
- **Icons:** Nur in Navigation und an Bedienelementen, nie als Schmuck neben Überschriften. Strichstärke 1,5, Größe 20 px, Farbe wie der zugehörige Text. Die Icons der Muskelgruppen folgen derselben Regel (Abschnitt 15).
- **Diagramme:** Dünne Linie in Eisen, eigener Wert in Moos, keine Flächenfüllung, keine Gitterlinien außer einer Grundlinie. Die Heatmap auf „Heute“ zeigt Minuten je Tag in fünf Stufen von Nebel bis Moos, mit Legende „weniger … mehr“.
- **Leere Zustände:** Ein Satz, der sagt, was hier erscheinen wird, und ein Button. Keine Illustrationen.
- **Bereiche:** Die Ansichten einzelner Funktionen („Heute“, Profil und Folgen, Aktivität eintragen, Events, Chats, Melden) sind in den Dateien unter `docs/bereiche/` beschrieben, Index in `docs/ENGINEERING.md`, Abschnitt 5. Der Chat ist die einzige Stelle mit Flächen statt Linien (`docs/bereiche/chats.md`).

## 10. Sprache

Die App spricht Deutsch, duzt und bleibt sachlich.

| So | Nicht so |
| --- | --- |
| 3 Trainingstage diese Woche | Wahnsinn, du bist on fire! |
| Neuer Bestwert: 82,5 kg | Neuer PR freigeschaltet 🎉 |
| Aktivität speichern | Los geht's |
| Noch keine Aktivitäten. Trag deine erste ein. | Hier ist es noch ganz schön leer … |
| Speichern fehlgeschlagen. Prüf deine Verbindung und versuch es erneut. | Ups, da ist etwas schiefgelaufen! |

- Keine Ausrufezeichen, keine Emojis, keine Motivationssprüche.
- Ein Ding hat überall denselben Namen: Aktivität, Sportart, Satz, Übung, Gruppe, Bestwert. „Workout“ steht nicht mehr in der Oberfläche, nur noch im Code.
- Fehler sagen, was passiert ist und was zu tun ist.

## 11. Bewegung

- Dauer 150 ms, bei Overlays 200 ms, immer `ease-out`.
- Erlaubt: Ein- und Ausblenden von Overlays, Zustandswechsel von Bedienelementen, das einmalige Hinterlegen eines Bestwerts.
- Der Erfolgsmoment auf „Heute“: Neue Segmente des Wochenrings füllen sich nach einem Training nacheinander (600 ms je Segment, 120 ms versetzt). Ist das Wochenziel neu erreicht, wächst der Ring einmal kurz (700 ms, höchstens 4 %) und darunter erscheint ein Hinweis in Moos hell mit der Serie. Beides einmal je neuem Stand, gemerkt auf dem Gerät, nicht bei jedem Besuch.
- Nicht erlaubt: Einblend-Animationen beim Laden oder Scrollen, hüpfende oder federnde Bewegungen, Konfetti, hochzählende Zahlen.
- `prefers-reduced-motion` wird respektiert.

## 12. Zugänglichkeit

- Textkontrast mindestens 4,5:1.
- Tippflächen mindestens 44 × 44 px.
- Sichtbarer Fokusrahmen: 2 px Eisen mit 2 px Abstand.
- Bedeutung nie allein über Farbe: Die eigene Zeile ist zusätzlich mit „Du" benannt, ein Bestwert zusätzlich mit dem Wort.
- Jede Ansicht muss bei 200 % Zoom und bei 320 px Breite benutzbar sein.

## 13. Nicht erlaubt

- Verläufe, Glas-Effekte, Unschärfe, Leuchten
- Graue oder farbige Seitenhintergründe
- Karten in Karten, Schatten unter Karten
- Akzentfarben außer Moos und den Sportfarben, farbige Buttons
- Emojis, Illustrationen, Maskottchen, Stockfotos. Einzige Ausnahme sind die Übungsskizzen nach Abschnitt 15.
- Versalien-Beschriftungen und Kleinst-Etiketten über Überschriften
- Abzeichen, Medaillen, Flammen, Konfetti
- Weitere Schriften, auch keine Monospace-Schrift für Zahlen

## 14. Prüfliste vor jedem Merge

- [ ] Hintergrund ist Weiß, Gliederung kommt aus Abstand und Linie
- [ ] Die Ansicht hat genau eine Hauptaussage und höchstens einen gefüllten Button
- [ ] Moos kommt höchstens zweimal vor und nur mit Bedeutung; Sportfarben nur mit dem Namen der Sportart
- [ ] Alle Zahlen haben Tabellenziffern, Einheit und deutsches Format
- [ ] Keine Hex-Werte, festen Schriftgrößen oder Schatten außerhalb der Tokens
- [ ] Texte folgen Abschnitt 10
- [ ] Ansicht funktioniert bei 320 px, bei 1280 px und mit Tastatur

## 15. Übungs-Icons und Übungsskizzen

Die einzige Bildsprache der App. Regeln für Figuren, Icons je Muskelgruppe und Skizzen je Übung stehen in `docs/bereiche/uebungen.md`. Kurz: kein Moos, Farben nur aus den Tokens, Icons nur an Bedienelementen über `MuscleGroupIcon`, Skizzen nur über `ExerciseSketch`.

## 16. Noch offen

- Logo als Vektordatei (SVG)
- Dunkelmodus als eigener Token-Satz
- Gestaltungsregeln für die Module Physio und Health (Schmerzskala, Pläne, Stimmung)
