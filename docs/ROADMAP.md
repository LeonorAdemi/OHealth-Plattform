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
| 11 | Persönliches Profil | Mehr Nähe in den Gruppen: Profilbild, Kurztext, Sportarten und Stadt; Profilbild oben rechts, Verlauf und Einstellungen im Profil | Erledigt (Migration profile_details, Test 17) |
| 12 | Gemeinsame Grundlage für Chats | Ein Datenmodell für Event-, Community- und später Privatchats, mit „gelesen bis" je Person | Erledigt (Migration chats, Test 18): Event-Chat entsteht mit der ersten Zusage, Community-Chat mit der Community (nicht bei Coaching), bisherige Nachrichten übernommen |
| 13 | Tab „Chats" | Neue Nachrichten unten rechts statt an der Glocke; die Glocke zeigt nur noch Zusagen, neue Trainings und Erinnerungen | Erledigt (Migration chat_inbox, Test 19): Chat-Liste mit ungelesenen Nachrichten, Event- und Community-Chats unter /chats, Push öffnet den Chat |
| 14 | Event-Chat unter jedem Event | Entsteht, sobald jemand zusagt; nur wer dabei ist, liest und schreibt | Erledigt: Chat-Zeile unter jedem Training auf Pinnwand und in „Gemeinsam trainieren“, ohne Zusage „Chat nach Zusage“ |
| 15 | Chat je Community | Alle Mitglieder schreiben; Grenze von 30 Nachrichten pro Minute, Verwaltung kann löschen, Push anfangs aus | Erledigt (Migration community_chat, Test 20). Coaching-Gruppen ohne Chat |
| 16 | Folgen, Profile und Privatchats | Wie bei Instagram: öffentlichen Konten folgen, privaten nach Bestätigung; Profil mit Trainingstagen, Serie, Bestwerten, kommenden Events und Communities statt Bildern; Nachrichten an öffentliche Konten und an Konten, denen man folgt, als Anfrage | Erledigt (Migrationen friends_and_direct_chats und follows, Test 21). Konten sind anfangs privat |

## Nächste Phase: Sport-Community (Option C)

Beschlossen am 5. Oktober 2026. Reihenfolge und Zeitplan stehen in `docs/strategie/09-strategie-review.md` (Arbeitspakete N0 bis N6), Datenmodell und Abnahmekriterien in `docs/strategie/08-umsetzungsplan.md`. Öffentlicher Start in München am 7. Januar 2027, Pilot-Schwerpunkt Laufen, Bouldern und Volleyball.

| Nr. | Schritt | Warum an dieser Stelle | Stand |
| --- | --- | --- | --- |
| 17 | Sportarten-Katalog und Städte (München live, weitere geplant) | Grundlage für alles Weitere | Erledigt in Pull Request #9 (Migration sports_and_cities, Test 22): 33 Sportarten, 8 Städte, bestehende Workouts und Communities zugeordnet |
| 18 | Aktivität eintragen für jede Sportart, Kraft als Detail-Modus | Jede Sportart gehört dazu | Erledigt in Pull Request #9 (Migration log_activity, Test 23): „Aktivität eintragen“ unter /aktivitaet/neu mit Sportart, Datum, Dauer, Distanz, Höhenmetern, Gefühl und Notiz; „Workout“ heißt in der Oberfläche „Aktivität“ |
| 19 | N0 Fundament: Migrationen einspielen, `v0.2.0`, Nachtrag zu Schritt 18 | Produktion auf aktuellem Stand, KI sieht jede Sportart, Formular robust bei Netzfehlern | Code fertig (Migration activity_checks_invoker_and_squash, Test 24): KI liest Sportart, Dauer, Distanz, Höhenmeter und Anstrengung; Formular übersteht Netzfehler; genauere Fehlermeldungen; Squash im Katalog. Offen beim Betreiber: Migrationen einspielen, `v0.2.0` |
| 20 | N1 Events je Sportart | Jede Sportart plant mit den Angaben, die für sie zählen | Code fertig (Migration meetup_sports, Test 25): „Training planen“ beginnt mit der Sportart, danach nur passende Felder (Trainingsplan bei Kraft, Distanz, Höhenmeter, Tempo in min/km oder km/h), Dauer und Niveau für alle; Anzeige in Pinnwand, Wochenplan und auf der Event-Seite; bei „Aktivität eintragen“ mit Krafttraining die eigenen Trainingspläne zum Start |
| 20b | N1b Wöchentliche Wiederholung, Termine ändern und absagen | Kein Lauftreff legt jede Woche ein Event von Hand an | Offen |
| 21 | N2 Öffentlicher Event-Link, Zusage nach Registrierung, Herkunft messen | Wachstumsmotor: der Link in WhatsApp zeigt eine Vorschau | Offen |
| 22 | N3 „Warst du dabei?“ nach Events | Gemeinsames Training zählt automatisch | Offen |
| 23 | N4 Melden, Mitglieder entfernen, Nutzungsbedingungen, Rechtstexte | Vertrauen und Recht vor dem öffentlichen Start | Offen |
| 24 | N5 Navigation Heute, Entdecken, Gruppen, Chats mit schlankem Einstieg | Klares Versprechen, keine leere App für Neue | Offen |
| 25 | N6 Kennzahlen und Ende-zu-Ende-Tests (zusammen mit Schritt 5) | Pilot messen und absichern, vor dem Start | Offen |
| 26 | Nach dem Pilot: Warteliste, Bestwerte je Sportart, Vorschläge, native Hülle | Nur, wenn die Kennzahlen es verlangen (Auslöser in 09) | Zurückgestellt |

Danach folgen die Module Physio und Health. Vor dem ersten davon werden die Regeln für Gesundheitsdaten in `docs/ENGINEERING.md`, Abschnitt 5, ergänzt.

## Bewusst zurückgestellt

- **Eigene Übungen anlegen.** Die Datenbank erlaubt es bereits, eine Oberfläche gibt es noch nicht. Vorher ist zu klären, was mit einer eigenen Übung passiert, die andere Gruppenmitglieder in ihren Workouts verwendet haben, wenn ihr Ersteller die Gruppe verlässt oder sein Konto löscht.
- **Datum eines Workouts mit Sätzen ändern**, um ein Training nachzutragen. Bei Aktivitäten ohne Sätze geht das seit Schritt 18.
- **Widerruf der Apple-Verbindung beim Konto-Löschen**, kommt mit der nativen Hülle.
