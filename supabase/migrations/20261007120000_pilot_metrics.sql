-- O-Health-Plattform · Migration 0038
-- Kennzahlen für den Pilot (Strategie-Review, N6).
--
-- - private.pilot_metrics(woche) liefert die Kennzahlen aus docs/strategie/09-strategie-review.md
--   („Kennzahlen mit Untergrenze“) für eine Woche (Montag bis Sonntag, deutsche Zeit) in einer
--   Zeile. Nur zusammengefasste Zahlen, keine Personen, keine IDs, keine Namen.
-- - Abgelesen wird einmal pro Woche im SQL-Editor, ohne Tracking-Dienste:
--     select * from private.pilot_metrics();                     -- laufende Woche
--     select * from private.pilot_metrics(date '2026-11-16');    -- Woche, in der der Tag liegt
--   Mehrere Wochen auf einmal:
--     select m.* from generate_series(date '2026-11-16', current_date, interval '1 week') w,
--       private.pilot_metrics(w::date) m;
-- - Die Kennzahl „Organisatorinnen mit ja oder vielleicht zur Bezahlung“ stammt aus den Gesprächen
--   und steht nicht in der Datenbank.
-- - Nur für den Betreiber: nicht über die API erreichbar, für niemanden außer dem Eigentümer
--   ausführbar, auch nicht für eine KI.
--
-- Begriffe:
-- - Aktiv in einer Woche ist, wer in ihr eine Aktivität gemacht hat (workouts.performed_at), bei einem
--   Event zugesagt oder eines geplant hat (meetup_participants.created_at, wer plant, sagt dabei zu)
--   oder im Chat geschrieben hat.
-- - Ein Event zählt, wenn es in der Woche beginnt und mit mindestens einer Gruppe oder Community
--   geteilt ist. Private Pläne nur für sich selbst zählen nicht.
-- - Zusagen pro Event ohne die planende Person: gezählt wird, wer mitkommt.
-- - Woche 4: Wer in der Woche drei Wochen vorher ein Konto erstellt hat, ist jetzt in seiner vierten
--   Woche. Anteil davon, der jetzt aktiv ist.
-- - Events und eigene Aktivitäten (H4): Anteil der Aktiven, die in den letzten vier Wochen (diese
--   und die drei davor) sowohl eine Aktivität aus einem Event (source = 'event') als auch eine eigene
--   haben. Eine einzelne Woche ist dafür zu kurz.
-- - Push: Anteil der Aktiven mit mindestens einem Gerät mit Push. Geräte haben keinen Verlauf, die
--   Zahl gilt deshalb für den Zeitpunkt der Abfrage und wird für die laufende Woche abgelesen.
--
-- Die Abfrage läuft einmal pro Woche von Hand. Zusätzliche Indizes auf Zeitspalten lohnen dafür
-- nicht und würden jedes Schreiben verlangsamen.

create function private.pilot_metrics(p_day date default (now() at time zone 'Europe/Berlin')::date)
returns table (
  woche_ab              date,
  aktive_gruppen        integer,
  events                integer,
  zusagen_pro_event     numeric,
  neue_nutzer           integer,
  neue_ueber_link       integer,
  anteil_ueber_link     numeric,
  kohorte_woche_4       integer,
  davon_aktiv_woche_4   integer,
  anteil_aktiv_woche_4  numeric,
  aktive                integer,
  aktive_mit_beidem     integer,
  anteil_beides         numeric,
  aktive_mit_push       integer,
  anteil_push           numeric
)
language sql stable set search_path = '' as $$
  with bounds as (
    select
      monday,
      (monday::timestamp at time zone 'Europe/Berlin')                       as week_from,
      ((monday + 7)::timestamp at time zone 'Europe/Berlin')                 as week_to,
      ((monday - 21)::timestamp at time zone 'Europe/Berlin')                as window_from,
      ((monday - 21)::timestamp at time zone 'Europe/Berlin')                as cohort_from,
      ((monday - 14)::timestamp at time zone 'Europe/Berlin')                as cohort_to
    from (select date_trunc('week', p_day)::date as monday) d
  ),
  active as (
    select w.user_id
    from public.workouts w, bounds b
    where w.performed_at >= b.week_from and w.performed_at < b.week_to
    union
    select p.user_id
    from public.meetup_participants p, bounds b
    where p.created_at >= b.week_from and p.created_at < b.week_to
    union
    select c.user_id
    from public.chat_messages c, bounds b
    where c.created_at >= b.week_from and c.created_at < b.week_to
  ),
  shared_events as (
    select m.id, m.created_by
    from public.meetups m, bounds b
    where m.starts_at >= b.week_from and m.starts_at < b.week_to
      and exists (select 1 from public.meetup_shares s where s.meetup_id = m.id)
  ),
  event_numbers as (
    select
      count(*)::integer as events,
      round(avg((
        select count(*) from public.meetup_participants p
        where p.meetup_id = e.id and p.user_id <> e.created_by
      )), 1) as per_event
    from shared_events e
  ),
  newcomers as (
    select pr.id, exists (select 1 from private.signup_sources s where s.user_id = pr.id) as via_link
    from public.profiles pr, bounds b
    where pr.created_at >= b.week_from and pr.created_at < b.week_to
  ),
  cohort as (
    select pr.id, exists (select 1 from active a where a.user_id = pr.id) as is_active
    from public.profiles pr, bounds b
    where pr.created_at >= b.cohort_from and pr.created_at < b.cohort_to
  ),
  active_details as (
    select
      a.user_id,
      exists (
        select 1 from public.workouts w, bounds b
        where w.user_id = a.user_id and w.source = 'event'
          and w.performed_at >= b.window_from and w.performed_at < b.week_to
      ) and exists (
        select 1 from public.workouts w, bounds b
        where w.user_id = a.user_id and w.source <> 'event'
          and w.performed_at >= b.window_from and w.performed_at < b.week_to
      ) as has_both,
      exists (select 1 from public.push_subscriptions s where s.user_id = a.user_id) as has_push
    from active a
  )
  select
    b.monday,
    (select count(distinct s.group_id)::integer
       from shared_events e join public.meetup_shares s on s.meetup_id = e.id),
    n.events,
    n.per_event,
    (select count(*)::integer from newcomers),
    (select count(*) filter (where via_link)::integer from newcomers),
    (select round(100.0 * count(*) filter (where via_link) / nullif(count(*), 0), 1) from newcomers),
    (select count(*)::integer from cohort),
    (select count(*) filter (where is_active)::integer from cohort),
    (select round(100.0 * count(*) filter (where is_active) / nullif(count(*), 0), 1) from cohort),
    (select count(*)::integer from active_details),
    (select count(*) filter (where has_both)::integer from active_details),
    (select round(100.0 * count(*) filter (where has_both) / nullif(count(*), 0), 1) from active_details),
    (select count(*) filter (where has_push)::integer from active_details),
    (select round(100.0 * count(*) filter (where has_push) / nullif(count(*), 0), 1) from active_details)
  from bounds b, event_numbers n;
$$;

comment on function private.pilot_metrics(date) is
  'Kennzahlen des Pilots für die Woche, in der der Tag liegt (N6). Nur zusammengefasste Zahlen; Anteile in Prozent.';

revoke execute on function private.pilot_metrics(date) from public, anon, authenticated, service_role;
