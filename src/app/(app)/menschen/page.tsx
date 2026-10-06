import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeProfile } from "@/modules/core/logic";
import { searchPeople } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Menschen finden" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 60);
  const people = await searchPeople(query, 30);

  return (
    <>
      <p className="text-sm">
        <Link
          href="/gruppen"
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Gruppen
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Menschen finden</h1>

      <form action="/menschen" className="mt-6 flex max-w-xl items-end gap-2" role="search">
        <div className="flex-1 space-y-2">
          <Label htmlFor="q">Name</Label>
          <Input id="q" name="q" type="search" defaultValue={query} maxLength={60} autoComplete="off" />
        </div>
        <Button type="submit" variant="outline">
          Suchen
        </Button>
      </form>

      <section className="mt-6 max-w-2xl" aria-labelledby="treffer">
        <h2 id="treffer" className="text-xl font-semibold">
          {query ? "Treffer" : "Aus deinen Communities"}
        </h2>
        {people.length === 0 ? (
          <p className="text-muted-foreground mt-2">
            {query
              ? "Niemand gefunden. Private Konten findest du nur, wenn ihr in einer Community seid."
              : "Keine Vorschläge. Tritt einer Community bei oder suche nach einem Namen."}
          </p>
        ) : (
          <ul className="mt-2">
            {people.map((p) => {
              const details = describeProfile(p);
              const status =
                p.following === "accepted"
                  ? "Gefolgt"
                  : p.following === "pending"
                    ? "Angefragt"
                    : p.followsMe
                      ? "Folgt dir"
                      : p.isPrivate
                        ? "Privat"
                        : null;
              return (
                <li key={p.userId} className="border-b">
                  <Link
                    href={`/person/${p.userId}`}
                    className="hover:bg-accent -mx-2 flex min-h-16 items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ease-out"
                  >
                    <Avatar path={p.avatarUrl} name={p.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      {details && <span className="text-muted-foreground block truncate text-sm">{details}</span>}
                    </span>
                    {status && <span className="text-muted-foreground shrink-0 text-sm">{status}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
