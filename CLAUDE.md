# OHealth-Plattform

Plattform für Workout-Tracking und Vergleich in Gruppen, später erweitert um Physio- und Health-Module. Hinweise für Claude Code und andere KI-Assistenten in diesem Repo.

## Pflichtlektüre

- `docs/ENGINEERING.md` vor jeder Änderung am Code. Verbindlich.
- `docs/DESIGN.md` vor jeder Änderung an der Oberfläche. Verbindlich.
- Aus `docs/bereiche/` nur die Datei des Bereichs, an dem gearbeitet wird (Index in `docs/ENGINEERING.md`, Abschnitt 5). Ebenso verbindlich.

Widerspricht eine Aufgabe einem dieser Dokumente: nachfragen, nicht stillschweigend abweichen.

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
- `npm run check` prüft Typen, Lint, Logik-Tests und den Schema-Index mit knapper Ausgabe. Dazu `npm run build`; beides muss vor jedem Abschluss grün sein.
- `npm run db:index` nach jeder neuen Migration ausführen und `supabase/SCHEMA_INDEX.md` mit committen.
- `npm run test:db` führt die Datenbanktests aus (braucht `supabase start`).

## Werkzeuge

- Skills unter `.claude/skills/`: `vercel-react-best-practices`, `web-design-guidelines`, `supabase`, `supabase-postgres-best-practices`. Aktualisieren mit `npx skills update -p -y`.
- MCP-Server aus `.mcp.json`: Context7 für aktuelle Bibliotheks-Dokumentation, Playwright zum Prüfen der Oberfläche im Browser.
- `web-design-guidelines` prüft Technik und Zugänglichkeit. Bei Gestaltungsfragen hat `docs/DESIGN.md` Vorrang.

## Sparsam lesen

- Den aktuellen Stand einer Tabelle, Funktion oder Regel in `supabase/SCHEMA_INDEX.md` per grep suchen und nur die genannte Stelle lesen, nicht alle Migrationen.
- `src/lib/database.types.ts` nie ganz lesen, nur gezielt per grep.
- Große Dateien abschnittsweise lesen; für breite Suchen über viele Dateien einen Explore-Agenten nutzen.
- Neue Fachregeln gehören in die passende Datei unter `docs/bereiche/` (oder eine neue, dann im Index eintragen), nicht in die Kerndokumente.

## Arbeitsweise

- Bei Aufgaben über mehr als eine Datei zuerst einen Plan zeigen.
- Nach UI-Änderungen die geänderte Seite bei 390 px und 1280 px im Browser ansehen und gegen `docs/DESIGN.md` prüfen. Dafür Screenshots nehmen; den Accessibility-Snapshot nur, wenn etwas angeklickt werden muss.
- Tests selbst ausführen und das Ergebnis melden. Was nicht geprüft werden konnte, ausdrücklich nennen.
- Vor Abschluss die Liste „Fertig heißt" in `docs/ENGINEERING.md`, Abschnitt 10, durchgehen.

## Next.js

Diese Next.js-Version weicht von älteren ab (zum Beispiel `src/proxy.ts` statt Middleware). Vor Änderungen an Framework-Themen die Hinweise beachten:

@AGENTS.md
