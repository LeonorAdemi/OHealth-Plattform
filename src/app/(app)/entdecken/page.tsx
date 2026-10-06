import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JoinPublicButton } from "@/modules/core/components/community-forms";
import { SportDot } from "@/modules/core/components/sport-dot";
import { MeetupDate } from "@/modules/core/components/meetup-list";
import { SportFilter } from "@/modules/core/components/sport-filter";
import { GoalFinder } from "@/modules/plans/components/goal-finder";
import { findGoal, findLevel, sportLookup } from "@/modules/plans/logic";
import { getCatalog } from "@/modules/plans/queries";
import {
  describeCommunity,
  describeMeetupCount,
  discoverCityId,
  DISCOVER_DAYS,
  formatMeetupWhen,
  isMeetupFull,
  sportFilterOptions,
} from "@/modules/core/logic";
import {
  getCities,
  getDiscoverCommunities,
  getDiscoverMeetups,
  getMyCityChoice,
  getSports,
  searchCommunities,
} from "@/modules/core/queries";

export const metadata: Metadata = { title: "Entdecken" };

// Oben „Was hast du vor?“ mit dem Weg zu einem Ziel (docs/bereiche/plaene.md). Darunter Events der
// nächsten 14 Tage und öffentliche Communities einer Stadt (eigene, wenn live, sonst München), mit
// Filter nach Sportart. Gezeigt wird nur, was auch der öffentliche Event-Link zeigt.
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string;
    q?: string;
    ziel?: string;
    stand?: string;
  }>;
}) {
  const { sport, q, ziel, stand } = await searchParams;
  const query = (q ?? "").trim().slice(0, 60);
  const catalog = getCatalog();
  const goal = findGoal(catalog, ziel);
  const level = goal ? findLevel(goal, stand) : null;
  const [cities, choice, found, sports] = await Promise.all([
    getCities(),
    getMyCityChoice(),
    query ? searchCommunities(query, 20) : Promise.resolve(null),
    getSports(),
  ]);
  const cityId = discoverCityId(
    choice.cityId,
    cities.filter((c) => c.live).map((c) => c.id),
  );
  const city = cities.find((c) => c.id === cityId)?.name ?? "München";
  const hasGoals = catalog.goals.length > 0;
  // Nur wer wirklich auf der Warteliste steht (city_interest), nicht wer im Profil eine Stadt eingetippt hat
  const waitingFor = cities.find((c) => c.id === choice.waitingFor && !c.live)?.name ?? null;

  const [meetups, communities] = await Promise.all([
    getDiscoverMeetups(cityId, DISCOVER_DAYS),
    getDiscoverCommunities(cityId),
  ]);
  const options = sportFilterOptions([
    ...meetups,
    ...communities.map((c) => ({ sportId: c.sportId, sportName: c.sport })),
  ]);
  const selected = options.some((o) => o.id === sport) ? (sport ?? null) : null;
  const shownMeetups = selected ? meetups.filter((m) => m.sportId === selected) : meetups;
  const shownCommunities = (found ?? communities).filter(
    (c) => !selected || found !== null || ("sportId" in c && c.sportId === selected),
  );

  return (
    <>
      <h1 className="text-titel font-semibold">Entdecken</h1>
      <p className="text-muted-foreground mt-1">
        {hasGoals
          ? `Pläne für dein Ziel, Trainings und Communities in ${city}`
          : `Trainings und Communities in ${city}`}
      </p>
      {waitingFor && (
        <p className="mt-3 max-w-2xl text-sm">
          In {waitingFor} gibt es OHealth noch nicht. Du stehst auf der Warteliste. Bis dahin siehst du {city}.
        </p>
      )}

      {/* Ab 1280 px zwei Spalten: links das Ziel, rechts was in der Stadt läuft */}
      <div className={hasGoals ? "mt-8 xl:grid xl:grid-cols-2 xl:gap-12" : undefined}>
        {hasGoals && (
          <div className="max-w-2xl min-w-0">
            <GoalFinder catalog={catalog} goal={goal} level={level} sports={sportLookup(sports)} />
          </div>
        )}
        <div className={hasGoals ? "mt-12 min-w-0 xl:mt-0" : undefined}>
          {options.length > 1 && (
            <div className={hasGoals ? "max-w-2xl" : "mt-6 max-w-2xl"}>
              <SportFilter options={options} value={selected} />
            </div>
          )}

          <section
            className={hasGoals && options.length <= 1 ? "max-w-2xl" : "mt-8 max-w-2xl"}
            aria-labelledby="trainings"
          >
            <h2 id="trainings" className="text-xl font-semibold">
              Trainings
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">Die nächsten {DISCOVER_DAYS} Tage</p>
            {shownMeetups.length === 0 ? (
              <div className="mt-2 space-y-4">
                <p className="text-muted-foreground">
                  {selected
                    ? "Für diese Sportart ist in den nächsten Tagen noch nichts geplant."
                    : `In ${city} ist in den nächsten ${DISCOVER_DAYS} Tagen noch nichts öffentlich geplant.`}{" "}
                  Plane das erste Training und teile es in einer Community.
                </p>
                <Button asChild className="w-full md:w-auto">
                  <Link href="/plan/neu">Training planen</Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-2" aria-label="Trainings">
                {shownMeetups.map((m) => (
                  <li key={m.id} className="border-b">
                    <Link
                      href={m.isJoined || m.isMember ? `/plan/${m.id}` : `/e/${m.id}`}
                      className="hover:bg-accent -mx-2 flex min-h-16 items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-150 ease-out"
                    >
                      <MeetupDate startsAt={m.startsAt} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-medium break-words">
                          <SportDot category={m.sportCategory} />
                          {m.title}
                        </span>
                        <span className="text-muted-foreground block text-sm">
                          {[m.sportName, formatMeetupWhen(m.startsAt), m.communityName].filter(Boolean).join(" · ")}
                        </span>
                        <span className="text-muted-foreground block text-sm">
                          {m.isJoined
                            ? "Du bist dabei"
                            : isMeetupFull(m.count, m.maxParticipants)
                              ? "Voll"
                              : describeMeetupCount(m.count, m.maxParticipants)}
                          {m.weekly && " · jede Woche"}
                        </span>
                      </span>
                      <ChevronRight
                        size={20}
                        strokeWidth={1.5}
                        className="text-muted-foreground shrink-0"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10 max-w-2xl" aria-labelledby="communities">
            <h2 id="communities" className="text-xl font-semibold">
              Communities
            </h2>
            <form action="/entdecken" method="get" className="mt-3 space-y-2" role="search">
              {selected && <input type="hidden" name="sport" value={selected} />}
              <Label htmlFor="q">Öffentliche Communities suchen</Label>
              <div className="flex gap-3">
                <Input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={query}
                  maxLength={60}
                  placeholder="z. B. Bouldern"
                  enterKeyHint="search"
                />
                <Button type="submit" variant="outline">
                  Suchen
                </Button>
              </div>
            </form>
            {shownCommunities.length === 0 ? (
              <p className="text-muted-foreground mt-4">
                {query ? "Keine öffentliche Community gefunden." : `Noch keine öffentliche Community in ${city}.`}{" "}
                <Link href="/community/neu" className="text-foreground underline underline-offset-4">
                  Gründe die erste
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-2" aria-label={query ? "Suchergebnis" : `Communities in ${city}`}>
                {shownCommunities.map((c) => (
                  <li key={c.id} className="flex min-h-16 items-center justify-between gap-4 border-b py-3">
                    {c.isMember ? (
                      <Link href={`/community/${c.id}`} className="min-w-0 hover:underline hover:underline-offset-4">
                        <span className="block font-medium break-words">{c.name}</span>
                        <span className="text-muted-foreground mt-0.5 block text-sm">
                          {describeCommunity(c)} · Mitglied
                        </span>
                      </Link>
                    ) : (
                      <>
                        <span className="min-w-0">
                          <span className="block font-medium break-words">{c.name}</span>
                          <span className="text-muted-foreground mt-0.5 block text-sm">{describeCommunity(c)}</span>
                        </span>
                        <span className="shrink-0">
                          <JoinPublicButton id={c.id} name={c.name} />
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
