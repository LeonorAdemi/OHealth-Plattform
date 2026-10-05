# 10 Erlösmodell: Wie OHealth Geld verdient

Stand: 5. Oktober 2026. Baut auf 03 (Markt), 04 (Zielgruppen), 07 (Erlös-Ausblick) und 09 (Zeitplan bis März 2027) auf. Zahlen aus Quellen sind belegt (siehe [Quellen](quellen.md)), Schätzungen sind als Annahme gekennzeichnet. Keine Rechts- oder Steuerberatung.

## Die Antwort zuerst

**Kurzfristig wird OHealth kein nennenswertes Geld aus der App verdienen, und das ist richtig so.** Bis zur Entscheidung im März 2027 ist jede Stunde, die in Bezahlfunktionen geht, eine Stunde weniger für das eine, was den späteren Umsatz überhaupt möglich macht: Organisatorinnen, die ihre Gruppen in OHealth führen.

1. **Kurzfristig (bis März 2027): Geld ohne Code.**
   - Ein bis drei Sponsoren aus München für die Aktion „Gemeinsam ins neue Jahr“ im Januar, Annahme: 1.000 bis 3.000 € je Partner.
   - Förderprogramme für Gründungen prüfen.
   - Bei zwei bis drei Organisatorinnen testen, ob bezahlte Events gewünscht sind: Ein Zahlungslink von Stripe steht in der Notiz des Events, es wird nichts gebaut.
2. **Mittelfristig (2027): Zahlungen in der App als Hauptquelle.**
   - Organisatorinnen kassieren Hallenmiete, Kursgebühr oder Startgeld direkt bei der Zusage. OHealth behält eine kleine Gebühr, wie Spond: 2,5 % + 0,20 € je Zahlung, Stripe kostet davon etwa 1,5 % + 0,25 €.
   - Dazu ein freiwilliges Paket für Organisatorinnen (Annahme: 9 bis 15 € im Monat) und eine Partnerschaft für Hallen und Studios.
3. **Langfristig (ab 2028): Skalierung und B2B.**
   - Eine Stadt allein trägt kein Unternehmen. Mit zehn Städten und Angeboten für Firmen (Firmen-Communities), später für Physios und Coaches, entsteht ein tragfähiges Geschäft.
   - Ein Abo für Einzelne kommt zuletzt.

**Was nie kommt:** Werbebanner, Verkauf von Daten, Gebühren für Teilnehmende. Das würde das Versprechen „ruhig, privat, für alle kostenlos“ brechen und das Wachstum über Einladungen stoppen (07).

## Ausgangslage

- **Wer bezahlt?** Laut 04 haben Organisatorinnen eine mittlere bis hohe Zahlungsbereitschaft, Mitmacher eine geringe, Selbstoptimierer eine mittlere. Hevy und Strava sind aber stark und teils kostenlos.
- **Wann?** Laut 09 kommen echte Nutzer erst mit dem geschlossenen Pilot ab Mitte November 2026, der öffentliche Start ist am 7. Januar 2027. Vorher gibt es niemanden, der zahlt.
- **Kosten heute:**
  - Supabase und Vercel laufen im kostenlosen Tarif.
  - Mit echten Nutzern werden die bezahlten Tarife nötig, Annahme: zusammen 50 bis 100 € im Monat.
  - Die eigentlichen Kosten sind die Zeit der Gründerin und später Rechtsberatung, Annahme: einmalig 1.000 bis 2.000 € für die Rechtstexte.
- **Lehre aus Meetup:** Gebühren für Organisatoren erst einführen, wenn die Werkzeuge klar mehr wert sind als WhatsApp, und nie nachträglich verteuern. Meetup verlangt seit 2024 ab 29,99 $ im Monat, und Organisatoren wandern ab (03).

## Die Erlösquellen im Vergleich

