# Entdecken und Einstieg

„Entdecken“ je Stadt, Onboarding `/willkommen`, Warteliste, alte Adressen. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: Migration `discover`, Test 30.

## Daten und Regeln

- **Entdecken und Einstieg.** `discover_meetups` und `discover_communities` (security definer, nur Angemeldete, keine KI) zeigen für eine Stadt (`groups.city_id`) nur, was auch der öffentliche Event-Link zeigt: kommende Events in öffentlichen, nicht ausgeblendeten Communities, je Event einmal über `private.public_group_of_meetup`, ohne Namen von Personen, ohne Events von Blockierten, höchstens 31 Tage voraus. Die Stadt für „Entdecken“ ist die eigene, wenn sie live ist, sonst München (`discoverCityId`). Je Reihe zeigt „Entdecken“ nur den nächsten Termin; Communities, aus denen man gerade entfernt ist, fehlen. Wer sich ohne Link registriert (Formular, oder über Google nach der Zustimmung auf `/zustimmung`), landet auf `/willkommen`, solange Sportarten, Stadt und Warteliste leer sind (`needsOnboarding`). `save_onboarding` schreibt Sportarten und Stadt ins Profil und die Warteliste `city_interest` (eine Zeile je Person, nur Städte mit Stand „geplant“) in einem Schritt. Die Sportarten aus dem Einstieg filtern „Entdecken“ nicht; der Filter ist bewusst eine Auswahl auf der Seite. Bewusst offen: Wer die Stadt später im Profil als Text ändert, bleibt auf der Warteliste, bis das Profil die Stadt aus dem Katalog wählt. Adressen: `/aktivitaet/[id]` statt `/workouts/[id]`, `/gruppen` statt `/community`; `next.config.ts` leitet alte Adressen dauerhaft weiter, Detailseiten der Communities bleiben unter `/community/[id]` (Migration `discover`, Test 30).
