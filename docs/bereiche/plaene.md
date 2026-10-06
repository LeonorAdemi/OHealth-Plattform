# Pläne und Einheiten

Trainingspläne über mehrere Wochen und einzelne Einheiten, gefunden über ein Ziel auf „Entdecken“. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: `src/modules/plans/` (Katalog, Logik, Komponenten), `src/app/(app)/entdecken/page.tsx`, `src/app/(app)/entdecken/plaene/`, `src/app/(app)/entdecken/einheiten/`. Noch ohne Migration.

## Leitgedanke

Viele wissen, wohin sie wollen (10 km laufen), aber nicht, wie sie dorthin kommen. OHealth zeigt den Weg: Ziel wählen, sagen, wo man heute steht, und sehen, welche Pläne nacheinander dorthin führen, Woche für Woche, mit Zwischenzielen. Später landet der Plan mit einem Tipp im Kalender, und das Tracking zeigt, wie weit man ist. Die App ist damit der Coach, ohne dass man selbst planen muss. Jeder Plan beruht auf Studien und bewährter Praxis und nennt seine Quellen.

## Begriffe

- **Plan:** mehrere Wochen auf ein Ziel hin (Erste 5 km, 10 km, Kraft aufbauen).
- **Einheit:** ein einzelnes Training mit Ablauf (Tempodauerlauf 3 × 10 min). Jede Sportart hat eigene Einheiten und trägt anderes ein: Laufen Dauer und Distanz, Krafttraining Übungen mit Sätzen.
- **Training** bleibt, was man mit anderen plant (Events). Das Wort ist in der App vergeben.

## Daten und Regeln

- **Katalog im Code.** Pläne, Einheiten und Ziele stehen in `src/modules/plans/catalog.ts`, nicht in der Datenbank: Sie sind für alle gleich, brauchen keine Zugriffsregeln, und jede Änderung läuft als Pull Request durch die Prüfung. Sportarten verweisen auf die IDs aus dem Sportarten-Katalog (`sports.id`). Ziehen sie später in die Datenbank (etwa wenn Nutzer eigene Pläne teilen), kommt das in eine neue Migration.
- **Plan.** Eine Grundwoche von Montag bis Sonntag mit einer Einheit je Tag oder frei. In jeder `lighterEvery`-ten Woche und in den `taperWeeks` vor dem Ziel entfällt die Einheit am `lighterDay` (leichtere Woche, Erholen vor dem Wettkampf). Dazu Phasen, die alle Wochen lückenlos abdecken, Zwischenziele je Woche, die Grundlage als kurzer Text und mindestens eine Quelle. Die Wochen rechnet `planWeeks`, daraus „3–4× pro Woche“ und die Zahl der Einheiten.
- **Ziel und Ausgangsstand.** Ein Ziel hat einen oder mehrere Ausgangsstände („Ich laufe noch nicht“, „Ich laufe 30 Minuten am Stück“), jeder mit einem Weg aus Plänen in Reihenfolge. Wer noch nicht läuft und 10 km will, bekommt „Erste 5 km“ und danach „10 km“. Ein Stand ohne Pläne heißt: Ziel schon erreicht, mit Hinweis und Link zum nächsten Ziel. Hat ein Ziel nur einen Stand, fragt die Seite nicht danach. Zwischenziele laufen über alle Pläne eines Wegs mit fortlaufender Woche (`goalPath`).
- **Entwürfe.** Einträge mit `draft` sind Beispiele ohne geprüfte Quelle. Sie erscheinen lokal und in Vercel-Previews, in Produktion nicht (`visibleCatalog` mit `VERCEL_ENV`). In Produktion fallen auch Wege über einen Entwurf und Ziele ohne Weg weg; ohne Ziele zeigt „Entdecken“ den Abschnitt nicht. Ein fertiger Plan verweist nie auf eine Einheit im Entwurf.
- **Prüfung des Katalogs.** `src/modules/plans/logic.test.ts` prüft bei jedem Lauf: eindeutige Adressen, Sportarten aus dem Katalog, sieben Tage je Plan mit bekannten Einheiten, Quellen, lückenlose Phasen, Zwischenziele innerhalb des Plans, Ziele mit bekannten Plänen und Einheiten.

