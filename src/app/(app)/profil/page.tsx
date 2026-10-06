import { Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProfileHeader } from "@/modules/core/components/profile-header";
import { getFollowRequestCount, getProfile, getProfileStats } from "@/modules/core/queries";
import { ProfileTiles } from "@/modules/workouts/components/profile-tiles";
import { WorkoutFeed } from "@/modules/workouts/components/workout-feed";
import { getRecentWorkouts } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Profil" };

const RECENT = 5;

export default async function ProfilePage() {
  const profile = await getProfile();
  const [recent, stats, requests] = await Promise.all([
    getRecentWorkouts(RECENT + 1),
    getProfileStats(profile.id),
    getFollowRequestCount(),
  ]);
  const now = new Date();

  return (
    <>
      <ProfileHeader profile={profile} followers={stats?.followers ?? 0} following={stats?.following ?? 0} isMe />
      {!profile.bio && (
        <p className="text-muted-foreground mt-4 max-w-xl">Erzähl den anderen in einem Satz, wie du trainierst.</p>
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

      {requests > 0 && (
        <p className="mt-6 max-w-2xl border-y">
          <Link
            href="/verbindungen?tab=anfragen"
            className="hover:bg-accent -mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 transition-colors duration-150 ease-out"
          >
            <span className="flex-1 font-medium">Folgen-Anfragen</span>
            <span className="bg-foreground text-primary-foreground num flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium">
              {requests}
            </span>
          </Link>
        </p>
      )}

      {stats && (
        <div className="mt-10 max-w-2xl">
          <ProfileTiles stats={stats} name={profile.display_name} isMe />
        </div>
      )}

      <section className="mt-12 max-w-2xl" aria-labelledby="verlauf">
        <h2 id="verlauf" className="text-xl font-semibold">
          Verlauf
        </h2>
        {recent.length === 0 ? (
          <div className="mt-4">
            <p>Noch keine Aktivitäten. Trag deine erste ein.</p>
            <Button asChild className="mt-6 w-full md:w-auto">
              <Link href="/aktivitaet/neu">Aktivität eintragen</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-2">
              <WorkoutFeed
                label="Letzte Aktivitäten"
                now={now}
                workouts={recent.slice(0, RECENT).map((workout) => ({
                  id: workout.id,
                  isMe: true,
                  title: workout.title,
                  sportName: workout.sportName,
                  performedAt: workout.performed_at,
                  startedAt: workout.started_at,
                  finishedAt: workout.finished_at,
                  durationMinutes: workout.duration_minutes,
                  distanceM: workout.distance_m,
                  setCount: workout.workout_sets.length,
                  sportCategory: workout.sportCategory,
                }))}
              />
            </div>
            {recent.length > RECENT && (
              <p className="mt-4">
                <Link href="/verlauf" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Alle Aktivitäten ansehen
                </Link>
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
