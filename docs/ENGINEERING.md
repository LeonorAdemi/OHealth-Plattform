# OHealth Engineering

Verbindliche Regeln dafür, wie die OHealth-Plattform gebaut wird. Sie gelten für Menschen und für KI-Assistenten. Das Gegenstück für die Oberfläche ist `docs/DESIGN.md`. Abweichungen werden hier geändert, nicht stillschweigend im Code.

## 1. Grundsätze

1. **Einfach vor clever.** Die einfachste Lösung, die die Anforderung erfüllt. Keine Abstraktion auf Vorrat, keine Bibliothek für etwas, das zehn Zeilen löst.
2. **Die Datenbank ist die Sicherheitsgrenze.** Wer was sehen und ändern darf, entscheidet Row Level Security in Postgres. Das Frontend blendet nur aus, es schützt nicht.
3. **Server zuerst.** Seiten laden ihre Daten auf dem Server. Client-Code gibt es nur dort, wo jemand tippt oder klickt.
4. **Module bleiben getrennt.** `core` kennt kein Modul. Module kennen `core`, aber nicht einander. So lassen sich Physio und Health später ergänzen oder abschalten.
5. **Gemessen statt gefühlt.** Performance und Qualität werden über die Ziele in Abschnitt 4 und die Tests in Abschnitt 7 beurteilt.
6. **Kleine Schritte.** Jede Änderung ist klein genug, um sie in zehn Minuten zu prüfen, und bringt ihre Tests mit.

## 2. Stack

Next.js (App Router, TypeScript strict), Tailwind CSS v4, Origin-UI-Komponenten, Supabase (Postgres, Auth), Vercel. Tests mit pgTAP, Vitest und Playwright.

Eine neue Abhängigkeit braucht eine Begründung im Pull Request: was sie löst, warum es nicht ohne geht, wie groß sie im Bundle ist.

Begründete Abhängigkeiten außerhalb des Grundgerüsts:

| Paket | Wofür | Warum nicht selbst | Bundle |
| --- | --- | --- | --- |
| `@modelcontextprotocol/server` | MCP-Endpunkt `/api/mcp` | Offizielles SDK, das Protokoll mit Versionen und Transport ist zu umfangreich für Eigenbau | Nur Server, 0 kB im Browser |
| `web-push` | Push-Versand in `/api/push` | Verschlüsselung der Inhalte (RFC 8291) und VAPID-Signatur (RFC 8292) sind fehleranfällig im Eigenbau; Standardbibliothek dafür | Nur Server, 0 kB im Browser |
| `postgres` (nur Entwicklung) | Testdaten der Ende-zu-Ende-Tests per SQL in der lokalen Datenbank | Die Trigger brauchen das Schema `private`, das über die API zu Recht nicht erreichbar ist; kleiner Treiber ohne weitere Abhängigkeiten | Nur Tests, 0 kB im Browser |

## 3. Architektur

```
src/app/            Routen. Dünn: Daten holen, Modul-Komponenten zusammensetzen.
src/modules/<name>/ Fachlogik eines Moduls
  queries.ts        Lesen aus der Datenbank (nur Server)
  actions.ts        Schreiben als Server Actions, mit Eingabeprüfung
  logic.ts          Reine Funktionen (Berechnungen, Formatierung), ohne Seiteneffekte
  components/       Oberfläche des Moduls
src/components/ui/  Bausteine ohne Fachlogik
src/lib/            Supabase-Client, generierte Datenbank-Typen, Hilfsfunktionen
supabase/           Migrationen und Datenbanktests
```

- Datenbankzugriffe stehen ausschließlich in `queries.ts` und `actions.ts`. Komponenten rufen nie direkt Supabase auf.
- Datenbank-Typen werden generiert (`supabase gen types`), nicht von Hand geschrieben.
- Jede Eingabe von außen (Formular, URL-Parameter) wird an der Grenze mit einem Schema geprüft.
- Berechnungen, die das Leaderboard betreffen, leben in der Datenbank (Views), damit alle Clients dasselbe Ergebnis sehen.
- Schreibvorgänge über mehrere Tabellen laufen als eine Datenbankfunktion, damit sie ganz oder gar nicht passieren (Beispiele: `log_workout`, `update_workout`). Gemeinsame Schritte liegen in einer Hilfsfunktion statt doppelt im Code.
- Schreibende Aufrufe sind so gebaut, dass eine Wiederholung nach einem Verbindungsabbruch nichts doppelt anlegt.
- Kein globaler Client-State-Speicher, solange Server-Daten und lokaler Komponenten-State ausreichen.

## 4. Performance-Ziele

Gemessen auf einem Mittelklasse-Handy im Mobilfunknetz, nicht auf dem Entwicklungsrechner.

