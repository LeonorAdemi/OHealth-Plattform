# 09 Strategie-Review und neu geschnittene Arbeitspakete

Stand: 5. Oktober 2026. Kritische Prüfung von 01 bis 08 nach dem Merge von Pull Request #9 (AP1 und AP2). Status: **Freigegeben am 5. Oktober 2026** (Reihenfolge N0 bis N6, Start am 7. Januar 2027, Pilot-Sportarten). Die Reihenfolge und der Zeitplan hier ersetzen die in 08. Inhalte und Abnahmekriterien aus 08 gelten weiter, soweit hier nichts anderes steht.

## Die Antwort zuerst

**Die Richtung stimmt, die Reihenfolge nicht.** Option C (eine App, gemeinsamer Sport führt) bleibt richtig. Der Umsetzungsplan in 08 baut aber zuerst für die Mitmacher (Bestwerte, Einstieg, Navigation) und zuletzt für die Organisatorinnen, von denen laut eigener Strategie das Wachstum abhängt. Außerdem prüft er die riskanteste Annahme erst ganz am Ende.

Drei Kurskorrekturen:

1. **Organisatorin zuerst.** Wiederkehrende Events und ein öffentlicher Event-Link kommen vor allem anderen. Heute landet ein Event-Link aus WhatsApp ohne Vorschau auf der Anmeldeseite. Damit fehlt genau der Wachstumsmotor, auf dem H6 und die Kennzahl „≥ 50 % über Links" aufbauen.
2. **Erst prüfen, dann weiterbauen.** Die Gespräche mit Organisatoren beginnen diese Woche und nicht nebenbei in Abschnitt 1. Nach zehn Gesprächen gibt es ein klares Tor: Wollen mindestens drei von zehn ein wiederkehrendes Treffen in OHealth führen? Wenn nicht, wird nicht weitergebaut, sondern neu gedacht.
3. **Weniger bauen, früher sicher sein.** Bestwerte je Sportart und große Teile des Einstiegs wandern hinter den Pilot. Rechtstexte, Melden, Kennzahlen und Ende-zu-Ende-Tests rücken vor den öffentlichen Start statt danach. Den öffentlichen Start verlegen wir vom Advent auf den **7. Januar 2027**.

Ergebnis: 6 statt 10 Arbeitspakete bis zum Start, davon 2 kleiner geschnitten. Der Entscheidungspunkt verschiebt sich auf Anfang März 2027, dann allerdings mit acht Wochen echter öffentlicher Daten statt sieben Wochen über die Feiertage.

## Situation, Komplikation, Frage

- **Situation:** Entschieden ist Option C. AP1 (Sportarten, Städte) und AP2 (Aktivität eintragen) sind gemergt. Die App hat Events, Zusagen, Chats, Erinnerungen, Push, Communities und Folgen.
- **Komplikation:** Die Arbeit macht eine Person mit KI-Unterstützung, und dieselbe Person soll in München Organisatorinnen gewinnen. 08 plant zehn Arbeitspakete in zehn Wochen und daneben Pilotarbeit. Die Reihenfolge folgt dem Bild der App, nicht dem Risiko.
- **Kernfrage:** In welcher Reihenfolge und in welchem Umfang muss gebaut werden, damit bis Anfang 2027 belastbar feststeht, ob Organisatorinnen in München ihre Gruppen mit OHealth führen?

## Prüfung der Strategie

### Was hält

| These | Urteil | Begründung |
| --- | --- | --- |
| Eine App statt zwei (H1, H5) | **Hält** | Zwei Kaltstarts bei einer Person sind nicht zu tragen. Die Module sind getrennt, die Option bleibt offen |
| Gemeinsamer Sport ist ein wachsender Bedarf (H2) | **Hält** | Gut belegt (03). Run-Clubs, Bouldern und Vereine wachsen |
| Training als Gewohnheitsebene (H4) | **Plausibel, ungeprüft** | Richtig als Hypothese. Sie wird aber erst messbar, wenn „Warst du dabei?" läuft und echte Gruppen Events haben |
| Organisatorinnen sind der Hebel (H6, H7) | **Plausibel, ungeprüft** | Die Zahl „10 bis 30 Mitglieder je Organisatorin" ist eine Annahme. Ob sie von WhatsApp wechseln, ist **die** offene Frage des ganzen Vorhabens |

