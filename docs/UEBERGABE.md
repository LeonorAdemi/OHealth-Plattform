# OHealth: Übergabe für einen neuen Chat

Stand: 3. Oktober 2026. Dieses Dokument reicht zusammen mit dem Paket `ohealth-repo-paket.zip`, um nahtlos weiterzuarbeiten.

## Worum es geht

OHealth ist eine Web-App (installierbar auf dem Homescreen), in der man Workouts trackt und sich in Gruppen vergleicht. Draft 1 ist für Freunde gedacht. Die Architektur ist so angelegt, dass später ein Physio-Modul (Coach sieht seine Athleten) und ein Health-Modul (Ernährung, Stimmung, Gewohnheiten) dazukommen können.

Stack: Next.js 16 (App Router, TypeScript), Tailwind v4, Bausteine aus Origin UI, Supabase (Postgres, Auth), Hosting bei Vercel geplant.

## Wo was liegt

| Was | Stand |
| --- | --- |
| Code | Vollständig im Paket `ohealth-repo-paket.zip`. Die Arbeitsumgebung eines Chats bleibt nicht erhalten, das Paket muss im neuen Chat hochgeladen werden. |
| GitHub | `github.com/LeonorAdemi/OHealth-Plattform`, öffentlich. Enthält bisher nur die README. Der Code ist noch nicht eingecheckt, Claude kann dort nicht schreiben. |
| Supabase | Projekt `ohealth`, Region Frankfurt, Projekt-ID `hqjpsfrgieytslkwnbbu`, Gratis-Tarif. Alle zwölf Migrationen sind eingespielt, es gibt noch keine echten Nutzer. Der Supabase-Connector ist verbunden. |
| Vercel | Konto `leonorademi`, Arbeitsbereich `leonorademis-projects`, Hobby-Tarif. Noch kein Projekt, nichts deployt. Der Connector ist verbunden, hat aber keinen Zugriff auf den Arbeitsbereich und muss dafür neu verbunden werden. |

Zugangswerte für `.env.local` und Vercel (beide sind für den Browser gedacht und dürfen öffentlich sein):

```
NEXT_PUBLIC_SUPABASE_URL=https://hqjpsfrgieytslkwnbbu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dFmJxQUh3o8j86L9gwjbTg_5zKeL_Rr
```

## Was die App kann

- Anmeldung per E-Mail und Passwort, Google, Apple, Facebook und Passkey (Anbieter und Passkey per Einstellung schaltbar), Passwort zurücksetzen
- Workout loggen mit Suche im Katalog (103 Übungen, deutsche Namen, englische Suchbegriffe), ansehen, korrigieren, löschen
- Icons je Muskelgruppe in der Übungssuche, Skizze der Ausführung je Übung beim Loggen (aufklappbar)
- KI-Zugriff über MCP (`/api/mcp`): Claude und andere KI-Apps lesen nach Bestätigung die eigenen Trainingsdaten, nur lesend, ohne Gruppendaten
- Startansicht mit Trainingstagen der Woche und Wochenraster
- Gruppen: erstellen, per Einladungslink oder Code beitreten, Ranglisten für Konstanz und Bestwerte je Übung
- Zwei Gruppentypen: Freunde (alle sehen einander) und Coaching (nur der Coach sieht die Mitglieder)
- Profil: Name ändern, Passkey einrichten, Passwort ändern, Konto löschen
- Impressum und Datenschutzseite (Entwurf mit sichtbarem Hinweis)
- Logo, App-Icon und Installation auf dem Homescreen

## Verbindliche Dokumente im Paket

- `docs/DESIGN.md`: Gestaltung (weiß, Schrift Archivo, Akzent Moos nur für „du" und „Fortschritt", Großzahl, Wochenraster)
- `docs/ENGINEERING.md`: Architektur, Performance-Ziele, Sicherheit, Tests, Arbeitsweise mit KI
- `docs/ROADMAP.md`: Reihenfolge und Stand
- `docs/LEGAL.md`: offene Rechtsfragen und was der Betreiber eintragen muss
- `CLAUDE.md`: Kurzregeln für KI-Assistenten im Repo

## Stand der Roadmap

| Nr. | Schritt | Stand |
| --- | --- | --- |
| 1 | Bestwerte je Übung in der Gruppe | Erledigt |
| 2 | Workout ansehen, korrigieren, löschen | Erledigt |
| 3a | Konto löschen | Erledigt |
| 3b | Datenschutz und Impressum | Seiten gebaut, Angaben des Betreibers und rechtliche Prüfung fehlen |
| 4 | Übungskatalog mit Suche | Erledigt |
| 4b | Icons und Übungsskizzen | Erledigt |
| 7 | KI-Zugriff über MCP | Gebaut, Test mit Claude nach Deployment offen |
| 5 | Kernabläufe automatisch im Browser testen | Offen, braucht eine laufende App |
| 6 | Native Hülle für TestFlight und App Store | Offen, Konzept besprochen (Capacitor, native Anmeldung, Apple-Entwicklerkonto nötig) |

