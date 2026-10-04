# Rechtstexte: Stand und offene Punkte

Impressum (`/impressum`) und Datenschutzerklärung (`/datenschutz`) sind technisch fertig, aber inhaltlich ein Entwurf. Solange sie nicht vollständig und geprüft sind, zeigen beide Seiten einen roten Entwurfs-Hinweis.

Die Texte beschreiben, was die App tatsächlich mit Daten tut. Sie sind keine Rechtsberatung und ersetzen keine Prüfung durch eine fachkundige Person.

## Was der Betreiber eintragen muss

Alle Angaben stehen an einer Stelle: `src/lib/legal.ts`.

| Feld | Inhalt |
| --- | --- |
| `name` | Vor- und Nachname oder Firma mit Rechtsform |
| `street`, `city` | Ladungsfähige Anschrift, kein Postfach |
| `email` | Kontaktadresse, die tatsächlich gelesen wird |
| `phone` | Optional |
| `supervisoryAuthority` | Zuständige Datenschutz-Aufsichtsbehörde |
| `lastUpdated` | Datum der letzten inhaltlichen Änderung |
| `reviewed` | Erst nach rechtlicher Prüfung auf `true` setzen |

Der Entwurfs-Hinweis verschwindet erst, wenn die Pflichtangaben gefüllt sind und `reviewed` auf `true` steht.

## Was vor den ersten echten Nutzern zu klären ist

Diese Punkte sind Rechtsfragen und bewusst nicht im Code entschieden:

- [ ] **Impressumspflicht.** Gilt sie für dieses Angebot, und reicht E-Mail als Kontaktweg oder braucht es einen zweiten?
- [ ] **Gesundheitsdaten.** Sind Trainingsdaten in dieser Form besondere Kategorien nach Art. 9 DSGVO? Spätestens mit dem Physio- oder Health-Modul (Schmerz, Stimmung, Ernährung) ist das neu zu bewerten und eine ausdrückliche Einwilligung vorzusehen.
- [ ] **Auftragsverarbeitung.** Verträge zur Auftragsverarbeitung mit Supabase und Vercel abschließen und ablegen.
- [ ] **Drittlandübermittlung.** Vercel sitzt in den USA. Rechtsgrundlage der Übermittlung prüfen und im Text benennen.
- [ ] **Anmeldeanbieter.** Rolle von Apple, Google und Facebook bei der Anmeldung prüfen und den Text bei Bedarf ergänzen.
- [ ] **Sicherungskopien.** Wie lange bleiben gelöschte Daten in Sicherungen von Supabase erhalten? Im Abschnitt zur Speicherdauer ergänzen.
- [ ] **Mindestalter.** Ab welchem Alter darf die App genutzt werden, und wird das bei der Registrierung abgefragt?
- [ ] **KI-Zugriff über MCP.** Die Weitergabe an den vom Nutzer gewählten KI-Anbieter geschieht auf seine Veranlassung und nach Bestätigung. Prüfen, ob die Bestätigungsseite als Einwilligung ausreicht, wie die Rolle des KI-Anbieters zu bewerten ist (eigener Verantwortlicher) und ob der Hinweis auf eine mögliche Verarbeitung außerhalb der EU genügt.
- [ ] **Nutzungsbedingungen.** Braucht es eigene Bedingungen, etwa zum Umgang miteinander in Gruppen?

## Regel für die Weiterentwicklung

Ändert sich die Datenverarbeitung (neue Tabelle mit Nutzerdaten, neuer Dienstleister, neues Modul), wird die Datenschutzseite im selben Schritt angepasst und `lastUpdated` gesetzt. Die Liste der Anmeldeanbieter und der Passkey-Hinweis folgen automatisch der Konfiguration.
