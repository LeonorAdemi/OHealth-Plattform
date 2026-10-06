# Kennzahlen des Pilots

`private.pilot_metrics` für die wöchentliche Auswertung. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: Migration `pilot_metrics`, Test 31.

## Daten und Regeln

- **Kennzahlen.** `private.pilot_metrics(tag)` liefert die Kennzahlen des Pilots für die Woche, in der der Tag liegt (Montag bis Sonntag, deutsche Zeit), in einer Zeile: aktive Gruppen, Zusagen pro Event (ohne die planende Person, nur geteilte Events), neue Nutzer und Anteil über einen Link (`private.signup_sources`), Bindung in Woche 4, Anteil der Aktiven mit Event- und eigenen Aktivitäten in den letzten vier Wochen (H4) und Anteil der Aktiven mit Push. Aktiv ist, wer in der Woche eine Aktivität gemacht, zugesagt oder geplant oder im Chat geschrieben hat. Nur Summen und Anteile, keine Personen; kein Tracking-Dienst. Abgelesen wird einmal pro Woche im SQL-Editor (`select * from private.pilot_metrics();`), ausführbar nur für den Betreiber, nicht für Angemeldete, Gäste, KI oder den Service-Schlüssel. Die Zahl mit Push gilt für den Zeitpunkt der Abfrage, weil Geräte keinen Verlauf haben. Die Kennzahl zur Bezahlung kommt aus den Gesprächen, nicht aus der Datenbank (Migration `pilot_metrics`, Test 31).