### Wo die Analyse zu weich ist

1. **Die Bewertung in 06 ist eine Selbsteinschätzung.** C bekommt eine 5 bei Wachstum, ohne dass eine einzige Organisatorin befragt wurde. Die Robustheitsprüfung verschiebt nur Gewichte, nicht die Punktwerte selbst. Das Ergebnis „C vor E" ist deshalb nicht so stabil, wie es aussieht. Der Unterschied zwischen C und E steht und fällt mit H4.
2. **Strava wird als Laufkonkurrenz unterschätzt.** Strava hat seit 2026 einen Event-Bereich und einen Hub für Club-Organisatoren (03). Ein Lauftreff, der schon einen Strava-Club hat, wechselt nur für Werkzeuge, die Strava nicht hat: wiederkehrende Termine mit Zusage, Warteliste, Gruppenchat, Vorschau ohne Konto. Beim Bouldern ist der Druck durch Strava gering.
3. **Push auf dem iPhone ist eine stille Annahme.** Web-Push funktioniert auf iOS nur, wenn die App zum Home-Bildschirm hinzugefügt wurde. Wer aus WhatsApp kommt, öffnet die App im Browser. Erinnerungen und „Warst du dabei?" erreichen diese Menschen dann nicht. Der Plan nennt das nirgends.
4. **Die Zielwerte sind ehrgeizig.** 30 % Aktive in Woche 4 liegt über den besten Werten aus 03 (25 %). Es kann gelingen, weil Gruppen an feste Termine gebunden sind, sollte aber als Ziel mit Untergrenze geführt werden und nicht als einzelne Zahl.
5. **Die Herkunft neuer Nutzer wird zu spät erfasst.** `signup_source` ist erst in AP9 vorgesehen, also nach dem öffentlichen Start. Wer sich vorher registriert, fehlt in der wichtigsten Kennzahl dauerhaft.

### Wo der Plan falsch priorisiert

| AP in 08 | Problem | Folge |
| --- | --- | --- |
| AP4 Bestwerte je Sportart | Dient den Selbstoptimierern, die 04 als „gering fürs Wachstum" einstuft. Passt nicht zu „Konstanz statt Leistung" | **Nach den Pilot** |
| AP5 Einstieg mit Vorschlägen | Im Kaltstart gibt es wenige Gruppen, ein Vorschlags-Einstieg zeigt dann Leere. Ziel ist, dass mehr als die Hälfte über einen Link kommt, und diese Menschen überspringen den Einstieg ohnehin | **Schlank**: Sportarten und Stadt wählen, danach „Entdecken" |
| AP8 Event-Link und Serien | Kern der Organisatorin, liegt aber in Abschnitt 4 direkt vor dem Start. Kein Lauftreff legt jede Woche ein Event von Hand an | **Ganz nach vorn** |
| AP9 Kennzahlen, AP10 Tests | Kommen nach dem öffentlichen Start | **Vor den Start** |
| Rechtstexte (`docs/LEGAL.md`) | Betreiberangaben, Verträge zur Auftragsverarbeitung, Mindestalter und Nutzungsbedingungen fehlen und stehen in keinem AP | **Startbedingung** |

### Zeitplan

