import type { Metadata } from "next";

import { operator, orPlaceholder } from "@/lib/legal";
import {
  enabledProviders,
  passkeysEnabled,
  type AuthProvider,
} from "@/modules/core/logic";

export const metadata: Metadata = { title: "Datenschutz" };

const PROVIDER_NAMES: Record<AuthProvider, string> = {
  apple: "Apple (Apple Distribution International Ltd., Irland)",
  google: "Google (Google Ireland Ltd., Irland)",
  facebook: "Facebook (Meta Platforms Ireland Ltd., Irland)",
};

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Beschreibt, was die App tatsächlich mit Daten tut. Ändert sich die Verarbeitung
// (neue Tabelle, neuer Dienst, neues Modul), wird diese Seite im selben Schritt angepasst.
export default function PrivacyPage() {
  const providers = enabledProviders(process.env.NEXT_PUBLIC_AUTH_PROVIDERS);
  const passkeys = passkeysEnabled(process.env.NEXT_PUBLIC_PASSKEYS);

  return (
    <>
      <h1>Datenschutz</h1>
      <p>
        Hier steht, welche Daten OHealth verarbeitet, wofür, und was du selbst
        in der Hand hast.
      </p>

      <h2>Wer verantwortlich ist</h2>
      <p>
        {orPlaceholder(operator.name, "Name des Betreibers")}
        <br />
        {orPlaceholder(operator.street, "Straße und Hausnummer")}
        <br />
        {orPlaceholder(operator.city, "Postleitzahl und Ort")}
        <br />
        E-Mail: {orPlaceholder(operator.email, "E-Mail-Adresse")}
      </p>

      <h2>Welche Daten wir verarbeiten</h2>
      <ul>
        <li>
          <strong>Konto:</strong> deine E-Mail-Adresse, dein Anzeigename und,
          wenn du dich mit E-Mail anmeldest, dein Passwort. Es wird nicht im
          Klartext gespeichert, sondern nur als nicht umkehrbarer Hashwert.
        </li>
        <li>
          <strong>Training:</strong> deine Workouts mit Datum, Titel, Übungen
          und Sätzen (Wiederholungen, Gewicht, Dauer, Distanz). Bei einem
          Training aus einer Vorlage zusätzlich Start und Ende, die Pausen
          zwischen den Sätzen und welche Vorlage du verwendet hast.
        </li>
        <li>
          <strong>Vorlagen:</strong> deine Workout-Vorlagen mit Namen,
          Übungen, Zielwerten, Sichtbarkeit und dem Verlauf früherer Versionen.
        </li>
        <li>
          <strong>Communities:</strong> in welchen Communities du Mitglied bist, seit
          wann und in welcher Rolle.
        </li>
        <li>
          <strong>Geplante Trainings und Chat:</strong> Trainings, die du
          planst (Titel, Zeitpunkt, optional Vorlage, Treffpunkt, Höchstzahl,
          Notiz), mit welchen Communities du sie teilst, bei welchen Trainings
          du zugesagt hast und deine Nachrichten im Chat eines Trainings.
        </li>
        <li>
          <strong>Mitteilungen:</strong> Hinweise in der App, etwa dass jemand
          ein Training geteilt, bei deinem zugesagt oder im Chat geschrieben
          hat, mit Anzeigename, Titel und Zeitpunkt, ob du sie gelesen hast,
          und welche Mitteilungen du bekommen willst. Schaltest du Push ein,
          speichern wir je Gerät die Push-Adresse und die Schlüssel, die dein
          Browser dafür erzeugt.
        </li>
        <li>
          <strong>Technische Daten:</strong> beim Aufruf der App fallen bei
          unseren Dienstleistern Protokolldaten an, zum Beispiel IP-Adresse,
          Zeitpunkt und aufgerufene Seite.
        </li>
      </ul>
      <p>
        Wir erheben keine Standortdaten, zeigen keine Werbung und geben keine
        Daten zu Werbezwecken weiter.
      </p>

      <h2>Wofür wir die Daten verwenden</h2>
      <p>
        Wir verwenden deine Daten, um dir die App bereitzustellen: anmelden,
        Workouts und Vorlagen speichern und anzeigen, Ranglisten in deinen
        Communities berechnen.
        Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1
        Buchstabe b DSGVO). Protokolldaten dienen dem sicheren und stabilen
        Betrieb (Art. 6 Abs. 1 Buchstabe f DSGVO).
      </p>

      <h2>Wer deine Trainingsdaten sieht</h2>
      <ul>
        <li>Ohne Community siehst nur du deine Workouts.</li>
        <li>
          In einer privaten Community sehen alle Mitglieder gegenseitig
          Anzeigenamen, Trainingstage, Workouts und Bestwerte.
        </li>
        <li>
          In einer öffentlichen Community sehen die Mitglieder deinen
          Anzeigenamen, deine Trainingstage und Bestwerte, aber keine einzelnen
          Workouts oder Sätze.
        </li>
        <li>
          In einer Coaching-Community sieht nur der Coach deine Workouts. Die
          anderen Mitglieder sehen sie nicht.
        </li>
      </ul>
      <p>
        Vor jedem Beitritt zeigt dir die App, wer deine Daten sehen wird. Du
        entscheidest selbst, welchen Communities du beitrittst, und kannst sie
        jederzeit wieder verlassen.
      </p>
      <p>
        Öffentliche Communities mit Name, Beschreibung, Sportart, Ort und
        Mitgliederzahl kann jede angemeldete Person finden. Wer den Teilen-Link
        einer Community hat, sieht diese Angaben auch ohne Konto, aber nie die
        Namen der Mitglieder. Wenn du eine Community meldest, speichern wir
        deine Meldung mit deinem Konto, damit wir sie prüfen können.
      </p>
      <p>
        Ein geplantes Training siehst nur du, solange du es mit keiner
        Community teilst. Teilst du es, sehen es die Mitglieder dieser
        Communities, auch in öffentlichen Communities nur die Mitglieder: wer
        es plant, wann und wo, und wer zugesagt hat, jeweils mit Anzeigenamen.
        Die verknüpfte Vorlage sehen andere nicht. Gib als Treffpunkt einen
        öffentlichen Ort an, keine Privatadresse. Wer eine Community verwaltet,
        kann ein Training von ihrer Pinnwand nehmen.
      </p>
      <p>
        Den Chat eines Trainings lesen und schreiben nur die, die zugesagt
        haben. Wer absagt, sieht den Chat nicht mehr. Eigene Nachrichten
        kannst du jederzeit löschen. Entfernt die planende Person das
        Training, wird der Chat mit gelöscht.
      </p>
      <p>
        Mitteilungen siehst nur du. Sie entstehen, wenn jemand in deinen
        Communities ein Training teilt, bei deinem Training zusagt, im Chat
        schreibt oder ein Training absagt. Im Profil stellst du ein, welche du
        bekommst; neue Trainings aus öffentlichen Communities sind anfangs
        aus. Etwa eine Stunde vor einem Training, bei dem du dabei bist,
        erinnern wir dich, wenn du das nicht ausschaltest.
      </p>
      <p>
        Push aufs Handy schaltest du je Gerät im Profil ein und dort auch
        wieder aus. Zugestellt wird über den Push-Dienst deines Browsers oder
        Geräts (zum Beispiel Apple, Google oder Mozilla), der auch außerhalb
        der EU sitzen kann. Der Inhalt (Titel des Trainings, Name und bei Chat
        die letzte Nachricht) ist dabei verschlüsselt, sodass der Push-Dienst
        ihn nicht lesen kann.
      </p>

      <h2>Wer deine Vorlagen sieht</h2>
      <ul>
        <li>
          Eine private Vorlage siehst nur du. Das ist die Voreinstellung.
        </li>
        <li>
          Eine öffentliche Vorlage sehen alle angemeldeten Nutzer, mit deinem
          Anzeigenamen, den Übungen, den Zielwerten und dem Verlauf der
          Versionen. Auch eigene Übungen, die du darin verwendest, sind dann
          für sie sichtbar. Andere können die Vorlage kopieren. Die Kopie
          gehört ihnen und bleibt bestehen, auch wenn du dein Original später
          privat stellst oder löschst.
        </li>
        <li>
          Du kannst eine Vorlage jederzeit wieder privat stellen oder löschen.
          Eine bereits gemachte Kopie lässt sich dadurch nicht zurückholen.
        </li>
        <li>
          Wir können eine öffentliche Vorlage ausblenden, wenn sie gegen die
          Regeln verstößt.
        </li>
      </ul>

      <h2>Wenn du eine KI-App verbindest</h2>
      <p>
        Du kannst eine KI-App wie Claude oder ChatGPT mit OHealth verbinden, um
        dir aus deinen Workouts Trainingstipps geben zu lassen. Das passiert nur,
        wenn du es selbst einrichtest und auf einer Bestätigungsseite erlaubst.
      </p>
      <ul>
        <li>
          Die App darf dein Profil mit Namen, deine Workouts mit allen Sätzen,
          deine Trainingstage, deine Bestwerte und deine Vorlagen lesen.
        </li>
        <li>
          Sie darf neue private Vorlagen anlegen und neue Versionen deiner
          Vorlagen speichern. Frühere Versionen bleiben erhalten und sind als
          von der KI erstellt gekennzeichnet.
        </li>
        <li>
          Sie darf nichts löschen, keine Vorlage veröffentlichen, keine Workouts
          eintragen oder ändern und sieht keine Daten deiner Gruppen oder
          anderer Personen. Das stellt die Datenbank sicher.
        </li>
        <li>
          Die gelesenen Daten gehen an den Anbieter der KI-App, den du selbst
          wählst, und werden dort nach dessen Datenschutzbestimmungen
          verarbeitet, unter Umständen außerhalb der EU.
        </li>
        <li>
          Du kannst den Zugriff jederzeit im Profil unter „KI-Zugriff“
          entziehen. Die App kann danach keine Daten mehr abrufen.
        </li>
      </ul>

      <h2>Welche Dienstleister wir einsetzen</h2>
      <ul>
        <li>
          <strong>Supabase</strong> (Supabase Inc.) speichert die Datenbank und
          wickelt die Anmeldung ab. Die Daten liegen in einem Rechenzentrum in
          Frankfurt am Main.
        </li>
        <li>
          <strong>Vercel</strong> (Vercel Inc., USA) stellt die App im Internet
          bereit. Dabei können Protokolldaten auch außerhalb der EU verarbeitet
          werden.
        </li>
        {providers.map((provider) => (
          <li key={provider}>
            <strong>{PROVIDER_NAMES[provider].split(" (")[0]}:</strong> Wenn du
            dich darüber anmeldest, erhalten wir von {PROVIDER_NAMES[provider]}{" "}
            deine E-Mail-Adresse und deinen Namen. Der Anbieter erfährt, dass du
            dich bei OHealth anmeldest.
          </li>
        ))}
      </ul>

      <h2>Cookies und Speicher auf deinem Gerät</h2>
      <p>
        Die App setzt nur Cookies, die für die Anmeldung nötig sind. Ein
        angefangenes Workout oder laufendes Training wird auf deinem Gerät
        gespeichert, bis es an den Server übertragen ist.
        {passkeys &&
          " Wenn du einen Passkey einrichtest, bleibt der geheime Schlüssel auf deinem Gerät, wir speichern nur den öffentlichen Teil."}{" "}
        Wir setzen keine Analyse- oder Werbe-Cookies ein.
      </p>

      <h2>Wie lange wir Daten speichern</h2>
      <p>
        Wir speichern deine Daten, solange dein Konto besteht. Einzelne Workouts
        kannst du jederzeit löschen. Im Profil kannst du dein Konto löschen:
        Dann werden dein Profil, alle Workouts, alle Vorlagen mit ihren
        Versionen, alle Mitgliedschaften, deine geplanten Trainings, Zusagen,
        Chat-Nachrichten, Mitteilungen und Push-Abos sofort entfernt. Communities, die
        du allein verwaltest, übernimmt das Mitglied, das am längsten dabei ist;
        Coaching-Communities, die du allein betreust, werden gelöscht.
      </p>

      <h2>Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
        der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21
        DSGVO). Schreib dafür an die oben genannte E-Mail-Adresse. Außerdem
        kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren
        {operator.supervisoryAuthority.trim() !== ""
          ? `, zum Beispiel beim ${operator.supervisoryAuthority}`
          : ""}
        .
      </p>

      <p className="text-muted-foreground text-sm">
        Stand: {dateFormat.format(new Date(operator.lastUpdated))}
      </p>
    </>
  );
}
