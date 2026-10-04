import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JoinPublicButton, JoinWithCodeForm } from "@/modules/core/components/community-forms";
import { COMMUNITY_KIND_LABEL, describeCommunity } from "@/modules/core/logic";
import { getMyCommunities, searchCommunities } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 60);
  const [mine, found] = await Promise.all([getMyCommunities(), searchCommunities(query, 20)]);
  const discover = found.filter((c) => !c.isMember);

  return (
    <>
      <h1 className="text-muted-foreground text-sm">Community</h1>
      <p className="num-display text-grosszahl mt-2">{mine.length}</p>
      <p className="mt-1">{mine.length === 1 ? "Community" : "Communities"}, in denen du bist</p>

      {mine.length > 0 && (
        <ul className="mt-6 max-w-2xl" aria-label="Deine Communities">
          {mine.map((c) => (
            <li key={c.id} className="border-b">
              <Link
                href={`/community/${c.id}`}
                className="hover:bg-accent -mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 ease-out"
              >
                <span className="block font-medium">{c.name}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {COMMUNITY_KIND_LABEL[c.kind]} · {describeCommunity(c)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Button asChild className="mt-8 w-full md:w-auto">
        <Link href="/community/neu">Community erstellen</Link>
      </Button>

      <section className="mt-12 max-w-2xl" aria-labelledby="entdecken">
        <h2 id="entdecken" className="text-xl font-semibold">
          {query ? "Suchergebnis" : mine.length === 0 ? "Beliebte Communities" : "Entdecken"}
        </h2>
        <form action="/community" method="get" className="mt-3 space-y-2" role="search">
          <Label htmlFor="q">Suche nach Name, Sportart oder Ort</Label>
          <div className="flex gap-3">
            <Input id="q" name="q" defaultValue={query} maxLength={60} placeholder="Laufen München" enterKeyHint="search" />
            <Button type="submit" variant="outline">
              Suchen
            </Button>
          </div>
        </form>

        {discover.length === 0 ? (
          <p className="text-muted-foreground mt-4">
            {query
              ? "Keine öffentliche Community gefunden. Gründe die erste für deine Sportart."
              : "Noch keine weiteren öffentlichen Communities. Gründe die erste."}
          </p>
        ) : (
          <ul className="mt-4" aria-label={query ? "Suchergebnis" : "Öffentliche Communities"}>
            {discover.map((c) => (
              <li key={c.id} className="flex min-h-14 items-center justify-between gap-4 border-b py-3">
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-muted-foreground mt-1 block text-sm">{describeCommunity(c)}</span>
                  {c.description && <span className="text-muted-foreground mt-1 block text-sm">{c.description}</span>}
                </span>
                <span className="shrink-0">
                  <JoinPublicButton id={c.id} name={c.name} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="code">
        <h2 id="code" className="text-xl font-semibold">
          Einladung bekommen?
        </h2>
        <p className="text-muted-foreground mt-1 mb-3 text-sm">
          Öffne den Link oder gib den Code ein, den du bekommen hast.
        </p>
        <JoinWithCodeForm />
      </section>
    </>
  );
}
