import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { getMyFriends } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Freunde" };

type Row = { userId: string; name: string; avatarUrl: string | null };

function PersonList({ label, people, detail }: { label: string; people: readonly Row[]; detail?: string }) {
  return (
    <ul className="mt-2" aria-label={label}>
      {people.map((p) => (
        <li key={p.userId} className="border-b">
          <Link
            href={`/person/${p.userId}`}
            className="hover:bg-accent -mx-2 flex min-h-16 items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
          >
            <Avatar path={p.avatarUrl} name={p.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.name}</span>
              {detail && <span className="text-muted-foreground block text-sm">{detail}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function FriendsPage() {
  const { friends, incoming, outgoing } = await getMyFriends();

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
      <h1 className="text-titel mt-2 font-semibold">Freunde</h1>

      {incoming.length > 0 && (
        <section className="mt-8 max-w-2xl" aria-labelledby="anfragen">
          <h2 id="anfragen" className="text-xl font-semibold">
            Anfragen
          </h2>
          <PersonList label="Anfragen" people={incoming} detail="Möchte mit dir befreundet sein" />
        </section>
      )}

      <section className="mt-8 max-w-2xl" aria-labelledby="freunde">
        <h2 id="freunde" className={incoming.length > 0 ? "text-xl font-semibold" : "sr-only"}>
          Deine Freunde
        </h2>
        {friends.length === 0 ? (
          <p className="text-muted-foreground mt-2 max-w-xl">
            Noch keine Freunde. Öffne das Profil einer Person aus deinen Communities, zum Beispiel über die Rangliste,
            und füge sie hinzu. Mit Freunden kannst du privat schreiben.
          </p>
        ) : (
          <PersonList label="Deine Freunde" people={friends} />
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="mt-10 max-w-2xl" aria-labelledby="gesendet">
          <h2 id="gesendet" className="text-xl font-semibold">
            Gesendete Anfragen
          </h2>
          <PersonList label="Gesendete Anfragen" people={outgoing} detail="Wartet auf Antwort" />
        </section>
      )}
    </>
  );
}
