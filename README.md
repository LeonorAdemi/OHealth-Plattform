# OHealth-Plattform

Workouts tracken und in der Gruppe vergleichen. Später erweitert um Physio- und Health-Module.

Stand: Draft 1 mit Anmeldung (E-Mail, Apple, Google, Facebook, Passkey), Passwort zurücksetzen, Workout loggen (Katalog mit gut hundert Übungen, Suche, Icons je Muskelgruppe und Skizze je Übung), ansehen, korrigieren und löschen, Verlauf, Workout-Vorlagen mit Versionen (privat oder öffentlich, kopierbar), Communities (öffentlich mit Suche nach Sportart und Ort, privat oder Coaching) mit Teilen-Link und Beitritt direkt nach der Registrierung, Wochenplan mit geplanten Trainings, die man mit Communities teilt (Pinnwand, Zusage, Chat der Teilnehmer, Kalendereintrag), Ranglisten für Konstanz und Bestwerte je Übung, Profil mit Konto-Löschen sowie KI-Zugriff über MCP für Trainingstipps.

## Einmalig einrichten

Das Supabase-Projekt `ohealth` (Region Frankfurt) existiert bereits, alle Migrationen aus `supabase/migrations/` sind dort eingespielt.

1. Abhängigkeiten installieren: `npm install`
2. `.env.example` nach `.env.local` kopieren und URL und Publishable Key des Projekts eintragen (Supabase, Project Settings, API).
3. `npm run dev` starten und http://localhost:3000 öffnen.
4. Für das Hosting das Repo bei Vercel importieren und dort dieselben Umgebungsvariablen setzen.
5. In Supabase unter Authentication, URL Configuration die Adresse der App als Site URL eintragen und `<Adresse>/auth/callback**` als Redirect URL erlauben. Die beiden Sterne sind nötig, weil Einladungs- und Passwort-Links ein Ziel anhängen. Für die lokale Entwicklung zusätzlich `http://localhost:3000/auth/callback**`.

Für Datenbanktests und neue Migrationen die Supabase CLI installieren und das Repo mit `supabase init` und `supabase link` verbinden. Die Dateinamen in `supabase/migrations/` entsprechen den Versionen im Projekt, `supabase db push` spielt also nur neue Migrationen ein.

### Anmeldung mit Apple, Google und Facebook

Welche Buttons auf der Anmeldeseite erscheinen, steuert `NEXT_PUBLIC_AUTH_PROVIDERS` in `.env.local` und in Vercel, zum Beispiel `google` oder `apple,google,facebook`. Dort nur eintragen, was in Supabase fertig eingerichtet ist. Ohne Eintrag gibt es nur die Anmeldung per E-Mail.

Für jeden Anbieter gilt derselbe Ablauf:

1. Beim Anbieter eine App bzw. einen OAuth-Client anlegen und als Weiterleitungs-URI `https://<dein-projekt>.supabase.co/auth/v1/callback` eintragen.
2. In Supabase unter Authentication, Providers den Anbieter aktivieren und die Zugangsdaten eintragen.
3. Den Anbieter in `NEXT_PUBLIC_AUTH_PROVIDERS` ergänzen.

| Anbieter | Wo anlegen | Voraussetzung |
| --- | --- | --- |
| Google | Google Cloud Console, OAuth-Client vom Typ Webanwendung | Google-Konto |
| Facebook | Meta for Developers, App mit Facebook Login | Meta-Entwicklerkonto |
| Apple | Apple Developer, Services ID und Schlüssel für Sign in with Apple | Kostenpflichtige Mitgliedschaft im Apple Developer Program |

Die aktuellen Schritt-für-Schritt-Anleitungen stehen in der Supabase-Dokumentation unter „Social Login". Schritt 5 oben muss erledigt sein, sonst endet die Anmeldung nicht wieder in der App.

### Anmeldung per Passkey (Face ID, Fingerabdruck)

