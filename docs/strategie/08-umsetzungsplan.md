# 08 Umsetzungsplan

Stand: 5. Oktober 2026. Setzt die Empfehlung aus [07](07-empfehlung-und-fahrplan.md) um.

## Beschlossen

| Nr. | Entscheidung | Datum |
| --- | --- | --- |
| E1 | **Option C**: eine App, gemeinsamer Sport führt, Training ist die Gewohnheitsebene | 5. Oktober 2026 |
| E2 | In der Oberfläche heißt es **„Aktivität"** statt „Workout" | 5. Oktober 2026 |
| E3 | Start in **München**, mit Datenmodell und Oberfläche für weitere Städte | 5. Oktober 2026 |
| E4 | **Alle gängigen Sportarten** lassen sich tracken, nicht nur Krafttraining | 5. Oktober 2026 |

Noch offen: die Sportarten, auf die sich der Pilot konzentriert. Vorschlag: **Laufen, Bouldern, Krafttraining**. Laufen hat viele offene Lauftreffs. Bouldern ist im Winter drinnen und sozial. Bei Krafttraining sind die bisherigen Nutzer. Alle anderen Sportarten lassen sich trotzdem tracken.

## Leitplanken

1. **Nichts geht verloren.** Bestehende Workouts, Sätze, Vorlagen und Bestwerte bleiben. Jedes bisherige Workout wird zur Aktivität „Krafttraining" oder, wenn es nur Ausdauer-Übungen enthält, zur passenden Sportart.
2. **Datenbank nur erweitern.** Die Tabelle `workouts` behält ihren Namen und bekommt neue Spalten. Ein Rollback des Codes funktioniert weiter (`docs/ENGINEERING.md`, Abschnitt 8). In der Oberfläche heißt sie „Aktivität".
3. **Eintragen in drei Tipps.** Sportart, Dauer, Speichern. Alles andere ist optional.
4. **Jedes Arbeitspaket ist ein eigener Pull Request** mit Migration, Datenbanktest, Unit-Tests, Prüfung im Browser bei 390, 1280 und 320 px und angepasster Doku.
5. **Städte sind Daten, kein Code.** München ist die erste Zeile in einer Tabelle. Eine neue Stadt ist eine neue Zeile.

## Datenmodell (Zielbild)

### Neue Tabellen

**`sports`**, Katalog der Sportarten. Lesbar für alle Angemeldeten, gepflegt nur per Migration.

| Spalte | Typ | Bedeutung |
| --- | --- | --- |
| `id` | text, Schlüssel | Kurzname, z. B. `laufen`, `bouldern`, `krafttraining` |
| `name` | text | Anzeigename auf Deutsch |
| `category` | text | `ausdauer`, `kraft`, `klettern`, `ballsport`, `koerper`, `outdoor`, `sonstiges` |
| `has_distance` | boolean | Zeigt das Feld Distanz |
| `has_elevation` | boolean | Zeigt das Feld Höhenmeter |
| `has_sets` | boolean | Bietet den Detail-Modus mit Übungen und Sätzen an |
| `aliases` | text[] | Suchbegriffe, z. B. „Joggen", „Running" |
| `position` | smallint | Reihenfolge in Listen |

Erste Auswahl mit 30 Sportarten:

| Bereich | Sportarten |
| --- | --- |
| Ausdauer | Laufen, Radfahren, Rennrad, Mountainbike, Schwimmen, Rudern, Inlineskaten |
| Outdoor | Wandern, Skitour, Langlauf, Ski, SUP |
| Kraft und Fitness | Krafttraining, Calisthenics, CrossFit, HIIT, Kurs im Studio |
| Klettern | Bouldern, Klettern |
| Ballsport | Fußball, Basketball, Volleyball, Beachvolleyball, Tennis, Padel, Tischtennis, Badminton |
| Körper und Geist | Yoga, Pilates |
| Sonstiges | Tanzen, Kampfsport, Sonstiges |

**`cities`**, Städte.

| Spalte | Typ | Bedeutung |
| --- | --- | --- |
| `id` | text, Schlüssel | z. B. `muenchen` |
| `name` | text | „München" |
| `country` | text | `DE`, `AT`, `CH` |
| `status` | text | `live` (Gruppen und Events sichtbar) oder `geplant` (Warteliste) |
| `lat`, `lng` | numeric | Mittelpunkt, für eine spätere Umkreissuche |

Anfangs ist nur München `live`. Weitere Städte (Berlin, Hamburg, Wien, Zürich und andere) stehen auf `geplant`.

**`city_interest`**: Wer eine geplante Stadt wählt, landet auf der Warteliste (Person, Stadt, Zeitpunkt). Daraus ergibt sich, welche Stadt als Nächstes kommt.