| Quelle | Wer zahlt | Vergleich am Markt | Passt zu OHealth | Aufwand | Wann |
| --- | --- | --- | --- | --- | --- |
| **A Zahlungen für Events** | Teilnehmende über die Organisatorin, OHealth behält eine Gebühr | Spond: 2,5 % + 0,20 € je Zahlung, davon Stripe 1,5 % + 0,25 € je Karte bzw. 0,35 € je SEPA-Lastschrift | Sehr gut: löst echten Schmerz (Geld einsammeln per PayPal oder bar), bindet Gruppen | Mittel (Stripe Connect, Rechtstexte, Rückerstattung bei Absage) | 2027 |
| **B Paket für Organisatorinnen** | Organisatorinnen, Vereinsabteilungen | Meetup ab 29,99 $ im Monat, Eversports Manager ab 49 € im Monat | Gut, wenn freiwillig: Statistiken (wer kommt regelmäßig), mehrere Verwalter, eigene Seite, Export, Warteliste | Gering bis mittel | 2027 |
| **C Partner-Standorte** | Boulderhallen, Studios, Padel-Anlagen | Annahme: 49 bis 99 € im Monat für Sichtbarkeit und Community-Abende | Gut: Hallen wollen volle Community-Abende, das Werkzeug liefert sie | Gering | 2027 |
| **D Sponsoring** | Sportmarken, Getränke, Händler | Marken bezahlen Run-Clubs zunehmend für Partnerschaften und Proben | Gut, wenn ruhig: gekennzeichnete Partner-Events statt Banner | Kein Code, nur Vertrieb | **Sofort** |
| **E Abo für Einzelne** | Selbstoptimierer | Strava 10,99 € im Monat in Deutschland, Hevy Pro 23,99 $ im Jahr, bei Strava zahlen schätzungsweise rund 5 % der aktiven Nutzer | Später: Auswertungen über alle Sportarten, KI-Trainingstipps über MCP (gibt es schon) | Mittel | Ab 2028 |
| **F Firmen-Communities (B2B)** | Arbeitgeber (Gesundheitsmanagement) | Firmenfitness wächst: rund 1,5 Mio. Menschen nutzen Anbieter wie EGYM Wellpass oder Urban Sports Club, +21 % in einem Jahr | Gut: geschlossene Gruppen, Firmenlauf, Teamwochen mit Trainingstagen statt Leistung | Hoch (Vertrieb, Verträge) | Ab 2028 |
| **G Physio und Coaching** | Coaches, Physios je Klient | Gruppenart Coaching gibt es schon | Sehr gut, passt zum Namen „OHealth“ | Hoch (Gesundheitsdaten, Art. 9 DSGVO, LEGAL.md) | Ab 2028 |
| **H Werbung, Daten** | Werbetreibende | | **Nein**: widerspricht Privatsphäre und Design | | Nie |

## Was realistisch drin ist

**Annahmen für München Ende 2027:** 3.000 Aktive und 60 aktive Gruppen. Die Zahlen sind Größenordnungen, keine Prognose.

| Quelle | Rechnung (Annahme) | Pro Jahr |
| --- | --- | --- |
| A Zahlungen | 20 Gruppen × 12 bezahlte Events im Monat × 10 Teilnehmende × 8 € = 19.200 € Zahlungsvolumen im Monat; davon bleiben nach Stripe etwa 2 % | ca. 4.600 € |
| B Paket Organisatorinnen | 15 × 12 € × 12 Monate | ca. 2.200 € |
| C Partner-Standorte | 8 × 79 € × 12 Monate | ca. 7.600 € |
| D Sponsoring | 4 Aktionen × 2.500 € | ca. 10.000 € |
| E Abo Einzelne | 3.000 × 4 % × 30 € | ca. 3.600 € |
| **Summe München** | | **ca. 28.000 €** |

**Was das bedeutet:**
- **Eine Stadt trägt kein Gehalt.** Selbst mit gutem Pilot bleibt München ein Beweis, kein Geschäft.
- **Hebel 1: weitere Städte.** Sie kosten fast keinen Code („eine Stadt ist eine Zeile“, 08), aber Zeit für Organisatorinnen vor Ort. Zehn Städte ergeben grob 300.000 € im Jahr.
- **Hebel 2: B2B.** Annahme: 20 Firmen × 200 Beschäftigte × 2 € im Monat = rund 96.000 € im Jahr, mit einem Bruchteil der Nutzerzahl. Dafür ist der Vertrieb aufwendig, und es braucht ein eigenes Angebot.
- **Hebel 3: Zahlungen.** Sie wachsen mit jedem bezahlten Kurs und werden umso wertvoller, je mehr Vereine und Studios dazukommen. Bei Spond laufen so rund 200 Mio. € im Jahr durch (03).

## Fahrplan

| Phase | Zeitraum | Was | Code | Ziel |
| --- | --- | --- | --- | --- |
| **1 Ohne Code** | jetzt bis März 2027 | Sponsoren für die Januar-Aktion ansprechen (Münchner Sporthändler und Marken, Getränke, Laufschuhe); Förderprogramme prüfen; in den zehn Gesprächen bis Tor 1 nach Zahlungsbereitschaft fragen; zwei bis drei Organisatorinnen kassieren testweise per Stripe-Zahlungslink in der Notiz | keiner | 2.000 bis 6.000 € (Annahme), Beleg für Zahlungsbedarf |
| **2 Zahlungen** | April bis Juni 2027, nach der Entscheidung | Bezahlte Events mit Stripe Connect: Preis je Event, Zahlung bei Zusage, Rückerstattung bei Absage, Auszahlung an die Organisatorin. Gebühr trägt anfangs die Organisatorin, wie bei Spond | neues Arbeitspaket (L) | Erste wiederkehrende Einnahmen |
| **3 Organisatorinnen und Hallen** | Sommer 2027 | Freiwilliges Paket (Statistiken, mehrere Verwalter, Export, Warteliste) und Partner-Standorte | M | Zweite Einnahmequelle, Bindung der Gruppen |
| **4 Skalierung** | ab Herbst 2027 | Zweite und dritte Stadt nach der Warteliste (`city_interest`) | gering | Umsatz wächst mit Städten |
| **5 B2B und Gesundheit** | ab 2028 | Firmen-Communities; Physio- und Coaching-Modul mit Einwilligungen für Gesundheitsdaten; Abo für Einzelne mit KI-Tipps | groß | Tragfähiges Geschäft |

