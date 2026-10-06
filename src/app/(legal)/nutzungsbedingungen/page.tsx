import type { Metadata } from "next";
import Link from "next/link";

import { MIN_AGE, operator, orPlaceholder, TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: "Nutzungsbedingungen" };

const versionDate = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeZone: "Europe/Berlin",
}).format(new Date(`${TERMS_VERSION}T12:00:00Z`));

// Entwurf: Der Text wird vor dem öffentlichen Start rechtlich geprüft (docs/LEGAL.md).
export default function TermsPage() {
  return (
    <>
      <h1>Nutzungsbedingungen</h1>
      <p>Fassung vom {versionDate}</p>

      <h2>Worum es geht</h2>
      <p>
        OHealth ist eine App für gemeinsamen Sport: Aktivitäten eintragen, Trainings planen, sich in Communities
        verabreden und austauschen. Anbieter ist {orPlaceholder(operator.name, "Name des Betreibers")} (siehe{" "}
        <Link href="/impressum">Impressum</Link>). Die Nutzung ist kostenlos.
      </p>

      <h2>Dein Konto</h2>
      <p>
        Ein Konto darf anlegen, wer mindestens {MIN_AGE} Jahre alt ist. Je Person gibt es ein Konto. Halte deine
        Zugangsdaten geheim. Dein Name soll zu dir passen und niemanden nachahmen. Du kannst dein Konto jederzeit in
        deinem Profil löschen.
      </p>

      <h2>Wie wir miteinander umgehen</h2>
      <p>Nicht erlaubt sind:</p>
      <ul>
        <li>andere zu beleidigen, zu bedrohen oder zu belästigen, auch über Privatnachrichten</li>
        <li>Werbung, Spam und Kettenbriefe</li>
        <li>Inhalte, die gegen Gesetze verstoßen oder die Rechte anderer verletzen</li>
        <li>Daten anderer ohne deren Einverständnis zu teilen</li>
        <li>Trainings zu planen, die es nicht gibt, oder Menschen unter falschem Vorwand zu treffen</li>
      </ul>
      <p>
        Gib als Treffpunkt einen öffentlichen Ort an, keine Privatadresse. Wer eine Community gründet, sorgt dort für
        einen freundlichen Ton.
      </p>

      <h2>Melden und Moderation</h2>
      <p>
        Nachrichten, Trainings, Personen und Communities lassen sich melden. Wir sehen uns jede Meldung an. Haben drei
        verschiedene Personen dieselbe Nachricht gemeldet, wird sie bis zur Prüfung ausgeblendet. Wer eine Community
        verwaltet, kann Nachrichten im Chat der Community löschen und Mitglieder entfernen; entfernte Mitglieder können
        30 Tage lang nicht wieder beitreten. Bei Verstößen dürfen wir Inhalte entfernen und Konten vorübergehend oder
        dauerhaft sperren. Wir berücksichtigen dabei, wie schwer der Verstoß wiegt, und sagen dir, warum.
      </p>

      <h2>Training auf eigene Verantwortung</h2>
      <p>
        Trainings planen Mitglieder selbst, nicht wir. Ob du teilnimmst, entscheidest du. Achte auf deine Gesundheit und
        darauf, was du dir zutraust. OHealth ersetzt keine ärztliche oder physiotherapeutische Beratung, auch nicht über
        eine verbundene KI.
      </p>

      <h2>Deine Inhalte</h2>
      <p>
        Was du einträgst und schreibst, bleibt deins. Du erlaubst uns, es in der App so anzuzeigen, wie du es freigibst,
        also für die Personen, Gruppen und Communities, die es sehen sollen. Wie wir mit deinen Daten umgehen, steht in
        der <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <h2>Verfügbarkeit und Haftung</h2>
      <p>
        Wir entwickeln OHealth laufend weiter und können Funktionen ändern. Eine ständige Verfügbarkeit können wir nicht
        zusagen. Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden an Leben, Körper und
        Gesundheit. Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Pflichten und begrenzt
        auf den typischen, vorhersehbaren Schaden.
      </p>

      <h2>Änderungen</h2>
      <p>
        Ändern sich diese Bedingungen, zeigen wir dir die neue Fassung beim nächsten Öffnen der App. Du kannst zustimmen
        oder dein Konto löschen.
      </p>

      <h2>Recht und Kontakt</h2>
      <p>
        Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften deines Wohnsitzlandes bleiben unberührt. Fragen
        und Hinweise an {orPlaceholder(operator.email, "E-Mail-Adresse")}.
      </p>
    </>
  );
}
