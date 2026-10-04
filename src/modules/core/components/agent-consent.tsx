import { AgentConsentForm } from "./agent-access";

/** Inhalt der Bestätigungsseite für eine KI-App. */
export function AgentConsentView({
  authorizationId,
  request,
}: {
  authorizationId: string;
  request: { clientName: string; clientUri: string | null; redirectUri: string; email: string };
}) {
  const host = (() => {
    try {
      return new URL(request.clientUri ?? request.redirectUri).host;
    } catch {
      return null;
    }
  })();

  return (
    <>
      <h1 className="text-titel font-semibold">{request.clientName} möchte deine Trainingsdaten lesen</h1>
      {host && <p className="text-muted-foreground mt-2 text-sm">{host}</p>}

      <h2 className="mt-8 text-xl font-semibold">Lesen darf die App</h2>
      <ul className="mt-2">
        <li className="flex min-h-11 items-center border-b">Dein Profil mit Namen</li>
        <li className="flex min-h-11 items-center border-b">Deine Workouts mit allen Sätzen</li>
        <li className="flex min-h-11 items-center border-b">Trainingstage und Bestwerte</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Nicht erlaubt</h2>
      <ul className="mt-2">
        <li className="flex min-h-11 items-center border-b">Daten deiner Gruppen und Freunde</li>
        <li className="flex min-h-11 items-center border-b">Etwas speichern, ändern oder löschen</li>
      </ul>

      <p className="text-muted-foreground mt-6 text-sm">
        Angemeldet als {request.email}. Die Daten gehen an den Anbieter der App und werden dort nach
        dessen Datenschutzregeln verarbeitet. Du kannst den Zugriff jederzeit im Profil entziehen.
      </p>

      <div className="mt-8">
        <AgentConsentForm authorizationId={authorizationId} />
      </div>
    </>
  );
}