- **Ein öffentlicher Start am 23. November bis 4. Dezember** fällt in die Vorweihnachtszeit. Dann sinkt die Bereitschaft, eine neue Gewohnheit anzufangen, und für Fehler bleiben zwei Wochen vor der Pause.
- **Der 7. Januar 2027** verbindet den Start mit den Neujahrsvorsätzen, die 08 ohnehin nutzen will. Bis dahin läuft ein geschlossener Pilot mit drei bis acht Organisatorinnen. Der fängt die gröbsten Fehler ab, bevor Fremde kommen.
- **Kapazität:** Rund ein Drittel der Zeit muss in Gespräche und in die Betreuung der Organisatorinnen gehen. Das Bauen bekommt deshalb höchstens zwei Drittel, nicht die volle Woche wie in 08.

## Neu geschnittene Arbeitspakete

Leitidee: **Organisatorin gewinnen → Schleife schließen → sicher starten → aufräumen.** Größen wie in 08 (S = ein Tag, M = zwei bis drei Tage, L = vier bis fünf Tage).

| Neu | Inhalt | Aus 08 | Größe |
| --- | --- | --- | --- |
| **N0** | Fundament: AP0 und Nachtrag zu AP2 | AP0, AP2 | S |
| **N1** | Events mit Sportart, Dauer und wöchentlicher Wiederholung | AP3 (Teil), AP8 (Teil) | M |
| **N2** | Öffentlicher Event-Link, Zusage nach Registrierung, Herkunft messen | AP8 (Teil), AP9 (Teil) | M |
| **N3** | „Warst du dabei?" | AP3 | M |
| **N4** | Vertrauen und Recht: Melden, Mitglieder entfernen, Nutzungsbedingungen, Mindestalter | AP7, LEGAL | M |
| **N5** | Heute, Entdecken, Gruppen, Chats mit schlankem Einstieg | AP5 (schlank), AP6 | M |
| **N6** | Kennzahlen und Ende-zu-Ende-Tests vor dem Start | AP9, AP10 | M |
| Später | Warteliste, Bestwerte je Sportart, Vorschläge für Menschen, Stadtwechsel, native Hülle, Zahlungen | AP4, Teile von AP5 und AP8 | nach Daten |

### N0 Fundament (S)

- **Nutzerin:** AP0 abschließen. Die Migrationen `20261005160000_sports_and_cities` und `20261005180000_log_activity` einspielen, mit zwei Testkonten durchklicken, Tag `v0.2.0` setzen.
- **Nachtrag AP2** aus der Code-Analyse:
  - Die KI sieht über MCP Sportart, Dauer und Distanz einer Aktivität. Die Texte sagen „Aktivität" statt „Workout".
  - Das Formular „Aktivität eintragen" bleibt nach einem Netzfehler nicht hängen und bietet „Erneut senden" an. Die ID vom Gerät verhindert Doppelte.
  - Fehlermeldungen unterscheiden Datum in der Zukunft, zu lange Notiz und unpassende Angaben zur Sportart.
  - `private.check_activity_fields` läuft ohne `security definer` (neue Migration und Test).
  - `docs/ROADMAP.md`: PR-Nummer, Stand der Schritte 18 und 19, „Datum ändern" ist für Aktivitäten erledigt. `docs/UEBERGABE.md` ist veraltet und wird entfernt.
- **Fertig, wenn:** Produktion läuft auf dem aktuellen Stand, alle Prüfungen sind grün, ein Test belegt die neuen MCP-Angaben.

### N1 Events für Organisatorinnen (M)

Am 5. Oktober 2026 in zwei Schritte geteilt (mit der Nutzerin abgestimmt):

