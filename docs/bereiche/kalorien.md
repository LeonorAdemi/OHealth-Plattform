# Kalorien

Kalorien je Aktivität und je Woche aus dem Kalorienfaktor der Sportart und dem freiwilligen Körpergewicht. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter, für das Gewicht besonders die Regel zu Gesundheitsdaten (Abschnitt 5).

Betrifft: Migration `calories`, Test 36 (und Test 6, Konto löschen), `src/modules/workouts/logic.ts` (`activityCalories`, `formatCalories`, `parseBodyWeight`), `queries.ts` (`getMyBodyWeight`, `getWeeklyCalories`), `actions.ts` (`saveBodyWeight`, `deleteBodyWeight`), `components/body-weight-form.tsx`, `quick-entry.tsx`, `activity-form.tsx`, `today-overview.tsx`, Einstellungen, Seite einer Aktivität, Datenschutzseite.

## Daten und Regeln

- **Formel.** kcal = MET der Sportart × Körpergewicht in kg × Stunden, gerundet. Minuten sind die Dauer einer Aktivität, sonst die Zeit von Start bis Ende eines Trainings mit Sätzen (wie `my_weekly_summary`). Die App rechnet je Aktivität mit `activityCalories`, die Datenbank je Woche mit `my_weekly_calories`; beide nach derselben Formel.
- **Kalorienfaktor.** `sports.met` (1 bis 20, Pflicht) je Sportart, gerundet nach dem Compendium of Physical Activities. Eine neue Sportart braucht einen Wert; ohne eigenen Wert gilt der von „Sonstiges“ (4,0).
- **Körpergewicht.** `body_weights` (30 bis 300 kg, eine Nachkommastelle) mit `consented_at`, je Person höchstens ein Eintrag, am Profil mit Kaskade. Gesundheitsdatum: lesen, ändern und löschen nur die Person selbst, eine KI nichts davon (einschränkende Regel). Gespeichert nur über `set_body_weight(p_weight_kg, p_consent)`, das ohne Einwilligung abbricht; die erste Einwilligung behält ihren Zeitpunkt. Gelöscht über die Tabelle, das widerruft die Einwilligung (Migration `calories`, Test 36).
- **Ohne Gewicht** gibt es nirgends Kalorien; `my_weekly_calories` liefert dann null.

## Oberfläche

- **Einstellungen, „Körpergewicht“** (`#gewicht`): Feld „Körpergewicht in kg“, Häkchen „Ich willige ein, dass OHealth mein Gewicht speichert, um Kalorien zu berechnen. Nur ich sehe es, eine verbundene KI nicht. Ich kann es jederzeit löschen.“, „Gewicht speichern“ als Umriss-Button, mit gespeichertem Gewicht dazu „Gewicht löschen“.
- **Beim Eintragen** (schnelle Ansicht und volles Formular): unter der Dauer „etwa 480 kcal“, aktualisiert mit Sportart und Dauer. Ohne Gewicht in der schnellen Ansicht „Gewicht angeben, um die Kalorien zu sehen.“ mit Link auf die Einstellungen.
- **Bei jeder Aktivität:** in „Deine Woche“ hinter den Angaben („Laufen · 42 min · 7,4 km · 480 kcal“) und auf der Seite der Aktivität als Angabe „Kalorien“.
- **„Heute“:** Kennzahl „Kalorien diese Woche“ mit dem Wert der Vorwoche, nur mit Gewicht.