**`reports`** (erweitert): Meldungen zu Personen, Nachrichten und Events. Bisher gibt es Meldungen nur zu Communities.

### Neue Spalten

| Tabelle | Spalte | Zweck |
| --- | --- | --- |
| `workouts` (Aktivität) | `sport_id` (Pflicht, Standard `krafttraining`) | Sportart |
| | `duration_minutes` | Dauer, auch ohne Start und Ende |
| | `distance_m`, `elevation_m` | Für Ausdauer und Outdoor |
| | `feeling` (1–5) | Wie anstrengend, optional |
| | `meetup_id` | Aktivität aus einem Event („Warst du dabei?"), höchstens einmal je Person und Event |
| | `source` | `manuell`, `event`, später `import` |
| `meetups` (Event) | `sport_id`, `duration_minutes` | Sportart und geplante Dauer. Daraus folgen Ende und Frage nach dem Event |
| | `series_id` | Wiederkehrendes Event |
| `meetup_participants` | `status` (`dabei`, `warteliste`) | Warteliste bei voller Teilnehmerzahl |
| `groups` (Community) | `sport_id`, `city_id` | Statt freiem Text, für Entdecken und Filter. Der Text bleibt zur Anzeige erhalten |
| `profiles` | `city_id`, `sport_ids` | Für Einstieg und Vorschläge. Die freien Felder bleiben erhalten |
| `profiles` | `onboarded_at` | Ob der Einstieg abgeschlossen ist |

### Was gleich bleibt

- **Trainingstage** (`v_training_days`) zählen jede Aktivität, egal welche Sportart. Ranglisten, Wochenraster und Serie funktionieren ohne Änderung für alle Sportarten.
- **Sätze, Vorlagen und Kraft-Bestwerte** bleiben unverändert und hängen am Detail-Modus Krafttraining.

## Arbeitspakete

Größe: S = ein Arbeitstag, M = zwei bis drei Tage, L = vier bis fünf Tage (Annahme: eine Person mit KI-Unterstützung, im Tempo der bisherigen Schritte).

### AP0 Vorbereitung (S)

- Pull Request #8 mergen, die sechs Migrationen in Supabase einspielen, `database.types.ts` aus dem Projekt neu erzeugen.
- Produktion mit zwei Testkonten durchklicken: Profil, Chats, Folgen.
- Release-Tag `v0.2.0` setzen.
- **Fertig, wenn:** Produktion läuft auf dem neuen Stand, keine Fehler in den Supabase-Logs.

### AP1 Sportarten und Städte (M)

- Migration `sports_and_cities`: Tabellen `sports` und `cities` samt erster Auswahl. Neue Spalten an `workouts`, `groups`, `profiles`.
- Bestehende Daten zuordnen:
  - Workouts nur mit Ausdauer-Übungen bekommen die passende Sportart („Laufen" → `laufen`), alle anderen `krafttraining`. Die Dauer kommt aus Start und Ende oder aus der Summe der Satzdauern.
  - Communities mit Freitext „Laufen" oder Stadt „München" werden dem Katalog zugeordnet, wo es eindeutig ist.
- RLS: Katalog und Städte für alle Angemeldeten lesbar, nicht schreibbar.
- Doku: `DESIGN.md` (Sportarten-Icons, Begriff „Aktivität"), `ENGINEERING.md` (Städte als Daten).
- **Fertig, wenn:** Datenbanktest belegt, dass jedes alte Workout eine Sportart hat und keine Sätze verloren gehen. Katalog und Städte sind lesbar, aber nicht änderbar.

### AP2 Aktivität eintragen, jede Sportart (L)

- **„Aktivität eintragen"** statt „Workout starten":
  1. Sportart wählen: die eigenen zuerst, dann Suche im Katalog.
  2. Dauer eingeben (Stunden und Minuten), Datum vorbelegt mit heute.
  3. Je nach Sportart optional Distanz, Höhenmeter, Gefühl (1–5) und Notiz.
  4. Speichern.
- **Detail-Modus Krafttraining:** „Mit Übungen und Sätzen" führt in den bestehenden Logger mit Vorlagen und laufendem Training. Bei Calisthenics und CrossFit genauso.
- Datenbankfunktion `log_activity`: ganz oder gar nicht, wiederholbar ohne doppelte Einträge (ID kommt vom Gerät).
- Ansehen, korrigieren, löschen einer Aktivität. Verlauf mit Sportart, Dauer, Distanz.
- Alle Texte „Workout" → „Aktivität" (Oberfläche, Push, Datenschutz, MCP-Beschreibungen).
- **Fertig, wenn:** Ein Lauf ist in höchstens drei Tipps eingetragen und zählt sofort als Trainingstag. Krafttraining mit Sätzen funktioniert wie bisher. Datenbanktest für `log_activity`, Unit-Tests für Dauer und Distanz.

### AP3 „Warst du dabei?" (M)

- Events bekommen Sportart und Dauer, beim Planen vorbelegt aus der Community.
- Nach dem Ende eines Events sehen alle mit Zusage auf „Heute" die Frage **„Warst du dabei?"** mit den Antworten „Ja" und „Nein". Dazu kommt ein Push, wenn eingeschaltet.
- „Ja" legt eine Aktivität an (Sportart und Dauer des Events, `source = event`), höchstens einmal je Person und Event. Danach lässt sie sich bearbeiten, etwa um die Distanz zu ergänzen.
- Die Organisatorin sieht nach dem Event, wer dabei war.
- **Fertig, wenn:** Datenbanktest belegt, dass nur Teilnehmende bestätigen können, nicht doppelt, erst nach dem Ende. Ein bestätigtes Event erscheint im Wochenraster und in der Rangliste der Community.

### AP4 Bestwerte und Profil je Sportart (M)

- Bestwerte je Sportart:
  - Ausdauer: längste Distanz, längste Dauer, Kilometer im Monat;
  - Klettern und Ballsport: Zahl der Einheiten und Stunden im Monat;
  - Kraft: wie bisher das geschätzte Maximum.
- Profil-Kacheln: Sportarten mit Einheiten in den letzten 30 Tagen, Top-Bestwerte über alle Sportarten.
- Community-Rangliste: weiterhin Trainingstage. Für Communities einer Ausdauer-Sportart zusätzlich „Kilometer diese Woche".
- **Fertig, wenn:** Datenbanktest für die neue Auswertung `v_sport_bests`. Profil und Rangliste zeigen Läufer und Kraftsportler sinnvoll.

### AP5 Einstieg (M)

- Nach der Registrierung drei Schritte:
  1. Sportarten wählen, bis zu fünf aus dem Katalog.
  2. Stadt wählen: München oder „Andere Stadt" mit Warteliste.
  3. Passende Communities, kommende Events und Menschen aus der Stadt, mit „Beitreten" bzw. „Zusagen" direkt dort.
- Wer über einen Event- oder Gruppen-Link kommt, überspringt den Einstieg und landet direkt beim Event bzw. bei der Gruppe.
- **Fertig, wenn:** Ein neues Konto sieht nach höchstens 60 Sekunden mindestens eine passende Gruppe oder ein passendes Event in München, sofern vorhanden. Andere Städte landen auf der Warteliste.

### AP6 Navigation Heute, Entdecken, Gruppen, Chats (M)

- **Heute:**
  - Großzahl Trainingstage und Wochenraster;
  - „Warst du dabei?", wenn offen;
  - nächste eigene Events;
  - Button „Aktivität eintragen" (der eine gefüllte Button).
- **Entdecken:** Events der nächsten 14 Tage in der eigenen Stadt mit Filter nach Sportart und Tag, darunter Communities und Menschen. Die Stadt lässt sich wechseln, sobald es mehrere gibt.
- **Gruppen:** eigene Communities, Community erstellen, Beitritt per Code.
- **Chats:** wie heute.
- „Vorlagen" wandert in den Detail-Modus Krafttraining und bleibt über das Profil erreichbar.
- **Fertig, wenn:** Alle bisherigen Seiten sind erreichbar, alte Adressen leiten weiter, `DESIGN.md` beschreibt die neue Tab-Leiste.

### AP7 Melden und Moderation (M)

- Melden von Personen (Profil), Nachrichten (Chat) und Events, mit Grund und optionaler Notiz.
- Mehrfach gemeldete Nachrichten werden ausgeblendet, bis der Betreiber sie prüft.
- Die Verwaltung einer Community kann Events von der Pinnwand nehmen (gibt es schon) und Mitglieder entfernen.
- Datenschutzerklärung ergänzen. Ablauf für den Betreiber in `docs/LEGAL.md` beschreiben (Prüfung zunächst per SQL-Editor).
- **Fertig, wenn:** Datenbanktest belegt, dass jede Person nur ihre eigenen Meldungen sieht und dass das automatische Ausblenden ab der Schwelle greift.

### AP8 Werkzeuge für Organisatoren (L)

- **Öffentliche Event-Seite** `/e/[id]`: Titel, Zeit, Ort, Sportart, Zahl der Zusagen, mit Vorschau beim Teilen (Open Graph), ohne Namen der Teilnehmenden. „Zusagen" führt durch die Registrierung und sagt danach automatisch zu. Gilt nur für Events in öffentlichen Communities.
- **Wiederkehrende Events:** „Jede Woche am Dienstag, 18:30" legt die nächsten acht Termine an. Ändern und absagen geht für einen Termin oder die ganze Reihe.
- **Warteliste:** Ist ein Event voll, kommt man auf die Warteliste. Wird ein Platz frei, rückt die erste Person nach und bekommt einen Push.
- **Fertig, wenn:** Ein Event-Link öffnet ohne Konto eine Vorschau, Registrieren führt zur Zusage. Datenbanktests für Reihe und Warteliste.

### AP9 Kennzahlen (S)

- Kennzahlen aus 07 als Datenbank-Auswertungen im Schema `private`, ohne Tracking-Dienste von Dritten:
  - aktive Gruppen;
  - Zusagen pro Event;
  - Herkunft neuer Nutzer (`profiles.signup_source`: Event-Link, Gruppen-Link, direkt);
  - Bindung nach vier Wochen;
  - Anteil mit Event- und eigenen Aktivitäten.
- Abfrage im SQL-Editor, einmal pro Woche ins Pilot-Protokoll.
- **Fertig, wenn:** Alle sechs Kennzahlen lassen sich mit einer Abfrage je Woche ablesen. Nur zusammengefasste Zahlen, keine Einzelpersonen.

### AP10 Ende-zu-Ende-Tests (M)

- Playwright-Tests in der CI für die Kernabläufe, je bei 390 und 1280 px:
  1. registrieren, Einstieg, einer Gruppe beitreten;
  2. Event planen, zusagen, nach dem Event „Warst du dabei?" bestätigen;
  3. Aktivität eintragen, sie erscheint in Wochenraster und Rangliste;
  4. Chat in beide Richtungen.
- **Fertig, wenn:** Die Tests laufen bei jedem Pull Request und sind grün.

## Zeitplan

Annahme: Arbeitsbeginn Montag, 5. Oktober 2026, zweiwöchige Abschnitte.

| Abschnitt | Zeitraum | Produkt | Pilot München |
| --- | --- | --- | --- |
| 0 | 5.–9. Okt. | AP0 | Liste möglicher Organisatoren: Lauftreffs, Run-Clubs, Boulderhallen mit Community-Abenden, Unisport (ZHS), Vereinsabteilungen. Ziel: 30 Kontakte |
| 1 | 12.–23. Okt. | AP1, AP2 | Erste Gespräche (Schmerz mit WhatsApp, was fehlt), 10 Gespräche |
| 2 | 26. Okt.–6. Nov. | AP3, AP4 | Drei Organisatoren testen mit ihrer Gruppe (geschlossener Test) |
| 3 | 9.–20. Nov. | AP5, AP6 | Rückmeldungen einarbeiten, weitere Organisatoren gewinnen |
| 4 | 23. Nov.–4. Dez. | AP7, AP8 | **Öffentlicher Start in München**, Ziel 10 Organisatoren mit wöchentlichen Events |
| 5 | 7.–18. Dez. | AP9, AP10, Fehler beheben | Wöchentliche Kennzahlen, Kontakt mit allen Organisatoren |
| 6 | 4.–15. Jan. 2027 | Verbesserungen nach Daten | Neujahrsvorsätze nutzen: Aktion „Gemeinsam ins neue Jahr" mit den Gruppen |
| Entscheidung | 25. Jan. 2027 | Auswertung nach 07 | Weitermachen, nachschärfen oder neu entscheiden. Nächste Stadt anhand der Warteliste |

Zwischen 21. Dezember und 3. Januar ist keine Entwicklung eingeplant. Die Pilotgruppen laufen weiter.

## Abhängigkeiten

```
AP0 ─► AP1 ─► AP2 ─► AP3 ─► AP4
              │       │
              │       └─► AP6 (Heute zeigt „Warst du dabei?")
              └─► AP5 (Einstieg braucht Sportarten und Städte)
AP7 und AP8 brauchen nur AP1. AP9 und AP10 brauchen AP3 und AP5.
```

## Was am Ende des Pilots gilt

- In München gibt es mindestens 10 Gruppen mit wöchentlichen Events.
- Jede Sportart lässt sich eintragen, eine bestätigte Event-Teilnahme zählt automatisch.
- Neue Nutzer verstehen in fünf Sekunden, wofür die App da ist: Gruppen und Events finden, mitmachen, dranbleiben.
- Eine neue Stadt ist eine Zeile in `cities` und ein Eintrag auf der Warteliste, kein Umbau.
- Die Kennzahlen zeigen, ob die Verbindung von Events und Training trägt (Hypothese H4).

## Nächster Schritt

Freigabe für **AP0** (Pull Request #8 mergen, Migrationen einspielen) und dann **AP1 und AP2** (Sportarten, Städte, Aktivität eintragen). Außerdem die Pilot-Sportarten bestätigen (Vorschlag: Laufen, Bouldern, Krafttraining).