| Messgröße | Ziel |
| --- | --- |
| Largest Contentful Paint | unter 2,5 s |
| Interaction to Next Paint | unter 200 ms |
| Cumulative Layout Shift | unter 0,1 |
| JavaScript der ersten Ansicht | unter 150 kB (gzip) |
| Satz speichern: Tippen bis sichtbare Bestätigung | unter 100 ms (optimistisch) |

Regeln, die diese Ziele sichern:

- Unabhängige Datenabfragen laufen parallel, nie nacheinander.
- Listen werden seitenweise geladen. Keine Abfrage ohne `limit`.
- Jede Spalte, nach der gefiltert oder sortiert wird, hat einen Index. Neue Abfragen werden mit `explain` geprüft.
- Aggregationen (Bestwerte, Wochenzahlen) rechnet die Datenbank, nicht der Browser.
- Schwere Teile wie Diagramme werden erst bei Bedarf nachgeladen.
- Schrift über `next/font`, Bilder über `next/image`, keine weiteren Webfonts.
- Die Detailregeln stehen in den Skills `vercel-react-best-practices` und `supabase-postgres-best-practices` unter `.claude/skills/`.

## 5. Daten und Sicherheit

- Jede Tabelle hat Row Level Security, und jede Regel hat einen Test in `supabase/tests/database/`.
- In Zugriffsregeln steht `(select auth.uid())` statt `auth.uid()`, damit Postgres den Nutzer einmal je Abfrage ermittelt und nicht für jede Zeile.
- Funktionen mit erhöhten Rechten (`security definer`) liegen im Schema `private`, das nicht über die API erreichbar ist. Im Schema `public` bleiben nur Funktionen, die die App bewusst aufruft, und die sind nur für angemeldete Nutzer freigegeben.
- Nach jeder Änderung am Datenmodell laufen die Supabase-Advisors (Sicherheit und Performance). Warnungen werden behoben oder hier begründet. Bewusst offen: `join_group`, `group_invite_preview` und `delete_own_account` brauchen erhöhte Rechte und sind für angemeldete Nutzer aufrufbar. Jede davon wirkt nur auf den Aufrufer selbst. Ebenso `join_public_meetup` und `record_signup_source` (wirken nur für den Aufrufer) sowie `discover_meetups` und `discover_communities` (lesen nur, was der öffentliche Event-Link ohnehin zeigt, ohne Namen). Ohne Anmeldung aufrufbar sind nur die Vorschauen geteilter Links, `community_link_preview` und `public_meetup_preview`; sie liefern nur, was der Link ohnehin zeigen soll, ohne Namen von Personen.
- Migrationen werden nie nachträglich geändert. Jede Änderung ist eine neue Datei.
- Der Service-Role-Schlüssel wird im Anwendungscode nicht verwendet. Zugangsdaten stehen nur in `.env.local` und in Vercel.
- **Fachbereiche.** Die Regeln einzelner Funktionen stehen je Bereich unter `docs/bereiche/` und sind genauso verbindlich. Gelesen wird nur die Datei des Bereichs, an dem gearbeitet wird:

  | Datei | Inhalt |
  | --- | --- |
  | `docs/bereiche/chats.md` | Chats von Events und Communities, Privatchats, Nachrichtenanfragen, Gelesen-Stand. |
  | `docs/bereiche/profil-und-folgen.md` | Profilseite, private und öffentliche Konten, Folgen, Blockieren, Profilbilder, Konto löschen. |
  | `docs/bereiche/aktivitaeten.md` | Katalog `sports` und `cities`, Aktivität eintragen, `log_activity`. |
  | `docs/bereiche/events.md` | Events je Sportart, wöchentliche Reihen, Ändern und Absagen, öffentlicher Event-Link, „Warst du dabei?“. |
  | `docs/bereiche/vertrauen.md` | Melden, automatisches Ausblenden, Mitglieder entfernen, Nutzungsbedingungen. |
  | `docs/bereiche/entdecken.md` | „Entdecken“ je Stadt, Onboarding `/willkommen`, Warteliste, alte Adressen. |
  | `docs/bereiche/mitteilungen.md` | Push-Versand über `pg_net` und `/api/push`, Erinnerungen per `pg_cron`. |
  | `docs/bereiche/kennzahlen.md` | `private.pilot_metrics` für die wöchentliche Auswertung. |
  | `docs/bereiche/ki-zugriff.md` | Verbundene KI-Apps über `/api/mcp`: was eine KI lesen und schreiben darf. |
  | `docs/bereiche/heute.md` | Seite „Heute“: Vorhaben je Sportart als Kreise mit Animation, Kennzahlen der Woche, Als Nächstes, Kalender mit Wochenstreifen, neue Bestwerte, Heatmap. |
  | `docs/bereiche/uebungen.md` | Figurensprache, Icons je Muskelgruppe, Skizzen je Übung, neue Übung anlegen. |
  | `docs/bereiche/kalorien.md` | Kalorienfaktor je Sportart, Körpergewicht mit Einwilligung, Kalorien je Aktivität und Woche. |