## Oberfläche

- **Entdecken:** Unter dem Titel „Was hast du vor?“ mit den Zielen als Auswahl-Chips (`?ziel=`), danach „Wo stehst du heute?“ (`?stand=`, ein Wechsel des Ziels setzt ihn zurück). Dann „Dein Weg“: die Dauer als Zahl („16 Wochen“), darunter „2 Pläne nacheinander, 54 Einheiten“, die Pläne als Zeilen in Reihenfolge und die Zwischenziele mit Woche. Darunter „Einzelne Einheiten dazu“ und der Link „Alle Pläne und Einheiten“. Trainings und Communities der Stadt folgen wie bisher; ab 1280 px stehen sie rechts daneben.
- **Alle Pläne und Einheiten** (`/entdecken/plaene`): Chips für die Art (Alle, Pläne, Einheiten, `?art=`) und die Sportart (`?sport=`, nur Sportarten aus dem Katalog), darüber die Zahl der Treffer. Ab 1280 px Pläne und Einheiten nebeneinander. Die Suche kommt in einem eigenen Schritt dazu.
- **Zeilen:** Links ein Zahlenblock wie das Datum eines Trainings, beim Plan die Wochen („8 Wo.“), bei der Einheit die Minuten. Dann Name mit Punkt in Sportfarbe, darunter „Laufen und Krafttraining · 3–4× pro Woche“ und das Niveau, bei der Einheit „Laufen · Locker“.
- **Seite eines Plans** (`/entdecken/plaene/[slug]`): Titel, Sportarten und Niveau, die Wochen als Großzahl, „3–4× pro Woche, 30 Einheiten insgesamt“. Dann „Passt zu dir, wenn“, „Zwischenziele“, „Eine Woche aus dem Plan“ (Einheiten mit Wochentag). „Aufbau“ zeigt alle Wochen als Raster aus Quadraten wie das Wochenraster, gefüllt in der Sportfarbe, frei in Nebel, Phasen am Rand und eine Legende mit den Namen der Sportarten. Zuletzt „Grundlage“ mit Quellen. Ab 1280 px stehen Aufbau und Grundlage rechts in 288 px.
- **Seite einer Einheit** (`/entdecken/einheiten/[slug]`): die Minuten als Großzahl, „Ablauf“, „Warum“, „Was du einträgst“ aus den Angaben der Sportart (`trackedFields`) und „Teil dieser Pläne“.
- Entwürfe tragen auf ihrer Seite den Satz „Entwurf: Inhalt und Quellen sind noch nicht geprüft.“
- Farbe: nur Sportfarben, kein Moos, solange es keinen eigenen Fortschritt gibt.

## Beschlossen, noch nicht gebaut

- **Plan starten:** fragt nach Wettkampftag oder Beginn und den Trainingstagen. Die Einheiten erscheinen danach in „Deine Woche“ auf Heute und lassen sich einzeln verschieben oder absagen. Sie werden aus Beginn und Trainingstagen berechnet und nicht einzeln als Trainings gespeichert, denn ein Plan hat bis zu 75 Einheiten und `plan_meetup` erlaubt höchstens 60 geplante Trainings.
- **Mehrere Pläne gleichzeitig** sind erlaubt.
- **Vorhaben:** Ein gestarteter Plan setzt die Vorhaben je Sportart auf Heute (Laufen 3× pro Woche).
- **Vorlagen je Sportart:** Jede Einheit lässt sich als Vorlage speichern, mit den Angaben ihrer Sportart. Heute gibt es Vorlagen nur für Sportarten mit Sätzen; die Erweiterung braucht eine Migration.
- **Suche** über Pläne und Einheiten auf `/entdecken/plaene`.
- **Wissensbasis und geprüfte Pläne:** Eine Wissensbasis in Markdown mit geprüften Quellen ist Grundlage für jeden Plan; danach ersetzen geprüfte Pläne die Entwürfe.
