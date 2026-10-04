import type { Metadata } from "next";

import { operator, orPlaceholder } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <>
      <h1>Impressum</h1>

      <h2>Angaben zum Anbieter</h2>
      <p>
        {orPlaceholder(operator.name, "Name des Betreibers")}
        <br />
        {orPlaceholder(operator.street, "Straße und Hausnummer")}
        <br />
        {orPlaceholder(operator.city, "Postleitzahl und Ort")}
        <br />
        {operator.country}
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: {orPlaceholder(operator.email, "E-Mail-Adresse")}
        {operator.phone.trim() !== "" && (
          <>
            <br />
            Telefon: {operator.phone}
          </>
        )}
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        {orPlaceholder(operator.name, "Name des Betreibers")}, Anschrift wie
        oben.
      </p>
    </>
  );
}