- **N1 Events je Sportart:** Events bekommen Sportart, Dauer und je nach Sportart eigene Angaben: Trainingsplan bei Kraft, Distanz, Höhenmeter und Tempo bei Ausdauer, Niveau für alle. Die Sportart ist aus der Community vorbelegt. Aus der Dauer ergibt sich das Ende des Events. Bei „Aktivität eintragen“ mit Krafttraining stehen die eigenen Trainingspläne direkt zur Auswahl. Kosten pro Person bleiben bewusst in der Notiz, bis Zahlungen kommen.
- **N1b Wöchentliche Wiederholung:** „Jeden Dienstag, 18:30" legt die nächsten acht Termine an (`series_id`). Einen Termin oder die ganze Reihe ändern oder absagen. Die Reihe wird automatisch fortgeschrieben.
- **Nicht** in N1: Warteliste. Die Obergrenze (`max_participants`) gibt es schon. Ob eine Warteliste gebraucht wird, zeigen die Gespräche.
- **Fertig, wenn:** Eine Organisatorin legt einen wöchentlichen Lauftreff in unter einer Minute an. Datenbanktests für Reihe, Ändern und Absagen (nur Verwaltung der Community) sowie für die Rechte von KI-Tokens.

### N2 Öffentlicher Event-Link (M)

- `/e/[id]` ohne Anmeldung, nur für Events in öffentlichen Communities. Zu sehen sind Titel, Zeit, Ort, Sportart und Zahl der Zusagen, ohne Namen. Dazu eine Vorschau beim Teilen (Open Graph).
- „Zusagen" führt durch die Registrierung und sagt danach automatisch zu. Danach gibt es einen Kalendereintrag und einen Hinweis auf „Zum Home-Bildschirm", damit Push auf dem iPhone funktioniert.
- `profiles.signup_source` (Event-Link, Gruppen-Link, direkt) wird **ab jetzt** erfasst.
- Die Teilen-Funktion am Event nutzt den neuen Link.
- **Fertig, wenn:** Ein Link in WhatsApp zeigt eine Vorschau, und Registrieren endet mit Zusage. Ein Datenbanktest belegt, dass die öffentliche Ansicht keine Personen und keine Events aus privaten Communities preisgibt.

### N3 „Warst du dabei?" (M)

- Wie AP3: Nach dem Ende eines Events sehen alle mit Zusage die Frage. Bei „Ja" entsteht eine Aktivität (`source = event`, höchstens eine je Person und Event), die sich danach bearbeiten lässt. Die Organisatorin sieht, wer dabei war.
- Die Frage erscheint auf „Heute" **und** in der Liste der Mitteilungen. Wer keinen Push hat, sieht sie also beim nächsten Öffnen.
- **Fertig, wenn:** Datenbanktests belegen: Nur Teilnehmende können bestätigen, nicht doppelt und erst nach dem Ende. Das bestätigte Event zählt im Wochenraster und in der Rangliste.

### N4 Vertrauen und Recht (M)

- Melden von Personen, Nachrichten und Events mit Grund. Mehrfach gemeldete Nachrichten werden ausgeblendet. Die Verwaltung einer Community kann Mitglieder entfernen.
- Registrierung mit Bestätigung des Mindestalters und der Nutzungsbedingungen. Die Seite mit den Nutzungsbedingungen wird gebaut, der Text wird geprüft.
- **Nutzerin:** Betreiberangaben in `src/lib/legal.ts` eintragen, Verträge zur Auftragsverarbeitung mit Supabase und Vercel abschließen, rechtliche Prüfung (`docs/LEGAL.md`).
- **Fertig, wenn:** Der Entwurfs-Hinweis auf Impressum und Datenschutz ist weg. Datenbanktests für Meldungen und das Ausblenden ab der Schwelle.

### N5 Navigation und schlanker Einstieg (M)

- Tabs: **Heute, Entdecken, Gruppen, Chats**. „Entdecken" zeigt die Events der nächsten 14 Tage in München mit Filter nach Sportart und darunter Communities. „Vorlagen" wandert in den Kraft-Modus. Alte Adressen leiten weiter. Dazu kommt die vereinheitlichte Adresse `/aktivitaet/[id]` statt `/workouts/[id]`.
- Einstieg nur für Menschen ohne Link: Sportarten und Stadt wählen, danach „Entdecken". Wer eine andere Stadt wählt, kommt auf die Warteliste (`city_interest`, eine Tabelle, keine eigene Oberfläche).
- `DESIGN.md` beschreibt die neue Tab-Leiste.
- **Fertig, wenn:** Alle bisherigen Seiten sind erreichbar. Ein neues Konto ohne Link sieht nach höchstens 60 Sekunden Events oder Communities in München.

