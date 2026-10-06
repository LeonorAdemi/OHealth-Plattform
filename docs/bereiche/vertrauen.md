# Vertrauen und Recht

Melden, automatisches Ausblenden, Mitglieder entfernen, Nutzungsbedingungen. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: Migration `trust_and_safety`, Test 29, `src/lib/legal.ts`.

## Daten und Regeln

- **Vertrauen und Recht.** Gemeldet werden Nachrichten, Events, Personen und Communities über `reports` mit `category` und optionalem Text. Der Trigger `private.check_report` prüft: genau ein Ziel, Nachrichten und Events nur, wenn sichtbar (`can_access_chat`, `can_see_meetup`), nichts Eigenes, jedes Ziel einmal je Person, höchstens 30 am Tag; bei Nachricht und Event trägt er `reported_user_id` selbst ein, bei Communities bleibt es leer. Ob es eine gemeldete Person gibt, verrät die Fehlermeldung nicht. Ab drei Meldungen von Konten, die älter als einen Tag sind, setzt `private.hide_reported_message` `chat_messages.hidden_at` (mit Zeilensperre gegen gleichzeitige Meldungen); Nachrichten der Verwaltung einer Community werden nie automatisch ausgeblendet. Den Text lesen dann nur, wer schrieb, und die Verwaltung (restriktive Regeln `chat_messages_hidden` und `meetup_messages_hidden`, `chat_messages_page` mit `hidden`); `my_chats`, `unread_chat_count` und `push_payload` lassen ausgeblendete Nachrichten weg. Bewusst offenes Risiko: Drei ältere Konten können in einer offenen Community Nachrichten von Mitgliedern ausblenden; der Betreiber sieht das in `reports` und prüft. Mitglieder ohne Verwaltungsrolle entfernt die Verwaltung nur über `remove_group_member` (direkt löscht man nur die eigene Mitgliedschaft): Dabei fallen die Zusagen zu kommenden fremden Events weg, die die Person nur über diese Community sah, und `group_bans` sperrt den Wiederbeitritt 30 Tage lang auf jedem Weg (Trigger `check_group_ban`). Die Zustimmung zu den Nutzungsbedingungen steht in `terms_acceptances`: nur die aktuelle Fassung (`private.current_terms_version`, gleich `TERMS_VERSION` in `src/lib/legal.ts`), bei der Registrierung aus den Metadaten (`on_auth_user_created_terms`), sonst über `accept_terms`. Geprüft wird sie bewusst nur in der Oberfläche: Das App-Layout leitet ohne Zustimmung nach `/zustimmung` (dort auch Abmelden und Konto löschen); Server Actions, Beitrittslinks und KI-Zugriff prüfen sie nicht, und eine offene App merkt eine neue Fassung erst beim nächsten vollständigen Laden. Neue Fassung: neue Migration für `private.current_terms_version` und `TERMS_VERSION` gleichzeitig ändern. Eine KI darf nichts davon (Migration `trust_and_safety`, Test 29).

## Oberfläche

### Melden

Melden steht immer unten auf der Seite als gedämpfter Textlink („Training melden“, „Name melden“, „Community melden“) und klappt auf: Art als `ChoiceChip`, ein freiwilliger Satz, „Meldung senden“ als Umriss-Button. Nach dem Senden bleibt nur die Bestätigung stehen. Entfernen eines Mitglieds fragt einmal nach („Wirklich entfernen“, „Abbrechen“).