**Was davon in die Arbeitspakete gehört:**
- Bis zum öffentlichen Start ändert sich an N2 bis N6 nichts.
- Nur eines kommt früher: Die Herkunft neuer Nutzer (N2) misst auch, welche Gruppen und Sponsoren Menschen bringen. Das ist das Argument gegenüber Sponsoren.
- Zahlungen werden nach der Entscheidung im März 2027 das erste neue Arbeitspaket, wenn Phase 1 Bedarf belegt.

## Gegenprüfung

| Einwand | Antwort |
| --- | --- |
| „Warum nicht sofort ein Abo?“ | Bei Strava zahlen schätzungsweise nur rund 5 % der aktiven Nutzer. Bei wenigen hundert Nutzern im Pilot wären das ein paar Dutzend Abos. Der Aufwand (Abo-Verwaltung, In-App-Käufe in der nativen App mit 15 bis 30 % Abgabe an Apple und Google) frisst den Ertrag |
| „Sponsoring passt nicht zum ruhigen Design.“ | Es passt, wenn es ein Event mit Partner ist, deutlich gekennzeichnet, ohne Tracking und ohne Banner. Beispiel: „Lauftreff Isar mit Getränken von …“ |
| „Zahlungen sind rechtlich heikel.“ | Stripe Connect übernimmt Prüfung der Zahlungsempfänger, Zahlungsabwicklung und Auszahlung. OHealth hält kein fremdes Geld. Nötig sind trotzdem Nutzungsbedingungen, Regeln für Rückerstattung und eine Prüfung durch Fachleute |
| „Organisatorinnen zahlen nie.“ | Deshalb liegt das Geld vor allem in der Gebühr auf Zahlungen: Sie zahlt sich aus dem Geld der Teilnehmenden, das ohnehin fließt, und ersetzt PayPal-Listen. Das Paket ist freiwillig. Ob überhaupt jemand zahlt, misst die Kennzahl „mindestens 3 von 10 sagen ja oder vielleicht“ (09) |
| „Ist B2B nicht ein anderes Produkt?“ | Teilweise. Firmen-Communities nutzen dieselben Bausteine (private Gruppe, Events, Trainingstage). Neu sind Vertrag, Rechnung und Auswertung für die Firma. Deshalb erst, wenn das Produkt für Gruppen trägt |

## Rechtliches und Steuern (zu klären, keine Beratung)

- **Gewerbe anmelden**, bevor die erste Einnahme kommt, auch bei Sponsoring.
- **Kleinunternehmerregelung:** Seit 2025 gilt sie bis 25.000 € Umsatz im Vorjahr und 100.000 € im laufenden Jahr, jeweils netto. Wird die Grenze im laufenden Jahr überschritten, fällt die Regelung sofort weg.
- **Rechtstexte erweitern:** Impressum mit Betreiberangaben (offen in LEGAL.md), Nutzungsbedingungen mit Regeln für Zahlungen und Rückerstattung, Datenschutz mit Stripe als Dienstleister, Verträge zur Auftragsverarbeitung.
- **Gesundheitsdaten** (Physio, Health) erst mit ausdrücklicher Einwilligung je Datenart (ENGINEERING.md, Abschnitt 5).

## Kennzahlen für das Geld

| Kennzahl | Ziel bis März 2027 |
| --- | --- |
| Sponsoring-Zusagen für Januar | mindestens 1 |
| Organisatorinnen mit „ja“ oder „vielleicht“ zur Bezahlung | mindestens 3 von 10 (wie in 09) |
| Gruppen, die testweise per Zahlungslink kassieren | mindestens 2 |
| Anteil der Events mit Kosten für Teilnehmende (Hallenmiete, Kurs) | messen, entscheidet über Phase 2 |

## Nächste Schritte

1. Liste mit zehn möglichen Sponsoren in München anlegen und eine Seite mit dem Angebot für die Januar-Aktion vorbereiten.
2. Die zwei Fragen zu Bezahlung und Kosten je Event in den Gesprächsleitfaden bis Tor 1 aufnehmen.
3. Förderprogramme für Gründungen in Bayern und im Bund prüfen (Annahme: Zuschüsse oder Stipendien für digitale Gründungen sind möglich, im Einzelnen zu klären).
4. Nach der Entscheidung im März 2027: Arbeitspaket „Zahlungen“ planen, wenn Phase 1 Bedarf belegt.
