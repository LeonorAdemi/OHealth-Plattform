# Ende-zu-Ende-Tests

Playwright-Tests für die vier Kernabläufe des Pilots (Strategie-Review, N6), je bei 390 px (Projekt `390`) und 1280 px (Projekt `1280`):

| Datei | Ablauf |
| --- | --- |
| `event-link.spec.ts` | Über den öffentlichen Event-Link registrieren, danach automatisch zugesagt, Mitglied der Community und Herkunft erfasst |
| `plan-series.spec.ts` | Training mit „Jede Woche wiederholen“ planen: acht Termine, alle geteilt, gleicher Wochentag und gleiche Uhrzeit |
| `attendance.spec.ts` | „Warst du dabei?“ mit Ja: Trainingstag im Wochenraster auf „Heute“ und in der Rangliste der Gruppe |
| `log-activity.spec.ts` | Aktivität eintragen: Trainingstag im Wochenraster und in der Rangliste der Gruppe |

Die Tests laufen in der CI bei jedem Pull Request (Job „Ende-zu-Ende“ in `.github/workflows/ci.yml`).

## Lokal ausführen

Braucht Docker und die Supabase CLI.

```sh
supabase start
eval "$(supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.publishable_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --override-name auth.secret_key=SUPABASE_SECRET_KEY)"
export NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY DB_URL
npx playwright install chromium   # einmalig
npm run test:e2e
```

Lokal startet Playwright den Entwicklungsserver auf Port 3100 (oder nutzt einen, der dort schon läuft). Mit `CI=1` läuft wie in der CI der fertige Build (`npm run build` vorher). Einen einzelnen Ablauf oder eine Breite: `npm run test:e2e -- attendance --project=390`.

## Testdaten

- Jeder Test legt seine Personen, Communities und Events selbst an (`support.ts`), mit zufälligen E-Mail-Adressen. Tests hängen nicht voneinander ab und laufen parallel.
- Konten entstehen über die Admin-API von Supabase Auth, alles Weitere per SQL wie in den Datenbanktests. Ein Event in der Vergangenheit entsteht wie dort: erst zusagen, dann verschieben.
- Vor und nach jedem Lauf entfernt `cleanup.ts` alle Testkonten (`e2e-…@example.com`) samt ihren Communities, Events und Aktivitäten. Die Datenbanktests erwarten eine leere Datenbank und laufen danach wieder.
- `support.ts` bricht ab, wenn Supabase-Adresse oder Datenbank nicht lokal sind. Previews und Produktion teilen sich eine Datenbank, Testdaten gehören nie dorthin.
- Die lokale Supabase begrenzt Anmeldungen auf 30 je fünf Minuten (`supabase/config.toml`). Ein Lauf braucht acht; wer viele Läufe hintereinander startet, wartet kurz.
