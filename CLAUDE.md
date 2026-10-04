# OHealth-Plattform

Plattform für Workout-Tracking und Vergleich in Gruppen, später erweitert um Physio- und Health-Module. Hinweise für Claude Code und andere KI-Assistenten in diesem Repo.

## Pflichtlektüre

- `docs/ENGINEERING.md` vor jeder Änderung am Code. Verbindlich.
- `docs/DESIGN.md` vor jeder Änderung an der Oberfläche. Verbindlich.

Widerspricht eine Aufgabe einem der beiden Dokumente: nachfragen, nicht stillschweigend abweichen.

## Die wichtigsten Regeln in Kürze

- Zugriffsschutz liegt in der Datenbank (Row Level Security), nicht im Frontend.
- Bestehende Migrationen in `supabase/migrations/` werden nie geändert. Jede Änderung ist eine neue Datei mit Datenbanktest.
- Neue Hilfsfunktionen für Zugriffsregeln gehören ins Schema `private`, in Regeln steht `(select auth.uid())`.
- `src/lib/database.types.ts` ist generiert. Nach jeder Migration neu erzeugen, nie von Hand ändern.
- Datenbankzugriffe nur in `src/modules/<name>/queries.ts` und `actions.ts`.
- Module dürfen `core` benutzen, aber nicht einander.
- Farben, Radien und Schriftgrößen nur über die Tokens in `src/app/globals.css`.
- UI-Bausteine liegen in `src/components/ui/`. Erst dort nachsehen, bevor ein neuer entsteht.
- Texte der Oberfläche sind Deutsch, Code und Bezeichner Englisch.
- Zugangsdaten stehen nie im Repo.

## Befehle

- `npm run dev` startet die App lokal (braucht `.env.local`, siehe `.env.example`).
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` müssen vor jedem Abschluss grün sein.
- `npm run test:db` führt die Datenbanktests aus (braucht `supabase start`).

## Werkzeuge

- Skills unter `.claude/skills/`: `vercel-react-best-practices`, `web-design-guidelines`, `supabase`, `supabase-postgres-best-practices`. Aktualisieren mit `npx skills update -p -y`.
- MCP-Server aus `.mcp.json`: Context7 für aktuelle Bibliotheks-Dokumentation, Playwright zum Prüfen der Oberfläche im Browser.
- `web-design-guidelines` prüft Technik und Zugänglichkeit. Bei Gestaltungsfragen hat `docs/DESIGN.md` Vorrang.

## Arbeitsweise

- Bei Aufgaben über mehr als eine Datei zuerst einen Plan zeigen.
- Nach UI-Änderungen die Seite bei 390 px und 1280 px im Browser ansehen und gegen `docs/DESIGN.md` prüfen.
- Tests selbst ausführen und das Ergebnis melden. Was nicht geprüft werden konnte, ausdrücklich nennen.
- Vor Abschluss die Liste „Fertig heißt" in `docs/ENGINEERING.md`, Abschnitt 10, durchgehen.

## Next.js

Diese Next.js-Version weicht von älteren ab (zum Beispiel `src/proxy.ts` statt Middleware). Vor Änderungen an Framework-Themen die Hinweise beachten:

@AGENTS.md