1. In Supabase unter Authentication, Passkeys die Passkey-Anmeldung aktivieren. Die Angaben zur Domain füllt Supabase aus der Site URL vor.
2. `NEXT_PUBLIC_PASSKEYS=true` in `.env.local` und in Vercel setzen.

Passkeys funktionieren nur über HTTPS und sind an die Domain gebunden. Ein Nutzer meldet sich einmal auf anderem Weg an, richtet im Profil einen Passkey ein und kann sich danach mit „Mit Passkey anmelden" einloggen. Supabase führt die Funktion in der Dokumentation noch als experimentell.

### Einladungslinks und Passwort zurücksetzen

Beides braucht keine weitere Einrichtung außer Schritt 5. Der Einladungslink einer Gruppe steht auf der Seite „Gruppe" unter „Einladen". Die Mail zum Zurücksetzen verschickt Supabase, den Text passt du unter Authentication, Emails an.

### KI-Zugriff über MCP (Trainingstipps mit Claude)

OHealth bietet unter `<Adresse>/api/mcp` einen MCP-Server. Eine KI-App wie Claude kann damit die eigenen Workouts, Trainingstage und Bestwerte lesen, nichts ändern und keine Gruppendaten sehen.

Einmalig in Supabase unter Authentication, OAuth Server:

1. OAuth 2.1 Server einschalten.
2. Dynamic client registration erlauben. Claude und andere Apps registrieren sich damit selbst.
3. Als Authorization path `/oauth/consent` eintragen. Die Site URL aus Schritt 5 oben muss auf die App zeigen.

Verbinden, zum Beispiel in Claude:

1. In OHealth im Profil unter „KI-Zugriff" die Adresse kopieren.
2. In Claude unter Einstellungen, Connectors einen eigenen Connector hinzufügen und die Adresse einfügen.
3. Claude öffnet die Anmeldung von OHealth und danach die Bestätigungsseite. Mit „Zugriff erlauben" ist die Verbindung fertig.
4. In einem Chat fragen, etwa „Wie lief mein Training in den letzten vier Wochen?", oder die Vorlage „Trainingsanalyse" wählen.

Werkzeuge: `get_profile`, `list_workouts`, `get_consistency`, `get_personal_bests`. Den Zugriff entziehst du im Profil. Zum Ausprobieren ohne Claude eignet sich der MCP Inspector (`npx @modelcontextprotocol/inspector`, Transport Streamable HTTP).

## Befehle

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | App lokal starten |
| `npm run typecheck` | Typprüfung |
| `npm run lint` | Lint |
| `npm test` | Logik-Tests (Vitest) |
| `npm run test:db` | Datenbanktests (pgTAP, braucht `supabase start`) |
| `npm run build` | Produktions-Build |

## Dokumente

- `docs/DESIGN.md`: verbindliche Gestaltungsregeln
- `docs/ENGINEERING.md`: verbindliche Regeln für Architektur, Performance, Sicherheit und Tests
- `docs/UEBERGABE.md`: Gesamtstand zum Weiterarbeiten in einem neuen Chat
- `docs/ROADMAP.md`: Reihenfolge und Stand der Weiterentwicklung
- `docs/LEGAL.md`: Stand der Rechtstexte und was vor echten Nutzern zu klären ist
- `CLAUDE.md`: Hinweise für KI-Assistenten, die im Repo arbeiten

## Aufbau

```
supabase/migrations/   Datenmodell
supabase/tests/        Datenbanktests
src/app/               Seiten und Routen
src/modules/core/      Profile, Gruppen, Anmeldung
src/modules/workouts/  Workouts, Trainingstage, Rangliste
src/components/ui/     Bausteine (Origin UI)
src/lib/               Supabase-Anbindung, Typen, Hilfsfunktionen
```

Die App lässt sich über das Browser-Menü auf dem Homescreen installieren. Logo und App-Icons liegen in `public/` und `src/app/`.

Die Schrift Archivo steht unter der SIL Open Font License (`src/app/fonts/OFL.txt`), die UI-Bausteine basieren auf Origin UI (MIT).