### N6 Messen und absichern (M)

- Die sechs Kennzahlen aus 07 als Auswertungen im Schema `private`, ohne Tracking-Dienste. Dazu als siebte Kennzahl der Anteil mit eingeschaltetem Push.
- Playwright-Tests in der CI bei 390 und 1280 px für vier Abläufe: registrieren über einen Event-Link mit Zusage; Event mit Wiederholung planen; „Warst du dabei?"; Aktivität eintragen mit Wirkung auf Wochenraster und Rangliste.
- **Fertig, wenn:** Die Tests laufen bei jedem Pull Request grün, und die Kennzahlen lassen sich mit einer Abfrage pro Woche ablesen.

### Bewusst nach dem Pilot

| Thema | Warum später | Auslöser für „jetzt doch" |
| --- | --- | --- |
| Warteliste | `max_participants` reicht für den Anfang | Mehr als ein Drittel der Events im Pilot ist voll |
| Bestwerte je Sportart (AP4) | Selbstoptimierer sind nicht der Hebel | Selbstoptimierer halten länger als die anderen Gruppen |
| Vorschläge für Menschen, Stadtwechsel | Im Kaltstart gibt es zu wenig Inhalt | Mehr als 200 Aktive in München oder zweite Stadt mit mehr als 100 auf der Warteliste |
| E-Mail-Erinnerung | Neuer Dienst mit Kosten und Datenschutzfragen | Push ist bei weniger als 30 % der Aktiven eingeschaltet |
| Native Hülle | Aufwand ohne Pilotbeleg | Push-Lücke auf iOS bremst nachweislich |

## Gegenprüfung des neuen Plans

| Einwand | Antwort |
| --- | --- |
| „Ohne Einstieg und Navigation ist die App für Neue unklar." | Die ersten Nutzer kommen fast alle über eine Organisatorin und einen Link. Bevor Fremde kommen, also vor dem 7. Januar, ist N5 fertig |
| „Ein öffentlicher Link lädt zu Missbrauch ein." | Nur Events in öffentlichen Communities, ohne Namen und ohne Chat. Zusagen und Chat erst nach der Registrierung. Melden folgt in N4 vor dem öffentlichen Start |
| „Der Start im Januar verliert zwei Monate." | Der geschlossene Pilot beginnt Mitte November, also früher als in 08. Nur der Start für alle wandert, und zwar in den Monat mit der höchsten Bereitschaft für neue Gewohnheiten |
| „Das Tor nach den Gesprächen bremst." | Es kostet keine Bauzeit, denn N0 bis N2 brauchen wir in jedem Fall. Es verhindert, dass N3 bis N6 für eine Zielgruppe gebaut werden, die nicht wechselt |
| „Für Kraftsportler passiert nichts mehr." | Ihr Modus bleibt vollständig erhalten. Für den Pilot werben wir sie bewusst nicht an, das ist eine Fokusentscheidung |
| „Ist Laufen gegen Strava klug?" | Laufen bringt die meisten organisierten Treffen. Die Abgrenzung liegt bei den Werkzeugen der Organisatorin, nicht beim Tracking. Bouldern ist der zweite Schwerpunkt mit wenig Strava-Druck |

## Zeitplan (Vorschlag)

