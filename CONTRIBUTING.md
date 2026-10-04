# Mitarbeiten an OHealth

Kurzfassung für alle, die in diesem Repo mitarbeiten, Menschen wie KI-Assistenten. Verbindlich sind `docs/ENGINEERING.md` und `docs/DESIGN.md`, dieses Dokument fasst den Ablauf zusammen.

## Einstieg

1. Einladung als Collaborator im GitHub-Repo annehmen.
2. Repo klonen und einrichten wie in `README.md` beschrieben. Jede Person hat ihre eigene `.env.local`.
3. Für Datenbankarbeit Docker und die Supabase CLI installieren. `supabase db start` startet eine lokale Datenbank mit allen Migrationen, `npm run test:db` führt die Datenbanktests aus.
4. Zugang zu Vercel oder Supabase gibt es nur, wenn die Aufgabe ihn braucht, und dann mit eigenem Konto.

## Ablauf je Aufgabe

1. **Issue:** Die Aufgabe steht als GitHub Issue. Wer sie übernimmt, weist sich das Issue zu, damit nicht zwei Personen dasselbe bauen.
2. **Branch:** Von aktuellem `main` einen Branch anlegen, zum Beispiel `feat/gruppen-chat` oder `fix/login-facebook`.
3. **Arbeiten:** Kleine Commits. Vor dem Push laufen `npm run typecheck`, `npm run lint`, `npm test` und `npm run build`, bei Datenbankänderungen auch `npm run test:db`.
4. **Preview:** Jeder Push erzeugt bei Vercel eine Preview-Adresse. Dort wird die Änderung geprüft, bei Oberflächen bei 390 px und 1280 px.
5. **Pull Request:** Nach `main`, mit Verweis auf das Issue (`Closes #12`). Die Beschreibung sagt, was sich ändert, wie es getestet wurde und was nicht geprüft werden konnte.
6. **Review:** Die andere Person prüft und gibt ein Approval. Fragen und Änderungswünsche stehen als Kommentare im Pull Request.
7. **Merge:** Wer den Pull Request geöffnet hat, mergt per Squash-Merge, sobald CI grün und Approval da ist. Der Merge geht automatisch in Produktion.

## Regeln für die Zusammenarbeit

- Kein direkter Push auf `main`, auch nicht für Kleinigkeiten.
- Fremde Branches werden nicht umgeschrieben (kein Rebase, kein Force-Push). Wer helfen will, kommentiert oder öffnet einen eigenen Pull Request.
- Vor dem Merge `main` in den eigenen Branch holen und Konflikte dort lösen.
- Neue Migrationen bekommen den aktuellen Zeitstempel im Dateinamen. Hat jemand anderes inzwischen eine Migration gemergt, prüfen, dass beide in dieser Reihenfolge zusammenpassen.
- Zugangsdaten, Secrets und Schlüssel werden nie ins Repo geschrieben und nie per Chat oder E-Mail weitergegeben. Sie stehen nur in Vercel, Supabase und der eigenen `.env.local`.
- Texte der Oberfläche sind Deutsch, Code und Bezeichner Englisch.

## Wenn etwas schiefgeht

- Produktion ist kaputt: in Vercel das letzte gute Deployment per „Instant Rollback" zurückholen und im Team Bescheid geben.
- Eine gemergte Änderung war falsch: auf GitHub beim Pull Request „Revert" wählen.
- Die Datenbank betreffend: nichts direkt in Produktion ändern. Erst absprechen, dann mit einer neuen Migration beheben.

Einzelheiten zu Branches, Releases und Rollback stehen in `docs/ENGINEERING.md`, Abschnitt 8.
