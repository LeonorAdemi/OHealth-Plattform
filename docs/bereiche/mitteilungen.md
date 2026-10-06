# Mitteilungen und Push

Push-Versand über `pg_net` und `/api/push`, Erinnerungen per `pg_cron`. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: `src/app/api/push`, `public/sw.js`, Migrationen `push_and_reminders`, `push_keys_in_db`, Test 16.

## Daten und Regeln

- **Push.** Neue Mitteilungen meldet die Datenbank per `pg_net` an `/api/push`. Die Route reicht das mitgeschickte Geheimnis an `push_payload` weiter; die Datenbank prüft es gegen `private.push_config` und liefert erst dann Inhalt, Geräte-Abos und das VAPID-Schlüsselpaar. Adresse, Geheimnis und Schlüsselpaar trägt der Betreiber je Umgebung im SQL-Editor ein, nie im Repo (Migration `push_keys_in_db`). In Vercel steht nur der öffentliche Schlüssel `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Erinnerungen legt `pg_cron` alle 15 Minuten an (Migration `push_and_reminders`, Test 16).
