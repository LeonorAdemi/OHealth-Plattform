# 01 Ausgangslage

Was die App heute kann und wie stark ihre beiden Hälften verflochten sind. Grundlage ist der Code auf dem Branch mit Pull Request #8 (Stand 5. Oktober 2026).

## Funktionsumfang

| Bereich | Funktionen | Modul |
| --- | --- | --- |
| **Training (Tracker)** | Workout loggen mit Katalog aus gut 100 Übungen, Sätze mit Wiederholungen, Gewicht, Dauer oder Distanz. Vorlagen mit Versionen, laufendes Training mit Pausen, Verlauf je Übung, Bestwerte, KI-Zugriff über MCP | `workouts` |
| **Gemeinsam (Organizer)** | Communities (öffentlich, privat, Coaching), Events planen und teilen, Zusage, Erinnerung, Kalendereintrag, Chats (Event, Community, privat), Mitteilungen und Push | `core` |
| **Sozial** | Profil mit Bild und Angaben, Folgen wie bei Instagram, öffentliche und private Konten, Nachrichtenanfragen, Menschen finden | `core` |
| **Verbindung beider Hälften** | Wochenplan mit geplanten Events und erledigten Workouts, Ranglisten der Trainingstage und Bestwerte in Communities, Profil-Kacheln (Trainingstage, Serie, Bestwerte, Events), Event mit Vorlage direkt als Training starten | Seiten setzen beide Module zusammen |

## Größe im Code

| Kennzahl | Wert |
| --- | --- |
| Zeilen `src/modules/core` (Gemeinsam, Sozial) | rund 4.800 |
| Zeilen `src/modules/workouts` (Training) | rund 4.270 |
| Seiten in der App | 28, davon 11 mit Daten aus beiden Modulen |
| Migrationen | 28: etwa 8 zum Training, 14 zu Gemeinschaft, Chat und Folgen, der Rest übergreifend (Zugriffsschutz, Konto) |
| Datenbanktests | 380 |

Beide Hälften sind also etwa gleich groß. Das passt zur Wahrnehmung „zwei Apps in einer".

## Wie stark die Hälften verflochten sind

Die Verflechtung ist weniger technisch als **inhaltlich**:

- **Training → Gemeinschaft:** Ranglisten und Profil-Kacheln leben von den Trainingsdaten. Ohne Training gibt es in einer Community nichts zu vergleichen.
- **Gemeinschaft → Training:** Ein Event kann eine Vorlage tragen und direkt als Training starten. Der Wochenplan zeigt Geplantes und Erledigtes zusammen.
- **Technisch** sind die Module sauber getrennt. `workouts` nutzt `core` nur an drei Stellen, `core` kennt `workouts` gar nicht. Eine spätere Trennung wäre machbar, das Zusammensetzen passiert in den Seiten.

## Stärken

- Ein klarer, sportartneutraler Kern für Konstanz: Trainingstage pro Woche, Wochenraster, Serie. Das funktioniert für jede Sportart.
- Ein unverwechselbares, ruhiges Design („Logbuch") in einem lauten Markt.
- Datenschutz und Zugriffsschutz in der Datenbank, mit 380 Tests abgesichert. Das ist eine Grundlage für Vertrauen und später für Gesundheitsdaten.
- Fertige Organizer-Grundlagen: Events, Zusage, Chat, Erinnerung, Push, Teilen-Links mit Vorschau.

## Schwächen

- **Das Training ist kraftlastig.** Wer läuft, radelt oder bouldert, muss Übungen und Sätze eintragen, die nicht zur Sportart passen. Für eine Sport-Community ist das die größte Hürde.
- **Das Nutzenversprechen ist unklar.** Die Tabs „Heute", „Vorlagen", „Community" und „Chats" zeigen zwei Produkte nebeneinander.
- **Ein besuchtes Event zählt nicht als Training.** Gerade die Verbindung beider Hälften fehlt an der wichtigsten Stelle.
- **Kein geführter Einstieg.** Neue Nutzer sehen eine leere App.
- **Noch keine echten Nutzer** in größerer Zahl. Alle Annahmen zur Nutzung sind ungeprüft.
