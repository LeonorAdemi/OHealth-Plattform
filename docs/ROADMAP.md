# OHealth Roadmap

Reihenfolge der Weiterentwicklung von Draft 1. Jeder Schritt ist für sich abgeschlossen: gebaut, getestet, dokumentiert. Stand wird hier gepflegt.

| Nr. | Schritt | Warum an dieser Stelle | Stand |
| --- | --- | --- | --- |
| 1 | Bestwerte je Übung in der Gruppe | Zweite Hälfte des Kernversprechens: neben Konstanz auch Kraft vergleichen | Erledigt |
| 2 | Workout ansehen, korrigieren, löschen | Tippfehler beim Loggen verfälschen sonst die Ranglisten dauerhaft | Erledigt |
| 3a | Konto löschen | Pflicht nach DSGVO und Voraussetzung für den App Store, vor den ersten echten Nutzern | Erledigt |
| 3b | Datenschutzerklärung und Impressum | Wie 3a | Seiten gebaut. Offen: Angaben des Betreibers und rechtliche Prüfung, siehe `docs/LEGAL.md` |
| 4 | Größerer Übungskatalog mit deutschen Namen und Suche | Zwölf Übungen reichen für einen Test, nicht für den Alltag | Erledigt |
| 4b | Icons je Muskelgruppe und Skizze je Übung | Übungen schneller finden und richtig ausführen, ohne die Liste zu überladen | Erledigt |
| 5 | Ende-zu-Ende-Tests der drei Kernabläufe | Sichert das Fundament ab, bevor weitere Module dazukommen | Offen |
| 6 | Native Hülle für TestFlight | Erst sinnvoll, wenn die App im Alltag trägt (siehe Store-Konzept) | Offen |
| 7 | KI-Zugriff über MCP für Trainingstipps | Trainingstipps aus den eigenen Daten, ohne KI in der App zu betreiben | Gebaut und getestet. Offen: OAuth-Server in Supabase einschalten, Test mit Claude nach dem Deployment |
| 8 | Öffentliche Communities (z. B. „Laufen München“) | Gemeinschaftseffekt über den Freundeskreis hinaus | Erledigt: Übersicht mit Suche, eigene Communities öffentlich oder privat, Teilen-Link, Rangliste (Migrationen public_communities, community_phase_a, Tests 09 und 13) |
| 9 | Wochenplan, geteilte Trainings und Chat | Aus der Rangliste wird gemeinsames Training: Woche planen, mit Communities teilen, andere sagen zu und sprechen sich im Chat ab | Erledigt (Migrationen community_search_and_meetups, planned_trainings_and_chat, Test 14). Später denkbar: Zusage erst nach Bestätigung, Erinnerung, Chat in Echtzeit statt alle zehn Sekunden |
| 10 | Mitteilungen | Ohne Bescheid kommt niemand zurück: neue Trainings, Zusagen, Chat und Absagen erscheinen an der Glocke | Erledigt: Glocke in der App (Migration notifications, Test 15), Push aufs Handy und Erinnerung vor dem Training (Migration push_and_reminders, Test 16) |

Danach folgen die Module Physio und Health. Vor dem ersten davon werden die Regeln für Gesundheitsdaten in `docs/ENGINEERING.md`, Abschnitt 5, ergänzt.

## Bewusst zurückgestellt

- **Eigene Übungen anlegen.** Die Datenbank erlaubt es bereits, eine Oberfläche gibt es noch nicht. Vorher ist zu klären, was mit einer eigenen Übung passiert, die andere Gruppenmitglieder in ihren Workouts verwendet haben, wenn ihr Ersteller die Gruppe verlässt oder sein Konto löscht.
- **Datum eines Workouts ändern**, um ein Training nachzutragen.
- **Widerruf der Apple-Verbindung beim Konto-Löschen**, kommt mit der nativen Hülle.
