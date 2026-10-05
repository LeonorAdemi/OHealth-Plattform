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
- Nach jeder Änderung am Datenmodell laufen die Supabase-Advisors (Sicherheit und Performance). Warnungen werden behoben oder hier begründet. Bewusst offen: `join_group`, `group_invite_preview` und `delete_own_account` brauchen erhöhte Rechte und sind für angemeldete Nutzer aufrufbar. Jede davon wirkt nur auf den Aufrufer selbst.
- Migrationen werden nie nachträglich geändert. Jede Änderung ist eine neue Datei.
- Der Service-Role-Schlüssel wird im Anwendungscode nicht verwendet. Zugangsdaten stehen nur in `.env.local` und in Vercel.
- **Push.** Neue Mitteilungen meldet die Datenbank per `pg_net` an `/api/push`. Die Route reicht das mitgeschickte Geheimnis an `push_payload` weiter; die Datenbank prüft es gegen `private.push_config` und liefert erst dann Inhalt, Geräte-Abos und das VAPID-Schlüsselpaar. Adresse, Geheimnis und Schlüsselpaar trägt der Betreiber je Umgebung im SQL-Editor ein, nie im Repo (Migration `push_keys_in_db`). In Vercel steht nur der öffentliche Schlüssel `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Erinnerungen legt `pg_cron` alle 15 Minuten an (Migration `push_and_reminders`, Test 16).
- **Chats.** Alle Chats liegen in `chats` (Art `meetup` oder `community`, später Privatchats), Nachrichten in `chat_messages`, der Gelesen-Stand je Person in `chat_reads`. Wer einen Chat sieht und darin schreibt, entscheidet allein `private.can_access_chat`: beim Event, wer zugesagt hat; bei der Community alle Mitglieder, Coaching-Gruppen ausgenommen. Chats entstehen nur per Trigger. Namen und Profilbilder im Chat kommen aus `chat_messages_page`, die Übersicht mit ungelesenen Nachrichten aus `my_chats`, die Zahl am Tab aus `unread_chat_count`. Wer einer Community beitritt, hat ihren Chat bis dahin gelesen (Migration `chat_inbox`, Test 19). Im Community-Chat darf die Verwaltung (admin, coach) jede Nachricht löschen, im Event-Chat löscht jede Person nur ihre eigenen. Chat-Nachrichten erzeugen Mitteilungen `message` bzw. `community_message` nur für den Push; die Glocke zeigt sie nicht. Push für Community-Chats ist voreingestellt aus (Migration `community_chat`, Test 20). Die alte Tabelle `meetup_messages` ist nur noch eine Brücke für Rollbacks und wird später entfernt (Migration `chats`, Test 18).
- **Folgen und Privatchats.** Konten sind privat (Voreinstellung) oder öffentlich (`profiles.is_private`). Folgen (`follows`, eine Zeile je Richtung) entsteht und endet nur über Funktionen: `follow_person` (öffentlichen Konten sofort, privaten als Anfrage, nur wenn das Profil sichtbar ist, höchstens 100 offene Anfragen), `unfollow_person`, `respond_follow_request`, `remove_follower`, `block_person`, `unblock_person`. Wird ein Konto öffentlich, gelten offene Anfragen als angenommen. Die Profil-Kacheln liefert `profile_stats` nur bei öffentlichen Konten und an bestätigte Follower; einzelne Workouts gibt sie nie frei. Gefunden werden öffentliche Konten und Personen aus gemeinsamen Communities (`people_search`). Privatchats (Art `direct`): gegenseitig Folgende schreiben direkt, sonst wird der Chat zur Anfrage (`requested_by`, `accepted_at`), an öffentliche Konten von allen, an private nur von bestätigten Followern; annehmen per `respond_chat_request` oder durch Antworten, ablehnen löscht den Chat. Anfragen zählen nicht am Tab, ihr Push zeigt keinen Inhalt. Eine Blockierung sieht nur, wer blockiert (Migrationen `friends_and_direct_chats` und `follows`, Test 21).
- **Sportarten und Städte sind Daten.** Der Katalog `sports` legt je Sportart fest, welche Angaben eine Aktivität hat (Distanz, Höhenmeter, Übungen mit Sätzen); `cities` führt Städte mit dem Status `live` oder `geplant`. Beide enthalten keine Nutzerdaten, sind für Angemeldete (auch KI-Tokens) nur lesbar und werden per Migration gepflegt; Schreibrechte sind zusätzlich zu RLS entzogen. Eine neue Sportart oder Stadt ist eine neue Zeile, kein Code; Namen und Suchbegriffe müssen eindeutig bleiben (Test 22). Die Tabelle `workouts` heißt in der Oberfläche „Aktivität“ und hat eine Pflicht-Sportart; jede Aktivität zählt als Trainingstag. Der Standard `krafttraining` an `workouts.sport_id` ist nur eine Brücke, damit alter Code nach einem Rollback weiterläuft, und entfällt in einer späteren Migration. Freie Texte an Communities und Profilen ordnen vorerst Trigger dem Katalog zu (`private.sport_for_text`, `private.city_for_text`, nur bei eindeutigem Treffer); sobald die Oberfläche den Katalog direkt nutzt (AP5), führt der Bezug. Die Regeln für die Zuordnung bestehender Workouts stehen in `private.legacy_activity_values` (Migration `sports_and_cities`, Test 22). Eine Aktivität ohne Sätze entsteht über `log_activity` (ID vom Gerät, wiederholbar) und wird über `update_activity` geändert; Übungen mit Sätzen laufen weiter über `log_workout` und `log_training`. Dass Distanz und Höhenmeter nur bei passenden Sportarten vorkommen und eine Notiz höchstens 500 Zeichen hat, prüft ein Trigger für jeden Weg in die Tabelle (Migration `log_activity`, Test 23). Er läuft ohne erhöhte Rechte und bricht bei einer unbekannten Sportart ab, statt die Prüfung zu überspringen; seine Meldungen zeigt die App über `activityErrorMessage` an (Migration `activity_checks_invoker_and_squash`, Test 24).
- Es werden nur Daten gespeichert, die eine Funktion brauchen.
- Ändert sich die Datenverarbeitung, wird die Datenschutzseite im selben Schritt angepasst (siehe `docs/LEGAL.md`).
- Jeder Nutzer kann sein Konto samt allen eigenen Daten selbst löschen. Neue Tabellen mit Nutzerdaten hängen deshalb per Fremdschlüssel mit Kaskade am Profil, und der Datenbanktest zum Konto-Löschen wird um sie ergänzt.
- **Dateien (Supabase Storage).** Profilbilder liegen im Bucket `avatars` unter `<user_id>/<uuid>.webp`, schreiben darf jede Person nur in ihren eigenen Ordner, eine KI gar nicht. In der Datenbank steht nur der Pfad, nie eine fremde Adresse (Prüfregel `profiles_avatar_path`). Bilder werden auf dem Gerät auf 512 px verkleinert, das Original verlässt das Gerät nicht. Dateien hängen nicht per Fremdschlüssel am Profil und Postgres darf sie nicht direkt löschen; deshalb löscht die App sie über die Storage-API, beim Ersetzen das alte Bild und beim Konto-Löschen den ganzen Ordner vor `delete_own_account` (Migration `profile_details`, Test 17).
- KI-Werkzeuge mit Datenbankzugriff (Supabase MCP) werden nur mit einem Entwicklungsprojekt verbunden, nie mit Produktionsdaten.
- **KI-Zugriff für Nutzer (MCP).** Nutzer können eine KI-App über `/api/mcp` mit ihren Daten verbinden. Anmeldung und Bestätigung laufen über den OAuth-2.1-Server von Supabase Auth und die Seite `/oauth/consent`. Für Tokens mit dem Claim `client_id` gilt in der Datenbank: nur eigene Daten lesen, keine Gruppen, nichts löschen (Migration `agent_read_only`, Test `08_agent_access`). Einzige Ausnahme beim Schreiben sind eigene Vorlagen: Eine KI darf sie anlegen, umbenennen und neue Versionen erstellen, aber nur privat anlegen und nie die Sichtbarkeit ändern, denn eine öffentliche Vorlage zeigt den Namen der Person (Migration `agent_write_templates`, Test `12_agent_templates`). Aktivitäten, Übungen, Profil und Gruppen bleiben für eine KI nur lesbar. Über `list_workouts` liest sie Aktivitäten mit Sportart, Dauer, Distanz, Höhenmetern, Anstrengung und Sätzen; die Werkzeugnamen bleiben stabil, damit verbundene KI-Apps weiterlaufen. Der Endpunkt nimmt nur solche Tokens an. Neue Tabellen mit Nutzerdaten bekommen dieselbe einschränkende Regel und werden im Test ergänzt. Neue MCP-Werkzeuge sind lesend, solange hier nichts anderes steht; schreibende Werkzeuge gibt es nur für die genannte Ausnahme.
- Sobald Gesundheitsdaten dazukommen (Schmerz, Stimmung, Ernährung): eigene Freigabe pro Datenart, protokollierte Einwilligung, Export und Löschung. Das wird vor dem ersten solchen Modul hier ergänzt.

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
| Abläufe | Playwright | Die drei Kernabläufe, je bei 390 px und 1280 px | Vor jedem Release |

Die drei Kernabläufe:

1. Registrieren und einer Gruppe per Einladungscode beitreten
2. Ein Workout mit mehreren Sätzen loggen und speichern
3. Das eigene Workout erscheint im Leaderboard der Gruppe

Regeln:

- Ein Fehler wird zuerst als fehlschlagender Test nachgestellt, dann behoben.
- Tests prüfen Verhalten, nicht Aufbau. Kein Test für Origin-UI-Bausteine oder reines Markup.
- Tests sind unabhängig voneinander und legen ihre Daten selbst an.
- Testnamen sind deutsche Sätze, die die Regel aussprechen: „Coaching-Gruppe: Mitglieder sehen einander nicht".

## 8. Qualitätstore

Vor jedem Merge laufen automatisch (`.github/workflows/ci.yml`): Typprüfung, Lint, Logik-Tests, Datenbanktests und Build. Ist ein Schritt rot, wird nicht gemergt. Es gibt keine Ausnahmen „nur dieses eine Mal".

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
- Der Assistent ändert weder bestehende Migrationen noch diese beiden Regeldokumente ohne ausdrücklichen Auftrag.
- Was der Assistent nicht prüfen konnte, sagt er ausdrücklich dazu.

## 10. Fertig heißt

- [ ] Die Anforderung ist erfüllt, und nichts darüber hinaus wurde umgebaut
- [ ] Tests laut Abschnitt 7 sind vorhanden und grün
- [ ] Typprüfung, Lint und Build sind grün
- [ ] Bei Oberflächen: Prüfliste aus `docs/DESIGN.md`, Abschnitt 14, ist abgearbeitet
- [ ] Bei Datenmodell: neue Migration, RLS-Regel und Datenbanktest sind dabei
- [ ] Keine neue Abhängigkeit ohne Begründung
- [ ] Performance-Ziele aus Abschnitt 4 sind nicht verschlechtert
