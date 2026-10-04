import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { GroupForms } from "@/modules/core/components/group-forms";
import { InviteShare } from "@/modules/core/components/invite-share";
import { getMyGroups } from "@/modules/core/queries";
import { BestRanking } from "@/modules/workouts/components/best-ranking";
import { Leaderboard } from "@/modules/workouts/components/leaderboard";
import { isoWeek } from "@/modules/workouts/logic";
import { getGroupBests, getLeaderboard } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Gruppe" };

export default async function GroupPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; u?: string }>;
}) {
  const [{ g, u }, groups] = await Promise.all([searchParams, getMyGroups()]);

  if (groups.length === 0) {
    return (
      <>
        <h1 className="text-titel font-semibold">Gruppe</h1>
        <p className="mt-4 max-w-xl">
          Hier vergleichst du dich mit anderen. Tritt mit einem Einladungscode bei oder erstelle
          eine eigene Gruppe.
        </p>
        <div className="mt-8">
          <GroupForms primary="join" />
        </div>
      </>
    );
  }

  const now = new Date();
  const group = groups.find((entry) => entry.id === g) ?? groups[0];
  const [rows, bests, requestHeaders] = await Promise.all([
    getLeaderboard(group.id, now),
    getGroupBests(group.id, u),
    headers(),
  ]);

  // Öffentliche Adresse der App: hinter Vercel steht sie in den x-forwarded-Headern.
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const inviteUrl = `${protocol}://${host}/beitreten/${group.invite_code}`;

  return (
    <>
      <h1 className="text-titel font-semibold">{group.name}</h1>

      {groups.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {groups.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/gruppe?g=${entry.id}`}
                aria-current={entry.id === group.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center underline-offset-4",
                  entry.id === group.id ? "font-medium" : "text-muted-foreground underline",
                )}
              >
                {entry.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 max-w-2xl" aria-labelledby="konstanz">
        <h2 id="konstanz" className="text-xl font-semibold">
          Trainingstage in Woche {isoWeek(now)}
        </h2>
        <div className="mt-2">
          <Leaderboard rows={rows} />
        </div>
      </section>

      <section className="mt-10 max-w-2xl" aria-labelledby="bestwerte">
        <h2 id="bestwerte" className="text-xl font-semibold">
          Bestwerte
        </h2>

        {bests.selected ? (
          <>
            <ul className="mt-2 flex flex-wrap gap-x-4 text-sm">
              {bests.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <Link
                    href={`/gruppe?g=${group.id}&u=${exercise.id}#bestwerte`}
                    aria-current={exercise.id === bests.selected?.id ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center underline-offset-4",
                      exercise.id === bests.selected?.id
                        ? "font-medium"
                        : "text-muted-foreground underline",
                    )}
                  >
                    {exercise.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1 text-sm">
              {bests.selected.measure === "weight_reps"
                ? "Geschätztes Maximum für eine Wiederholung, berechnet aus dem besten Satz."
                : bests.selected.measure === "duration"
                  ? "Längste gehaltene Zeit."
                  : "Gesamte Strecke aller Workouts."}
            </p>
            <div className="mt-2">
              <BestRanking rows={bests.ranking} />
            </div>
          </>
        ) : (
          <p className="mt-2">
            Noch keine Bestwerte. Sie erscheinen, sobald jemand in der Gruppe ein Workout speichert.
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="einladen">
        <h2 id="einladen" className="text-xl font-semibold">
          Einladen
        </h2>
        <p className="mt-2 max-w-xl">
          Wer diesen Link öffnet, kann der Gruppe nach der Anmeldung mit einem Tipp beitreten.
        </p>
        <div className="mt-3">
          <InviteShare url={inviteUrl} groupName={group.name} />
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Oder als Code zum Eintippen: <span className="text-foreground num select-all">{group.invite_code}</span>
        </p>
      </section>

      <section className="mt-10" aria-labelledby="weitere">
        <h2 id="weitere" className="text-xl font-semibold">
          Weitere Gruppe
        </h2>
        <div className="mt-4">
          <GroupForms primary="none" />
        </div>
      </section>
    </>
  );
}
