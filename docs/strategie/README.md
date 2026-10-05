# Strategie: Eine App oder zwei?

Stand: 5. Oktober 2026. Entscheidungsvorlage für die Frage, ob OHealth als eine App weitergeführt oder in einen Fitness-Tracker und einen Event-Organizer getrennt wird.

## Die Antwort zuerst

**Eine App, aber mit klarer Rangfolge: Gemeinsamer Sport führt, Training ist die Gewohnheitsebene darunter.** Nicht trennen, aber auch nicht beide Teile gleich laut nebeneinander stellen.

1. **Trennen schwächt beide Hälften.** Zwei Apps bedeuten zwei Kaltstarts, zwei Netzwerke mit halber Dichte und doppelten Aufwand bei einem kleinen Team. Getrennt haben bisher nur Unternehmen mit großer Nutzerbasis erfolgreich (Foursquare, Facebook), und selbst dort wurde vieles wieder zusammengeführt.
2. **Der Wert liegt in der Verbindung, nicht in den Teilen.** Ein Event wird zum Trainingstag, Trainingstage werden zu Rang und Serie in der Gruppe, und das bringt die Leute zum nächsten Event. Im Code ist diese Verbindung schon angelegt (Wochenplan, Ranglisten, Profil-Kacheln). Genau diese Schleife hat kein Wettbewerber für lokale, sportartübergreifende Gruppen.
3. **Als reiner Tracker ist OHealth austauschbar.** Hevy (17 Mio. Nutzer), Strong und Strava besetzen das Feld, und Fitness-Apps halten im Schnitt nur 3 bis 4 Prozent der Nutzer bis Tag 30. Gemeinschaft dagegen wächst: Laufclubs auf Strava haben sich 2025 vervielfacht, und fast die Hälfte der Menschen nennt soziale Kontakte als Hauptgrund für eine Sportgruppe.
4. **Darum ändert sich die Gewichtung, nicht die Zahl der Apps.** Das Eintragen eines Trainings wird sportartneutral und schnell (Sportart, Dauer, fertig), und ein besuchtes Event zählt automatisch als Trainingstag. Der Kraft-Logger bleibt als Detail-Modus erhalten.
5. **Die Trennung bleibt als Option offen.** Der Code ist schon in `core` und `workouts` getrennt. Bestimmte Messwerte lösen eine neue Prüfung aus (siehe [07](07-empfehlung-und-fahrplan.md#wann-wir-neu-entscheiden)).

In der Bewertung erreicht diese Option 4,2 von 5 Punkten. Zwei getrennte Apps kommen auf 2,25, der heutige gleichgewichtete Zustand auf 2,7. Das Ergebnis bleibt stabil, wenn man die Gewichte deutlich verschiebt ([06](06-bewertung.md)).

## Fragestellung

- **Situation:** OHealth begann als Fitness-Tracker für Freunde (Workouts loggen, Ranglisten). Inzwischen kann die App Events planen, Communities führen, chatten, folgen und privat schreiben.
- **Komplikation:** Damit sind zwei Produktversprechen in einer App: „Dokumentiere dein Training" und „Organisiere gemeinsamen Sport". Neue Nutzer verstehen nicht sofort, wofür die App da ist. Und das Team baut an zwei Fronten gleichzeitig.
- **Kernfrage:** Mit welcher Produktstruktur erreicht OHealth in den nächsten 12 Monaten am schnellsten eine aktive, wachsende Nutzerbasis, bei einem kleinen Team?

## Aufbau

| Nr. | Dokument | Inhalt |
| --- | --- | --- |
| 01 | [Ausgangslage](01-ausgangslage.md) | Was die App heute kann, wie stark Tracker und Organizer im Code verflochten sind |
| 02 | [Problemstruktur](02-problemstruktur.md) | Fragenbaum und Hypothesen, die die Entscheidung tragen |
| 03 | [Markt und Wettbewerb](03-markt-und-wettbewerb.md) | Trends, Wettbewerber, freie Position |
| 04 | [Nutzer und Aufgaben](04-nutzer-und-aufgaben.md) | Zielgruppen, ihre Aufgaben und wie oft sie die App brauchen |
| 05 | [Optionen](05-optionen.md) | Fünf Produktstrukturen im Detail |
| 06 | [Bewertung](06-bewertung.md) | Gewichtete Bewertung und Robustheit |
| 07 | [Empfehlung und Fahrplan](07-empfehlung-und-fahrplan.md) | Empfehlung, 90-Tage-Plan, Kennzahlen, Entscheidungspunkte, Risiken |
| | [Quellen](quellen.md) | Belege und Annahmen |

## Vorgehen

Hypothesengetrieben: Zuerst wird die Kernfrage in Teilfragen zerlegt (02). Jede Teilfrage wird mit Belegen aus dem Code (01), dem Markt (03) und den Nutzeraufgaben (04) beantwortet. Die Optionen (05) werden gegen dieselben Kriterien bewertet (06). Zahlen aus Quellen sind belegt, Schätzungen sind als Annahme gekennzeichnet.
