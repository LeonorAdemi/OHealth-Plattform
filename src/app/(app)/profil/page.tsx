import { Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { describeProfile } from "@/modules/core/logic";
import { getMyFriends, getProfile } from "@/modules/core/queries";
import { WorkoutFeed } from "@/modules/workouts/components/workout-feed";
import { getRecentWorkouts } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Profil" };

const RECENT = 5;

export default async function ProfilePage() {
  const [profile, recent, friends] = await Promise.all([getProfile(), getRecentWorkouts(RECENT + 1), getMyFriends()]);
  const now = new Date();
  const details = describeProfile(profile);

  return (
    <>
      <div className="flex items-start gap-4 md:gap-6">
        <Avatar path={profile.avatar_url} name={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1 pt-2">
          <h1 className="text-titel font-semibold break-words">{profile.display_name}</h1>
          {details && <p className="text-muted-foreground mt-1">{details}</p>}
        </div>
      </div>
      {profile.bio ? (
        <p className="mt-6 max-w-xl whitespace-pre-line">{profile.bio}</p>
      ) : (
        <p className="text-muted-foreground mt-6 max-w-xl">
          Erzähl den anderen in deinen Gruppen in einem Satz, wie du trainierst.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <Button asChild variant="outline" className="w-full md:w-auto">
          <Link href="/profil/bearbeiten">Profil bearbeiten</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full md:w-auto">
          <Link href="/profil/einstellungen">
            <Settings strokeWidth={1.5} aria-hidden />
            Einstellungen
          </Link>
        </Button>
      </div>

      <p className="mt-8 max-w-2xl border-y">
        <Link
          href="/freunde"
          className="hover:bg-accent -mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 transition-colors duration-150 ease-out"
        >
          <span className="flex-1 font-medium">Freunde</span>
          {friends.incoming.length > 0 && (
            <span className="text-sm font-medium">
              {friends.incoming.length} {friends.incoming.length === 1 ? "Anfrage" : "Anfragen"}
            </span>
          )}
          <span className="text-muted-foreground num text-sm">{friends.friends.length}</span>
        </Link>
      </p>

      <section className="mt-12 max-w-2xl" aria-labelledby="verlauf">
        <h2 id="verlauf" className="text-xl font-semibold">
          Verlauf
        </h2>
        {recent.length === 0 ? (
          <div className="mt-4">
            <p>Noch keine Workouts. Starte dein erstes.</p>
            <Button asChild className="mt-6 w-full md:w-auto">
              <Link href="/training">Workout starten</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-2">
              <WorkoutFeed
                label="Letzte Workouts"
                now={now}
                workouts={recent.slice(0, RECENT).map((workout) => ({
                  id: workout.id,
                  isMe: true,
                  title: workout.title,
                  performedAt: workout.performed_at,
                  startedAt: workout.started_at,
                  finishedAt: workout.finished_at,
                  setCount: workout.workout_sets.length,
                }))}
              />
            </div>
            {recent.length > RECENT && (
              <p className="mt-4">
                <Link href="/verlauf" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Alle Workouts ansehen
                </Link>
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
