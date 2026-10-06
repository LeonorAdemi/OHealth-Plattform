import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { MCP_PATH } from "@/lib/mcp-auth";
import { signOut } from "@/modules/core/actions";
import { ConnectedAgent, McpAddress } from "@/modules/core/components/agent-access";
import { DeleteAccount } from "@/modules/core/components/delete-account";
import { PushToggle } from "@/modules/core/components/push-toggle";
import { PasskeySetup } from "@/modules/core/components/passkey-setup";
import { NotificationPrefsForm } from "@/modules/core/components/notification-actions";
import { passkeysEnabled } from "@/modules/core/logic";
import { getAgentGrants, getNotificationPrefs, getSports } from "@/modules/core/queries";
import { BodyWeightForm } from "@/modules/workouts/components/body-weight-form";
import { SportGoalsForm } from "@/modules/workouts/components/sport-goals-form";
import { getMyBodyWeight, getSportGoals } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Einstellungen" };

const grantedFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });

/** Öffentliche Adresse dieser App, aus der Anfrage ermittelt (lokal, Vorschau oder Produktion). */
async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function SettingsPage() {
  const [grants, origin, prefs, goals, sports, weightKg] = await Promise.all([
    getAgentGrants(),
    appOrigin(),
    getNotificationPrefs(),
    getSportGoals(),
    getSports(),
    getMyBodyWeight(),
  ]);

  return (
    <>
      <p className="text-sm">
        <Link
          href="/profil"
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Profil
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Einstellungen</h1>

      <section className="mt-8 max-w-xl scroll-mt-8" id="wochenziel" aria-labelledby="wochenziel-titel">
        <h2 id="wochenziel-titel" className="text-xl font-semibold">
          Vorhaben pro Woche
        </h2>
        <p className="text-muted-foreground mt-1 mb-3 text-sm">
          Wie oft du dir je Sportart pro Woche vornimmst. Auf „Heute“ füllt jedes Training seinen Kreis. Nur du
          siehst deine Vorhaben.
        </p>
        <SportGoalsForm goals={goals} sports={sports} />
      </section>

      <section className="mt-10 max-w-xl scroll-mt-8" id="gewicht" aria-labelledby="gewicht-titel">
        <h2 id="gewicht-titel" className="text-xl font-semibold">
          Körpergewicht
        </h2>
        <p className="text-muted-foreground mt-1 mb-3 text-sm">
          Freiwillig. Damit rechnet OHealth die Kalorien deiner Aktivitäten: Faktor der Sportart × Gewicht × Dauer.
          Ohne Gewicht erscheinen keine Kalorien.
        </p>
        <BodyWeightForm weightKg={weightKg} />
      </section>

      <section className="mt-10 max-w-xl scroll-mt-8" id="mitteilungen" aria-labelledby="mitteilungen-titel">
        <h2 id="mitteilungen-titel" className="text-xl font-semibold">
          Mitteilungen
        </h2>
        <p className="text-muted-foreground mt-1 mb-2 text-sm">
          Wofür die Glocke und dein Handy dir Bescheid geben.
        </p>
        <NotificationPrefsForm prefs={prefs} />
        <h3 className="mt-8 font-medium">Aufs Handy</h3>
        <p className="text-muted-foreground mt-1 mb-2 text-sm">
          Schaltest du sie ein, kommen dieselben Mitteilungen auch als Push auf dieses Gerät, mit der letzten Nachricht im
          Chat.
        </p>
        <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      </section>

      {passkeysEnabled(process.env.NEXT_PUBLIC_PASSKEYS) && (
        <section className="mt-10" aria-labelledby="passkey">
          <h2 id="passkey" className="text-xl font-semibold">
            Passkey
          </h2>
          <p className="mt-2 max-w-xl">
            Mit einem Passkey meldest du dich auf diesem Gerät per Face ID, Fingerabdruck oder
            Geräte-PIN an, ohne Passwort.
          </p>
          <div className="mt-4">
            <PasskeySetup />
          </div>
        </section>
      )}

      <section className="mt-10 max-w-xl" aria-labelledby="ki">
        <h2 id="ki" className="text-xl font-semibold">
          KI-Zugriff
        </h2>
        <p className="mt-2">
          Verbinde Claude oder eine andere KI-App mit OHealth, um dir aus deinen Aktivitäten
          Trainingstipps geben zu lassen. Die App kann nur deine eigenen Daten lesen, nichts ändern
          und nichts von deinen Gruppen sehen.
        </p>
        <p className="text-muted-foreground mt-4 text-sm">
          Adresse für den Connector, in Claude unter Einstellungen, Connectors
        </p>
        <div className="mt-1">
          <McpAddress url={`${origin}${MCP_PATH}`} />
        </div>
        {grants.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">Noch keine KI-App verbunden.</p>
        ) : (
          <ul className="mt-6" aria-label="Verbundene KI-Apps">
            {grants.map((grant) => (
              <ConnectedAgent
                key={grant.clientId}
                clientId={grant.clientId}
                name={grant.name}
                since={grantedFormat.format(new Date(grant.grantedAt))}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="konto">
        <h2 id="konto" className="text-xl font-semibold">
          Konto
        </h2>
        <p className="mt-2">
          <Link
            href="/passwort-neu"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Passwort ändern
          </Link>
        </p>
        <form action={signOut}>
          <button type="submit" className="min-h-11 underline underline-offset-4">
            Abmelden
          </button>
        </form>
        <p className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 text-sm">
          <Link href="/datenschutz" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Datenschutz
          </Link>
          <Link href="/nutzungsbedingungen" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Nutzungsbedingungen
          </Link>
          <Link href="/impressum" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Impressum
          </Link>
        </p>
      </section>

      <section className="mt-10 max-w-xl" aria-labelledby="loeschen">
        <h2 id="loeschen" className="text-xl font-semibold">
          Konto löschen
        </h2>
        <div className="mt-2">
          <DeleteAccount />
        </div>
      </section>
    </>
  );
}
