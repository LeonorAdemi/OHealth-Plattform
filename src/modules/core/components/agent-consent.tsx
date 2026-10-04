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
      <h1 className="text-titel font-semibold">{request.clientName} möchte auf deine Trainingsdaten zugreifen</h1>
      {host && <p className="text-muted-foreground mt-2 text-sm">{host}</p>}

      <h2 className="mt-8 text-xl font-semibold">Lesen darf die App</h2>
      <ul className="mt-2">
        <li className="flex min-h-11 items-center border-b">Dein Profil mit Namen</li>
        <li className="flex min-h-11 items-center border-b">Deine Workouts mit allen Sätzen</li>
        <li className="flex min-h-11 items-center border-b">Trainingstage und Bestwerte</li>
        <li className="flex min-h-11 items-center border-b">Deine Vorlagen mit allen Versionen</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Anlegen darf die App</h2>
      <ul className="mt-2">
        <li className="flex min-h-11 items-center border-b">Neue private Vorlagen</li>
        <li className="flex min-h-11 items-center border-b">Neue Versionen deiner Vorlagen, die alten bleiben erhalten</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Nicht erlaubt</h2>
      <ul className="mt-2">
        <li className="flex min-h-11 items-center border-b">Daten deiner Gruppen und Freunde</li>
        <li className="flex min-h-11 items-center border-b">Etwas löschen oder eine Vorlage veröffentlichen</li>
        <li className="flex min-h-11 items-center border-b">Workouts eintragen oder ändern</li>
      </ul>

      <p className="text-muted-foreground mt-6 text-sm">
        Angemeldet als {request.email}. Die Daten gehen an den Anbieter der App und werden dort nach
        dessen Datenschutzregeln verarbeitet. Du kannst den Zugriff jederzeit in den Einstellungen deines Profils entziehen.
      </p>

      <div className="mt-8">
        <AgentConsentForm authorizationId={authorizationId} />
      </div>
    </>
  );
}