Bewusst zurückgestellt: eigene Übungen anlegen, Datum eines Workouts ändern, Widerruf der Apple-Verbindung beim Konto-Löschen.

## Was geprüft ist und was nicht

Geprüft:

- 111 Datenbanktests (pgTAP) und 66 Logik-Tests (Vitest) sind grün, Typprüfung, Lint und Build laufen fehlerfrei.
- Alle Zugriffsregeln wurden zusätzlich am echten Supabase-Projekt mit Testnutzern durchgespielt und wieder zurückgerollt.
- Supabases Sicherheits- und Performance-Check: drei bewusste Warnungen (`join_group`, `group_invite_preview`, `delete_own_account`), sonst nichts.
- Die Ansichten wurden mit Beispieldaten im Browser bei Handy- und Desktop-Breite gegen das Design-Dokument geprüft.

Nicht geprüft:

- Die App lief noch nie mit einem echten angemeldeten Nutzer gegen das Supabase-Projekt.
- Anmeldung über Google, Apple, Facebook und Passkey, die Bestätigungs- und Passwort-Mails und das Teilen-Menü brauchen ein echtes Gerät und echte Konten.
- Der CI-Workflow in `.github/workflows/ci.yml` ist noch nie gelaufen.

## Was als Nächstes ansteht

Bei Leonor (nur am Rechner möglich):

1. Paket entpacken und ins GitHub-Repo einchecken, am einfachsten mit GitHub Desktop.
2. Bei Vercel mit GitHub anmelden, das Repo importieren, die zwei Zugangswerte eintragen, deployen.
3. In Supabase unter Authentication, URL Configuration die Adresse der App als Site URL eintragen und `<Adresse>/auth/callback**` als Redirect URL erlauben.
4. App am Handy öffnen, auf den Homescreen legen, registrieren.
5. Optional: Google-Anmeldung einrichten (README), Angaben in `src/lib/legal.ts` eintragen.

Danach mit Claude: ersten echten Lauf über die Supabase-Logs begleiten, dann Schritt 5 und Schritt 6.

## Hinweise für Claude im neuen Chat

- Das Paket entpacken, `npm install` ausführen, dann wie gewohnt arbeiten. Vor jeder Änderung `docs/ENGINEERING.md` und bei Oberflächen `docs/DESIGN.md` lesen.
- Migrationen: neue Datei schreiben, lokal mit Postgres und den pgTAP-Tests prüfen, über den Supabase-Connector einspielen, danach die Datei auf die vergebene Versionsnummer umbenennen (`list_migrations`) und `src/lib/database.types.ts` neu generieren. Bestehende Migrationen nie ändern.
- Prüfungen am echten Projekt laufen als `do`-Block, der mit einer Ausnahme endet, damit alles zurückgerollt wird.
- Die Testumgebung des Chats erreicht weder das Supabase-Projekt noch Google Fonts. Deshalb liegt die Schrift lokal im Repo, und der Build läuft mit Platzhalter-Zugangswerten.
- Ansichten hinter der Anmeldung lassen sich mit einer vorübergehenden Vorschauseite und Beispieldaten im Browser prüfen. Die Vorschau wird vor dem Packen wieder entfernt.
- Am Ende jedes Schritts: Typprüfung, Lint, Vitest, Build, Datenbanktests, Roadmap nachziehen, Paket neu zippen.

## Getroffene Entscheidungen

- Konstanz zählt als Trainingstage je Woche in deutscher Zeit, nicht als Zahl der Workouts.
- Bestwerte: geschätztes Maximum für eine Wiederholung, bei Körpergewicht die meisten Wiederholungen, bei Halteübungen die längste Zeit, bei Distanz die Gesamtstrecke.
- Der Beitritt über einen Einladungslink braucht eine Bestätigung, weil Mitglieder gegenseitig ihre Workouts sehen.
- Beim Konto-Löschen übernimmt in Freundesgruppen das dienstälteste Mitglied, Coaching-Gruppen enden mit ihrem einzigen Coach.
- Passwort-Anmeldung bleibt, ein E-Mail-Code statt Passwort wurde verworfen.
- Der Übungskatalog ist selbst zusammengestellt statt aus einer englischen Datenbank importiert.
- Logo-Grün `#284238` bleibt dem Logo vorbehalten, der Akzent in der Oberfläche ist Moos `#156B4A`.