| Abschnitt | Zeitraum | Produkt | Pilot München |
| --- | --- | --- | --- |
| 0 | 5.–9. Okt. | N0 | 30 Kontakte. Erste Gespräche **jetzt** beginnen |
| 1 | 12.–23. Okt. | N1, N2 | 10 Gespräche mit Leitfragen: Wie läuft das heute? Was nervt an WhatsApp und Strava? Würdest du ein wiederkehrendes Treffen hier führen? |
| **Tor 1** | 26. Okt. | | **Mindestens 3 von 10 sagen „ja, ich probiere es mit meiner Gruppe".** Sonst stoppen und Zielgruppe oder Versprechen überdenken |
| 2 | 26. Okt.–6. Nov. | N3, Beginn N4 | Drei Organisatorinnen richten ihre Reihe ein |
| 3 | 9.–20. Nov. | N4, N5 | Geschlossener Pilot mit 3 Gruppen |
| 4 | 23. Nov.–4. Dez. | N5, N6 | Auf 6 bis 8 Gruppen erweitern |
| 5 | 7.–18. Dez. | Fehler beheben, Rechtstexte abschließen | Rückmeldungen einarbeiten |
| **Tor 2** | 18. Dez. | | Startbedingungen erfüllt: Rechtstexte geprüft, Tests grün, Melden aktiv, mindestens 5 Gruppen mit Events im Januar |
| 6 | 7. Jan. 2027 | **Öffentlicher Start** | Aktion „Gemeinsam ins neue Jahr" mit den Gruppen |
| Entscheidung | 1. März 2027 | Auswertung nach 07 | Weitermachen, nachschärfen oder neu entscheiden |

Zwischen 21. Dezember und 3. Januar ist keine Entwicklung geplant.

## Kennzahlen mit Untergrenze

| Kennzahl | Ziel | Untergrenze, ab der neu entschieden wird |
| --- | --- | --- |
| Aktive Gruppen mit mindestens einem Event pro Woche | 10 | 5 |
| Zusagen pro Event | ≥ 5 | 3 |
| Neue Nutzer über Event- oder Gruppen-Link | ≥ 50 % | 30 % |
| In Woche 4 noch aktiv | ≥ 30 % | 15 % |
| Aktive mit Trainingstagen aus Events **und** eigenen Aktivitäten (H4) | ≥ 40 % | 20 % |
| Organisatorinnen mit „ja" oder „vielleicht" zur Bezahlung | ≥ 3 von 10 | 1 von 10 |
| Aktive mit eingeschaltetem Push | ≥ 50 % | 30 % (dann E-Mail-Erinnerung) |

## Entscheidungen

| Nr. | Entscheidung | Datum |
| --- | --- | --- |
| E5 | Reihenfolge **N0 bis N6** statt AP3 bis AP10 | 5. Oktober 2026 |
| E6 | **Öffentlicher Start am 7. Januar 2027**, geschlossener Pilot ab Mitte November | 5. Oktober 2026 |
| E7 | Pilot-Schwerpunkt **Laufen, Bouldern und Volleyball**. Krafttraining ohne eigene Werbung | 5. Oktober 2026 |
| E8 | **Tor 1** nach zehn Gesprächen, wie oben beschrieben | 5. Oktober 2026 (Vorschlag übernommen) |

**Warum Volleyball und nicht Padel oder Squash.** Gewünscht war eine Ballsportart. Volleyball passt am besten zum Kern der App: offene Spielrunden mit 8 bis 20 Leuten, die sich jede Woche zur selben Zeit treffen, drinnen im Winter und als Beachvolleyball im Sommer. Das sind genau die wiederkehrenden Events mit Zusage, für die N1 und N2 gebaut werden. Padel und Squash spielen meist zwei bis vier Leute auf einem gebuchten Platz, und die Buchung läuft über die Anlage (bei Padel oft Playtomic). Dort ersetzt OHealth weniger WhatsApp-Aufwand. Beide lassen sich trotzdem eintragen und planen. Squash kommt dafür mit N0 in den Katalog. Melden sich im Pilot Padel-Gruppen mit festen offenen Runden, kommen sie ohne Umbau dazu.