- Es werden nur Daten gespeichert, die eine Funktion brauchen.
- Ändert sich die Datenverarbeitung, wird die Datenschutzseite im selben Schritt angepasst (siehe `docs/LEGAL.md`).
- Jeder Nutzer kann sein Konto samt allen eigenen Daten selbst löschen. Neue Tabellen mit Nutzerdaten hängen deshalb per Fremdschlüssel mit Kaskade am Profil, und der Datenbanktest zum Konto-Löschen wird um sie ergänzt.
- KI-Werkzeuge mit Datenbankzugriff (Supabase MCP) werden nur mit einem Entwicklungsprojekt verbunden, nie mit Produktionsdaten.
- **Gesundheitsdaten** (zuerst das Körpergewicht für Kalorien, später Schmerz, Stimmung, Ernährung): je Datenart eine eigene Tabelle mit eigener, ausdrücklicher Einwilligung, deren Zeitpunkt mitgespeichert wird; geschrieben nur über eine Funktion, die die Einwilligung prüft. Lesen nur die Person selbst, nie andere Mitglieder und nie eine verbundene KI (einschränkende Regel mit `private.is_agent()`). Jederzeit löschbar, was zugleich die Einwilligung widerruft, und mit dem Konto gelöscht. Die Datenschutzseite nennt Zweck und Rechtsgrundlage (Art. 9 Abs. 2 Buchstabe a DSGVO). Export folgt, sobald es einen Datenexport gibt.

## 6. Zuverlässigkeit

Im Gym ist der Empfang oft schlecht. Ein eingegebener Satz darf nie verloren gehen.

- Ein laufendes Workout wird lokal auf dem Gerät gehalten, bis der Server das Speichern bestätigt hat.
- Fehlgeschlagene Speicherungen werden automatisch wiederholt. Der Zustand ist sichtbar: „Gespeichert" oder „Wird gesendet".
- Server Actions geben ein typisiertes Ergebnis zurück (Erfolg oder Fehler mit Grund), sie werfen keine Fehler in die Oberfläche.
- Jede Route hat eine Fehleransicht und einen Ladezustand. Fehlermeldungen folgen `docs/DESIGN.md`, Abschnitt 10.

## 7. Tests

Getestet wird dort, wo Fehler teuer sind: Zugriffsschutz, Berechnungen und die Kernabläufe.

| Ebene | Werkzeug | Was | Pflicht |
| --- | --- | --- | --- |
| Datenbank | pgTAP (`supabase test db`) | Jede RLS-Regel, jede Funktion, jede View | Immer bei Änderungen am Datenmodell |
| Logik | Vitest | Reine Funktionen in `logic.ts`: Wochenzählung, Serien, Zahlenformat | Immer |
| Komponenten | Vitest und Testing Library | Formulare mit Eingabeprüfung | Nur bei eigener Logik |
| Abläufe | Playwright (`e2e/`) | Die Kernabläufe, je bei 390 px und 1280 px | Immer, in der CI bei jedem Pull Request |

Die Kernabläufe (Strategie-Review, N6; Anleitung in `e2e/README.md`):

1. Über einen Event-Link registrieren, danach ist man zugesagt und Mitglied der Community
2. Ein Event mit wöchentlicher Wiederholung planen
3. „Warst du dabei?“ bestätigen, das Training zählt in Wochenraster und Rangliste
4. Eine Aktivität eintragen, sie zählt in Wochenraster und Rangliste

Ende-zu-Ende-Tests laufen nur gegen die lokale Supabase und legen ihre Daten selbst an.

Regeln:

- Ein Fehler wird zuerst als fehlschlagender Test nachgestellt, dann behoben.
- Tests prüfen Verhalten, nicht Aufbau. Kein Test für Origin-UI-Bausteine oder reines Markup.
- Tests sind unabhängig voneinander und legen ihre Daten selbst an.
- Testnamen sind deutsche Sätze, die die Regel aussprechen: „Coaching-Gruppe: Mitglieder sehen einander nicht".

## 8. Qualitätstore

Vor jedem Merge laufen automatisch (`.github/workflows/ci.yml`): Typprüfung, Lint, Logik-Tests, Datenbanktests, Build und Ende-zu-Ende-Tests. Ist ein Schritt rot, wird nicht gemergt. Es gibt keine Ausnahmen „nur dieses eine Mal".

Arbeitsablauf: ein Branch je Aufgabe, Pull Request nach `main`, Squash-Merge. `main` ist jederzeit auslieferbar.

