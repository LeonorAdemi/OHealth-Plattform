# KI-Zugriff für Nutzer (MCP)

Verbundene KI-Apps über `/api/mcp`: was eine KI lesen und schreiben darf. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: `src/app/api/mcp`, `src/modules/workouts/mcp.ts`, `agent.ts`, `src/lib/supabase/agent.ts`, Migrationen `agent_read_only`, `agent_write_templates`, Tests 08 und 12.

## Daten und Regeln

- **KI-Zugriff für Nutzer (MCP).** Nutzer können eine KI-App über `/api/mcp` mit ihren Daten verbinden. Anmeldung und Bestätigung laufen über den OAuth-2.1-Server von Supabase Auth und die Seite `/oauth/consent`. Für Tokens mit dem Claim `client_id` gilt in der Datenbank: nur eigene Daten lesen, keine Gruppen, nichts löschen (Migration `agent_read_only`, Test `08_agent_access`). Einzige Ausnahme beim Schreiben sind eigene Vorlagen: Eine KI darf sie anlegen, umbenennen und neue Versionen erstellen, aber nur privat anlegen und nie die Sichtbarkeit ändern, denn eine öffentliche Vorlage zeigt den Namen der Person (Migration `agent_write_templates`, Test `12_agent_templates`). Aktivitäten, Übungen, Profil und Gruppen bleiben für eine KI nur lesbar. Über `list_workouts` liest sie Aktivitäten mit Sportart, Dauer, Distanz, Höhenmetern, Anstrengung und Sätzen; die Werkzeugnamen bleiben stabil, damit verbundene KI-Apps weiterlaufen. Der Endpunkt nimmt nur solche Tokens an. Neue Tabellen mit Nutzerdaten bekommen dieselbe einschränkende Regel und werden im Test ergänzt. Neue MCP-Werkzeuge sind lesend, solange hier nichts anderes steht; schreibende Werkzeuge gibt es nur für die genannte Ausnahme.
- **Wochenziel und Vorhaben.** Eine KI liest das eigene Wochenziel (`weekly_goals`) und die Vorhaben je Sportart (`weekly_sport_goals`), ändert oder löscht sie aber nicht (Migrationen `weekly_goal` und `sport_goals`, Tests 33 und 35). Ein MCP-Werkzeug dafür gibt es noch nicht.
