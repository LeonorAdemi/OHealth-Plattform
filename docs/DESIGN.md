# OHealth Design

Verbindliche Gestaltungsgrundlage für alle Oberflächen der OHealth-Plattform (Web, PWA, später Desktop). Wer UI baut, ob Mensch oder KI-Assistent, hält sich an dieses Dokument. Abweichungen werden hier geändert, nicht im Code.

## 1. Leitidee: das Logbuch

OHealth sieht aus wie ein sorgfältig gesetztes Trainingslogbuch: weißes Blatt, klare Schrift, große Zahlen. Die App tritt zurück, die eigene Leistung steht vorn.

## 2. Warum Design unser Differenzierer ist

Fitness-Apps sind fast alle dunkel, laut und verspielt: Neonfarben, Abzeichen, Konfetti, Motivationssprüche. OHealth ist das Gegenteil und dadurch sofort wiedererkennbar.

| Üblich im Markt | OHealth |
| --- | --- |
| Dunkler Hintergrund, Neon-Akzente | Weißes Blatt, eine ruhige Akzentfarbe |
| Abzeichen, Flammen, Konfetti | Rang und Fortschritt zeigen sich in Zahl und Typografie |
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
3. **Schwarz handelt, Grün bedeutet.** Buttons und Bedienelemente sind in Eisen (fast schwarz). Moos (Grün) ist ausschließlich für Bedeutung reserviert: „das bist du" und „das ist Fortschritt".
4. **Eine Schriftfamilie.** Ausdruck entsteht über Breite, Gewicht und Größe, nicht über weitere Schriften.
5. **Listen statt Karten.** Inhalte stehen als Zeilen untereinander. Karten nur dort, wo ein Element wirklich einzeln bewegt oder ausgewählt wird.
6. **Bewegung antwortet.** Animation gibt es nur als Reaktion auf eine Handlung.

## 4. Farben

Sechs Farben, mehr gibt es nicht. Werte stehen als Tokens in `src/app/globals.css`; in Komponenten werden nie Hex-Werte geschrieben.

| Name | Hex | Token | Einsatz |
| --- | --- | --- | --- |
| Kreide | `#FFFFFF` | `background` | Hintergrund jeder Ansicht |
| Eisen | `#18201C` | `foreground`, `primary` | Text, Zahlen, Buttons |
| Stein | `#636B67` | `muted-foreground` | Beschriftungen, Einheiten, Nebentext |
| Linie | `#E1E6E3` | `border` | Trennlinien, Rahmen |
| Nebel | `#F3F6F4` | `muted`, `secondary` | Hover, gedrückter Zustand, leere Rasterpunkte |
| Moos | `#156B4A` | `brand` | Eigene Zeile, eigener Fortschritt, neuer Bestwert |

Dazu Signal `#BE2323` (`destructive`) nur für Fehler und Löschen, sowie Moos hell `#DFF7EA` (`brand-subtle`) als Markierung hinter einem neuen Bestwert.

Regeln:

- Moos erscheint pro Ansicht an höchstens zwei Stellen. Wenn alles grün ist, bedeutet Grün nichts mehr.
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