### Branches und Auslieferung

- `main` ist geschützt: Änderungen nur per Pull Request mit grüner CI, kein direkter Push, kein Force-Push. Sobald mehr als eine Person mitarbeitet, braucht jeder Pull Request ein Approval der anderen Person.
- Branch-Namen: `feat/<thema>`, `fix/<thema>`, `docs/<thema>`, `chore/<thema>`. KI-Sitzungen nutzen ihre eigenen `claude/…`-Branches.
- Jeder Push auf einen Branch erzeugt bei Vercel ein Preview-Deployment. Previews sind per Vercel-Anmeldung geschützt. Dort wird geprüft, bevor gemergt wird, auch vom Handy.
- Ein Merge nach `main` geht automatisch in Produktion. Gemergt wird nur, wenn die CI grün ist und die Preview geprüft wurde.
- Pull Requests bleiben klein: eine Aufgabe, möglichst nicht länger als ein Arbeitstag. Vor dem Merge wird `main` in den Branch geholt.

### Zurück zu einem alten Stand

- Produktion kaputt: in Vercel unter Deployments das letzte gute Deployment wählen und „Instant Rollback" ausführen. Danach in Ruhe den Fehler beheben.
- Eine gemergte Änderung zurücknehmen: auf GitHub beim Pull Request „Revert" wählen. Das erzeugt einen neuen Pull Request, der wie jeder andere durch die CI läuft.
- Nach jedem größeren Schritt bekommt `main` ein Release-Tag nach dem Muster `vMAJOR.MINOR.PATCH`, etwa `v0.2.0`. Tags werden nie verschoben oder gelöscht.

### Datenbank in diesem Ablauf

- Previews und Produktion nutzen dasselbe Supabase-Projekt. Wer auf einer Preview testet, arbeitet mit echten Daten, also nur mit Testkonten. Vor dem Start mit echten Nutzern bekommt die Preview eine eigene Datenbank.
- Migrationen werden erst nach dem Merge auf das Projekt angewendet, nie aus einem offenen Branch.
- Migrationen sind rückwärtsverträglich: erst hinzufügen, alte Spalten oder Tabellen erst in einem späteren Pull Request entfernen. So läuft nach einem Rollback der alte Code weiter.
- Ein Rollback des Codes nimmt keine Migration zurück. Rückgängig gemacht wird mit einer neuen Migration.
- Arbeiten zwei Branches gleichzeitig an Migrationen, prüft der zweite Merge, dass Reihenfolge und Inhalt zusammenpassen, und lässt die Datenbanktests auf dem aktuellen Stand laufen.

## 9. Arbeiten mit KI-Assistenten

- Eine Aufgabe je Sitzung, klar umrissen. Für alles, was mehr als eine Datei betrifft, zuerst einen Plan zeigen lassen und freigeben.
- Bibliotheks-APIs werden über Context7 nachgeschlagen, nicht aus dem Gedächtnis geschrieben.
- Nach jeder Änderung an der Oberfläche öffnet der Assistent die Seite im Browser (Playwright MCP) bei 390 px und 1280 px und vergleicht sie mit `docs/DESIGN.md`.
- Der Assistent führt die Tests selbst aus und meldet das Ergebnis mit, auch wenn etwas fehlschlägt.
- Der Assistent ändert weder bestehende Migrationen noch diese beiden Regeldokumente (auch die Dateien unter `docs/bereiche/`) ohne ausdrücklichen Auftrag.
- Kontext ist begrenzt und kostet. Diese Datei und `docs/DESIGN.md` bleiben deshalb kurz: Regeln einer einzelnen Funktion kommen in ihre Datei unter `docs/bereiche/`, nicht hierher. Eine neue Funktion bringt ihre Bereichsdatei mit oder ergänzt die passende; die Pflege gehört zum Auftrag der Funktion.
- Den Stand der Datenbank liest der Assistent über `supabase/SCHEMA_INDEX.md` (generiert, `npm run db:index`) und öffnet nur die dort genannte Stelle.
- Was der Assistent nicht prüfen konnte, sagt er ausdrücklich dazu.

## 10. Fertig heißt

- [ ] Die Anforderung ist erfüllt, und nichts darüber hinaus wurde umgebaut
- [ ] Tests laut Abschnitt 7 sind vorhanden und grün
- [ ] Typprüfung, Lint und Build sind grün
- [ ] Bei Oberflächen: Prüfliste aus `docs/DESIGN.md`, Abschnitt 14, ist abgearbeitet
- [ ] Bei Datenmodell: neue Migration, RLS-Regel und Datenbanktest sind dabei
- [ ] Keine neue Abhängigkeit ohne Begründung
- [ ] Performance-Ziele aus Abschnitt 4 sind nicht verschlechtert
