# Chats

Chats von Events und Communities, Privatchats, Nachrichtenanfragen, Gelesen-Stand. Verbindlich wie `docs/ENGINEERING.md` und `docs/DESIGN.md`; die allgemeinen Regeln dort gelten weiter.

Betrifft: src/modules/core (Chat-Actions und -Queries), `src/modules/core/components/chat-*.tsx`, Migrationen `chats`, `chat_inbox`, `community_chat`, Tests 18–20.

## Daten und Regeln

- **Chats.** Alle Chats liegen in `chats` (Art `meetup` oder `community`, später Privatchats), Nachrichten in `chat_messages`, der Gelesen-Stand je Person in `chat_reads`. Wer einen Chat sieht und darin schreibt, entscheidet allein `private.can_access_chat`: beim Event, wer zugesagt hat; bei der Community alle Mitglieder, Coaching-Gruppen ausgenommen. Chats entstehen nur per Trigger. Namen und Profilbilder im Chat kommen aus `chat_messages_page`, die Übersicht mit ungelesenen Nachrichten aus `my_chats`, die Zahl am Tab aus `unread_chat_count`. Wer einer Community beitritt, hat ihren Chat bis dahin gelesen (Migration `chat_inbox`, Test 19). Im Community-Chat darf die Verwaltung (admin, coach) jede Nachricht löschen, im Event-Chat löscht jede Person nur ihre eigenen. Chat-Nachrichten erzeugen Mitteilungen `message` bzw. `community_message` nur für den Push; die Glocke zeigt sie nicht. Push für Community-Chats ist voreingestellt aus (Migration `community_chat`, Test 20). Die alte Tabelle `meetup_messages` ist nur noch eine Brücke für Rollbacks und wird später entfernt (Migration `chats`, Test 18).

## Oberfläche

- **Nachrichtenanfragen:** In „Chats“ oben ein eigener Abschnitt „Nachrichtenanfragen“. Im Chat steht über den Nachrichten eine Leiste mit „Annehmen“ (gefüllt) und „Ablehnen“ (Umriss). Eigene offene Anfragen tragen statt der Uhrzeit „Angefragt“.

### Chat-Liste

Unter „Chats“ stehen alle Chats als Zeilen, die neueste Nachricht zuerst:

- Links beim Training derselbe Datumsblock wie auf der Pinnwand, bei einer Community die Initialen im runden Feld wie beim Profilbild.
- Titel in Text, darunter die letzte Nachricht in Klein mit Namen davor („Du: …“), eine Zeile, gekürzt.
- Rechts oben der Zeitpunkt (heute die Uhrzeit, gestern „Gestern“, sonst das Datum), darunter die Zahl ungelesener Nachrichten in einem Kreis in Eisen. Mit ungelesenen Nachrichten stehen Zeitpunkt und Vorschau in Eisen statt Stein. Kein Moos.

### Chat-Zeilen

- Auf der Community-Seite steht über den Reitern eine Zeile „Chat der Community“ mit Sprechblasen-Icon, letzter Nachricht und Zahl ungelesener Nachrichten. Dieselbe Zeile führt auf der Seite eines Trainings zu seinem Chat.
- In Listen von Trainings (Pinnwand, „Gemeinsam trainieren“) steht unter Titel und Angaben eine kurze Chat-Zeile in Klein: Icon (16 px), letzte Nachricht, Zahl ungelesener Nachrichten. Wer nicht zugesagt hat, liest dort „Chat nach Zusage“.
- In einem Community-Chat kann die Verwaltung auch fremde Nachrichten antippen und löschen. Das „Nachricht löschen“ steht dann unter der Blase auf der Seite der Blase.

### Chat

Der Chat eines Trainings oder einer Community folgt bewusst dem Muster bekannter Messenger, weil es dort jeder sofort bedienen kann. Das ist die einzige Stelle mit Flächen statt Linien:

- Eigene Nachrichten rechts in Eisen mit weißer Schrift, andere links in Nebel. Kein Moos.
- Sprechblasen mit 16 px Rundung, die letzte einer Folge an der Seite des Absenders mit 6 px.
- Name nur über der ersten Nachricht einer Folge (gleiche Person, höchstens fünf Minuten Abstand).
- Uhrzeit klein in der Blase, bei eigenen Nachrichten mit Uhr (wird gesendet) oder Häkchen (gesendet).
- Tagestrenner („Heute“, „Gestern“, „Do, 1. Okt.“) als kleine Fläche in Nebel, mittig.
- Eingabe unten fest, rundes Feld und runder Senden-Button in Eisen. Am Rechner sendet Enter.
- Ein Tipp auf eine Nachricht zeigt darunter die möglichen Aktionen als Textlinks: „Nachricht löschen“ (eigene, oder als Verwaltung) und „Melden“ (fremde). „Melden“ klappt die Arten als Umriss-Buttons auf, ein Tipp sendet.
- Ausgeblendete Nachrichten bleiben als Blase stehen, kursiv und gedämpft: „Ausgeblendet nach Meldungen“. Wer sie geschrieben hat oder die Community verwaltet, sieht den Text mit dem Hinweis „Für andere ausgeblendet nach Meldungen“.