**Das Wochenraster.** Sieben Quadrate für Montag bis Sonntag, 10 px groß, 4 px Abstand, 2 px Eckenradius. Trainiert: Eisen gefüllt. Nicht trainiert: Nebel. Eigene Zeile: Moos statt Eisen. Es ersetzt Flammen, Streak-Abzeichen und Fortschrittsringe und zeigt Konstanz auf einen Blick, im Leaderboard für jede Person in derselben Form.

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
│ 3                  │        │ Vorlagen │ 3                         │
│ Trainingstage      │        │ Communit.│ Trainingstage diese Woche │
│ ■ ■ □ ■ □ □ □      │        │ Chats    │ ■ ■ □ ■ □ □ □             │
│                    │        │          │                           │
│ Zeile ──────────── │        │          │ Zeile ─────────── Zeile   │
│ Zeile ──────────── │        │          │ Zeile ─────────── Zeile   │
│                    │        │          │                           │
│ [Aktivität eintr.] │        │          │                           │
├────────────────────┤        └──────────┴───────────────────────────┘
│Heute Vorl Comm Chat│         240 px      Inhalt max. 960 px
└────────────────────┘
```

- Handy: Seitenrand 20 px, Tab-Leiste unten mit höchstens vier Einträgen, Hauptaktion als Button in voller Breite über der Tab-Leiste.
- Desktop: Seitenleiste links 240 px, weiß, durch eine Linie getrennt. Inhalt höchstens 960 px breit, Textspalten höchstens 640 px. Zusätzliche Breite wird für eine zweite Spalte genutzt, nicht für größere Elemente.
- Oben rechts stehen auf jeder Ansicht, am Handy und am Desktop, die Glocke und das eigene Profilbild (A). Das Profilbild führt zum Profil; dort liegen der Verlauf und die Einstellungen. Ein eigener Tab für den Verlauf entfällt. Der vierte Tab ist „Chats“; er zeigt in einem Kreis in Eisen, in wie vielen Chats neue Nachrichten sind. Die Glocke zählt nur Zusagen, neue Trainings, Absagen und Erinnerungen, keine Chat-Nachrichten.
- Listenzeilen sind mindestens 56 px hoch, mit Linie darunter, ohne Rahmen und ohne Hintergrund.

## 9. Komponenten

Basis sind die Bausteine aus Origin UI in `src/components/ui/`. Sie werden über die Tokens gestaltet, nicht einzeln umgefärbt.

- **Ecken:** 8 px für Buttons, Eingaben und Overlays. Zeilen, Tabellen und Trennlinien haben keine Rundung. Vollrund nur Avatare.
- **Profilbild:** Rund, 32 px oben rechts, 96 px auf dem Profil. Ohne Bild stehen die Initialen in Stein auf Nebel. Eingebunden nur über `Avatar` aus `src/components/ui/avatar.tsx`. Es steht dort, wo es um die Person geht (Kopfzeile, Profil, später Chat), nicht als Schmuck in Ranglisten.
- **Profil:** Oben Profilbild, Name als Titel, darunter Stadt und Sportarten in Stein, dann der Kurztext. Danach „Profil bearbeiten" (Umriss) und „Einstellungen" (Text), darunter der Verlauf. Das Profil anderer Personen zeigt nur Bild, Name, Angaben und Kurztext.
- **Profil wie bei Instagram, aber ohne Bilder:** Oben Profilbild, Name als Titel, Stadt und Sportarten in Stein, darunter „Follower“ und „Folgt“ als Zahl (Tabellenziffern, halbfett) mit Wort in Stein, dann der Kurztext. Darunter genau eine Hauptaktion als gefüllter Button: „Folgen“, „Zurückfolgen“ oder, wenn man folgt, „Nachricht“. „Gefolgt“ steht als Umriss mit Häkchen. „Nicht mehr folgen“, „Als Follower entfernen“ und „Blockieren“ sind Textlinks mit Rückfrage. Statt eines Bildrasters folgen Abschnitte: zuerst die Großzahl „Trainingstage diese Woche“ mit Wochenraster und daneben die Serie in Wochen als Zahl, dann „Bestwerte“ als Zeilen, „Kommende Events“ mit Datumsblock wie auf der Pinnwand und „Communities“. Bei privaten Konten ohne Folgen steht statt der Abschnitte ein Satz.
- **Follower und Menschen finden:** „Follower“ mit den Reitern Follower, Folgt und Anfragen; Anfragen mit „Bestätigen“ (gefüllt, klein) und „Löschen“ (Umriss) in der Zeile. „Menschen finden“ mit Namenssuche und Vorschlägen aus den eigenen Communities, je Zeile Profilbild, Name, Angaben und rechts der Stand in Stein (Gefolgt, Angefragt, Folgt dir, Privat).
- **Nachrichtenanfragen:** In „Chats“ oben ein eigener Abschnitt „Nachrichtenanfragen“. Im Chat steht über den Nachrichten eine Leiste mit „Annehmen“ (gefüllt) und „Ablehnen“ (Umriss). Eigene offene Anfragen tragen statt der Uhrzeit „Angefragt“.
- **Auswahl-Chips** (zum Beispiel Sportarten): Umriss mit 8 px Rundung. Gewählt: Rahmen und Schrift in Eisen mit Häkchen, nicht gefüllt. Nicht gewählt: Rahmen in Linie, Schrift in Stein.
- **Aktivität eintragen:** Die Hauptaktion auf „Heute“. Oben die zuletzt genutzten Sportarten als Chips, darunter „Alle Sportarten“ mit Suche und den Gruppen des Katalogs. Dann Datum, Dauer in Stunden und Minuten und nur bei passenden Sportarten Distanz und Höhenmeter, danach „Wie anstrengend?“ als Chips und eine Notiz. Drei Tipps reichen: Sportart, Dauer, Speichern. In Listen steht die Aktivität als Titel oder Sportart, darunter „Laufen · 45 min · 8,2 km“. Übungen mit Sätzen bleiben ein eigener Weg: Wer eine Sportart mit Sätzen wählt (Krafttraining, Calisthenics, CrossFit), sieht unter der Auswahl die eigenen Vorlagen als Zeilen und startet eine davon mit einem Tipp, daneben „Ohne Vorlage: Sätze nachtragen“.
- **Training planen (Event):** Zuerst die Sportart mit derselben Auswahl wie bei „Aktivität eintragen“; aus einer Community heraus ist deren Sportart vorbelegt. Danach erscheinen nur die Felder, die zur Sportart passen: bei Kraft die Vorlage, bei Ausdauer Distanz, Höhenmeter und Tempo (Laufen in min/km, Rad in km/h). Für alle gibt es Tag, Uhrzeit, Dauer (vorbelegt mit 1 Stunde), das Niveau als Auswahl-Chips („Einsteiger willkommen“, „Gemischtes Niveau“, „Fortgeschritten“) und einen optionalen Titel; ohne Titel heißt das Event wie die Vorlage oder die Sportart. In Listen steht unter dem Titel „Laufen · 1 h 00 min · 10,0 km · 6:00 min/km · Einsteiger willkommen“, die Sportart nur, wenn der Titel sie nicht schon nennt. Auf der Seite des Events steht die Uhrzeit von Beginn bis Ende („18:30–19:30 Uhr“) und je Angabe eine Zeile. Auswahl-Chips kommen immer aus `ChoiceChip` in `src/components/ui/choice-chip.tsx`. Unter Tag und Uhrzeit steht „Jede Woche wiederholen“ als Häkchen mit einem Satz, was passiert. In Listen trägt ein Termin einer Reihe „jede Woche“ in der zweiten Zeile, die Seite des Events zeigt „Jeden Dienstag, 18:30 Uhr“ unter dem Datum. Wer plant, sieht dort „Bearbeiten“ als Umriss-Button; dasselbe Formular ist vorbelegt und fragt bei einer Reihe „Ändern für“: „Nur diesen Termin“ oder „Diesen und alle folgenden Termine“. „Absagen“ fragt bei einer Reihe ebenso, was abgesagt wird.
- **Öffentlicher Event-Link (`/e/[id]`):** Im Rahmen der Anmeldeseiten (Logo oben, Rechtliches unten). Oben der Name der Community in Stein, dann Datumsblock, Titel, Zeit von Beginn bis Ende und bei Reihen „Jeden Dienstag, 18:30 Uhr“. Darunter die Angaben als Zeilen wie auf der Seite des Events, mit „Zusagen“ als Zahl, aber ohne Namen. Ohne Konto ein gefüllter Button „Konto erstellen und zusagen“ und darunter „Ich habe schon ein Konto“ als Textlink, mit Konto „Ich bin dabei“. Nach der Zusage zeigt die Seite des Events einmal „Du bist dabei.“ mit dem Hinweis auf Kalender, Home-Bildschirm und Mitteilungen, zwischen zwei Linien. Wer dabei ist, findet dort „Link teilen“ als Umriss-Button.
- **Schatten:** keine. Einzige Ausnahme sind Overlays (Dialog, Drawer, Menü) mit einem einzigen weichen Schatten.
- **Buttons:** Pro Ansicht genau ein gefüllter Button (Eisen auf Weiß). Alle weiteren sind Umriss oder reiner Text. Höhe 48 px am Handy, 40 px am Desktop. Beschriftung ist ein Verb und sagt genau, was passiert: „Aktivität speichern".
- **Eingaben:** Beschriftung steht immer über dem Feld. Zahlenfelder für Gewicht und Wiederholungen sind groß (Zahl-Stil), rechtsbündig und öffnen die Zifferntastatur.
- **Leaderboard:** Eine gesetzte Tabelle: Rang, Name, Wochenraster, Zahl. Die eigene Zeile hat Namen und Zahl in Moos, sonst keine Hervorhebung. Keine Medaillen, keine Podeste, keine Avatare als Schmuck.
- **Bestwert:** Ein neuer Bestwert wird einmalig mit Moos hell hinterlegt und mit dem Wort „Bestwert" in Klein gekennzeichnet.
- **Icons:** Nur in Navigation und an Bedienelementen, nie als Schmuck neben Überschriften. Strichstärke 1,5, Größe 20 px, Farbe wie der zugehörige Text. Die Icons der Muskelgruppen folgen derselben Regel (Abschnitt 15).
- **Diagramme:** Dünne Linie in Eisen, eigener Wert in Moos, keine Flächenfüllung, keine Gitterlinien außer einer Grundlinie.
- **Leere Zustände:** Ein Satz, der sagt, was hier erscheinen wird, und ein Button. Keine Illustrationen.

### Chat-Liste

Unter „Chats“ stehen alle Chats als Zeilen, die neueste Nachricht zuerst:

- Links beim Training derselbe Datumsblock wie auf der Pinnwand, bei einer Community die Initialen im runden Feld wie beim Profilbild.
- Titel in Text, darunter die letzte Nachricht in Klein mit Namen davor („Du: …“), eine Zeile, gekürzt.
- Rechts oben der Zeitpunkt (heute die Uhrzeit, gestern „Gestern“, sonst das Datum), darunter die Zahl ungelesener Nachrichten in einem Kreis in Eisen. Mit ungelesenen Nachrichten stehen Zeitpunkt und Vorschau in Eisen statt Stein. Kein Moos.

### Chat-Zeilen

- Auf der Community-Seite steht über den Reitern eine Zeile „Chat der Community“ mit Sprechblasen-Icon, letzter Nachricht und Zahl ungelesener Nachrichten. Dieselbe Zeile führt auf der Seite eines Trainings zu seinem Chat.
- In Listen von Trainings (Pinnwand, „Gemeinsam trainieren“) steht unter Titel und Angaben eine kurze Chat-Zeile in Klein: Icon (16 px), letzte Nachricht, Zahl ungelesener Nachrichten. Wer nicht zugesagt hat, liest dort „Chat nach Zusage“.
- In einem Community-Chat kann die Verwaltung auch fremde Nachrichten antippen und löschen. Das „Nachricht löschen“ steht dann unter der Blase auf der Seite der Blase.

### Chat

Der Chat eines Trainings oder einer Community folgt bewusst dem Muster bekannter Messenger, weil es dort jeder sofort bedienen kann. Das ist die einzige Stelle mit Flächen statt Linien:

- Eigene Nachrichten rechts in Eisen mit weißer Schrift, andere links in Nebel. Kein Moos.
- Sprechblasen mit 16 px Rundung, die letzte einer Folge an der Seite des Absenders mit 6 px.
- Name nur über der ersten Nachricht einer Folge (gleiche Person, höchstens fünf Minuten Abstand).
- Uhrzeit klein in der Blase, bei eigenen Nachrichten mit Uhr (wird gesendet) oder Häkchen (gesendet).
- Tagestrenner („Heute“, „Gestern“, „Do, 1. Okt.“) als kleine Fläche in Nebel, mittig.
- Eingabe unten fest, rundes Feld und runder Senden-Button in Eisen. Am Rechner sendet Enter.

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
- Mehr als eine Akzentfarbe, farbige Buttons
- Emojis, Illustrationen, Maskottchen, Stockfotos. Einzige Ausnahme sind die Übungsskizzen nach Abschnitt 15.
- Versalien-Beschriftungen und Kleinst-Etiketten über Überschriften
- Abzeichen, Medaillen, Flammen, Konfetti
- Weitere Schriften, auch keine Monospace-Schrift für Zahlen

## 14. Prüfliste vor jedem Merge

- [ ] Hintergrund ist Weiß, Gliederung kommt aus Abstand und Linie
- [ ] Die Ansicht hat genau eine Hauptaussage und höchstens einen gefüllten Button
- [ ] Moos kommt höchstens zweimal vor und nur mit Bedeutung
- [ ] Alle Zahlen haben Tabellenziffern, Einheit und deutsches Format
- [ ] Keine Hex-Werte, festen Schriftgrößen oder Schatten außerhalb der Tokens
- [ ] Texte folgen Abschnitt 10
- [ ] Ansicht funktioniert bei 320 px, bei 1280 px und mit Tastatur

## 15. Übungs-Icons und Übungsskizzen

Icons und Skizzen helfen, eine Übung schneller zu erkennen und richtig auszuführen. Sie sind die einzige Bildsprache der App.

### Figurensprache

Icons und Skizzen teilen eine Sprache, damit sie zusammen wie aus einer Hand wirken:

- Kopf als gefüllter Punkt, Glieder als Linien mit runden Enden.
- Keine Gesichter, keine Muskeln, keine Schatten, keine Verläufe.
- Feste Proportionen für alle Figuren (Rumpf 36, Oberarm 21, Unterarm 19, Oberschenkel 26, Unterschenkel 25). Sie stehen in `tools/exercise-art/kit.py` und werden nicht pro Übung verändert.

### Icons je Muskelgruppe

- Neun Icons, eins je Muskelgruppe, 20 px, Strich 1,5, `currentColor`, also wie alle Icons nach Abschnitt 9.
- Sie stehen nur an Bedienelementen: am Einstieg über die Muskelgruppen und in den Treffern der Übungssuche. Neben Überschriften stehen sie nicht.
- Eingebunden nur über `MuscleGroupIcon` in `src/modules/workouts/components/muscle-group-icon.tsx`.

### Skizzen je Übung

- Eine SVG-Datei je Katalogübung in `public/exercises/`, Format 3 : 2 (240 × 160).
- Seitenansicht, Blick nach rechts. Ausnahmen in Vorderansicht nur, wo die Bewegung seitlich verläuft (Seitheben, Butterfly, Kabelzug-Fliegende, Adduktoren und Abduktoren).
- Bewegte Übungen zeigen zwei Lagen nebeneinander: links hell die Ausgangslage, rechts in Eisen die Endlage, dazwischen ein Winkel in Stein. Haltende Übungen (Plank, Wandsitzen) und Ausdauer zeigen eine Lage.
- Farben nur aus den Tokens: Figur Eisen, Geräte Stein, Ausgangslage und ferne Gliedmaßen `#B4BCB7` (Token `input`), Boden in Linie.
- Moos kommt in Icons und Skizzen nie vor. Es bleibt „du" und „Fortschritt" vorbehalten.
- Beim Loggen steht die Skizze hinter „Ausführung zeigen" unter dem Namen der Übung. Sie wird erst geladen, wenn jemand sie aufklappt.
- Eingebunden nur über `ExerciseSketch` und `exerciseImage(name)` aus `src/modules/workouts/exercise-images.ts`. Ein Test stellt sicher, dass jede Übung aus dem Katalog eine Skizze hat.
- Die Farben stehen als feste Werte in den SVG-Dateien. Ändern sich die Tokens, werden die Skizzen mit dem Generator neu erzeugt.
- Eigene Übungen haben keine Skizze. Dann entfällt die Fläche ganz, es gibt keinen Platzhalter.

### Neue Übung

Pose in `tools/exercise-art/` ergänzen, `python3 tools/exercise-art/build.py` ausführen, Slug in `src/modules/workouts/exercise-images.ts` eintragen, Ergebnis im Browser bei 320 px prüfen.

## 16. Noch offen

- Logo als Vektordatei (SVG)
- Dunkelmodus als eigener Token-Satz
- Gestaltungsregeln für die Module Physio und Health (Schmerzskala, Pläne, Stimmung)
