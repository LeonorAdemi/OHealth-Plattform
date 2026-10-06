# Heute

Die Startseite: der eigene Stand der Woche auf einen Blick, das Anstehende und der Kalender. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: `src/app/(app)/page.tsx`, `src/modules/workouts/components/today-overview.tsx`, `week-grid.tsx`, `weekly-goal-form.tsx`, `src/modules/core/components/week-plan.tsx`, Migration `weekly_goal`, Test 33.

## Daten und Regeln

- **Wochenziel.** `weekly_goals` hält je Person ein Ziel in Trainingstagen (1 bis 7), eine Zeile je Person, am Profil mit Kaskade. Eigene Tabelle statt Spalte in `profiles`, weil Profile auch andere sehen; das Ziel sieht nur die Person selbst. Gesetzt im Einstieg über `save_onboarding` (dritter Parameter `p_weekly_goal`, vorbelegt mit 3, ohne ihn bleibt ein gespeichertes Ziel unverändert, damit alter Code nach einem Rollback weiterläuft) und unter Einstellungen (`saveWeeklyGoal`, `#wochenziel`). Wer über einen Link kommt, sieht den Einstieg nicht und findet auf „Heute“ den Link „Wochenziel festlegen“. Eine KI liest das Ziel, ändert es nicht (Migration `weekly_goal`, Test 33).
- **Wochen im Überblick.** `my_weekly_summary(p_weeks)` (security invoker, nur eigene Daten) liefert für 1 bis 53 Wochen, die laufende zuerst und auch ohne Training, Trainingstage, Minuten und Distanz in deutscher Zeit. Minuten sind die Dauer einer Aktivität, sonst die Zeit von Start bis Ende eines Trainings mit Sätzen; Distanz kommt nur aus Aktivitäten. „Heute“ fragt 53 Wochen ab: zwölf für die Übersicht, alle für die Serie.
- **Serie.** Wochen in Folge mit erreichtem Ziel, ohne Ziel mit mindestens einem Trainingstag (`goalStreak`). Ist das Ziel in der laufenden Woche noch offen, zählt die Serie ab der Vorwoche. Höchstens 53 Wochen.
- **Neue Bestwerte.** `my_new_bests(p_from)` nennt höchstens fünf Übungen, deren geschätztes Maximum (wie `v_exercise_bests`) seit Montag höher ist als in allen Trainings davor. Die erste Einheit einer Übung ist kein neuer Bestwert.
- **Prozent und Sätze** rechnet `workouts/logic.ts` (`goalProgress`, `describeGoal`): abgerundet, höchstens 100 %, nie geschönt.

## Oberfläche

- **Oben** die Großzahl der Trainingstage dieser Woche. Mit Ziel darunter „von 4 Trainingstagen“, das Wochenraster mit Ziel (`GoalGrid`, `docs/DESIGN.md`, Abschnitt 6) und ein Satz: „50 % deines Wochenziels. Noch 2 Tage.“, „Wochenziel erreicht.“ oder „Wochenziel erreicht, 1 Tag mehr.“ Ohne Ziel das gewohnte Wochenraster und der Textlink „Wochenziel festlegen“.
- **Kennzahlen** neben der Großzahl (am Handy darunter): Minuten diese Woche, Distanz diese Woche (nur wenn es in dieser oder der Vorwoche Distanzen gab) und die Serie in Wochen, je als Zahl in 24 px mit Einheit in Stein, darunter die Bedeutung und in Stein der Wert der Vorwoche. Keine Pfeile, keine Farben für besser oder schlechter.
- **Als Nächstes:** das nächste Training der kommenden sieben Tage als Zeile mit Datumsblock, Titel, Zeit, Sportart und Treffpunkt. Ohne Training entfällt der Abschnitt.
- **Kalender („Deine Woche“):** oben ein Streifen Montag bis Sonntag mit Wochentag, Datum (heute halbfett und unterstrichen) und je Tag einem Feld: gefüllt in Eisen erledigt, Rahmen in Eisen geplant, Nebel frei. Darunter eine Legende. Ein Tipp auf einen Tag mit Einträgen springt zu ihm, auf einen freien Tag ab heute öffnet „Training planen“ mit diesem Tag. Darunter als Zeilen nur Tage mit Einträgen und heute („Heute“, ohne Eintrag „Nichts geplant“), je mit „+“ zum Planen. Eine Woche ohne Einträge sagt „In dieser Woche ist nichts eingetragen.“ Blättern bis acht Wochen zurück und voraus.
- **Rechte Spalte** am Desktop (ab 1024 px, 288 px breit), am Handy unter dem Kalender: „Neue Bestwerte“ als Zeilen mit dem Wert in Moos hell und dem Wort „Bestwert“, darunter „vorher …“ in Stein; „Letzte 12 Wochen“ als Wochenraster untereinander in Eisen mit Kalenderwoche und „3 von 4“ (ohne Ziel „3 Tage“), Wochen mit erreichtem Ziel halbfett. Die Raster dort tragen keine eigene Beschriftung, die Zahl steht als Text daneben. Ohne Trainingstag in zwölf Wochen entfällt die Übersicht.
- **Moos** steht auf „Heute“ nur im Wochenraster (mit oder ohne Ziel) und hinter neuen Bestwerten. Kalender und Übersicht bleiben in Eisen.
