import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { FollowActions } from "@/modules/core/components/follow-actions";
import { ProfileHeader } from "@/modules/core/components/profile-header";
import { getFollowState, getPersonProfile, getProfileStats } from "@/modules/core/queries";
import { ProfileTiles } from "@/modules/workouts/components/profile-tiles";

export const metadata: Metadata = { title: "Profil" };

/**
 * Profil einer anderen Person. Sichtbar bei öffentlichen Konten, mit gemeinsamer Gruppe oder
 * Community und bei einer Folgen-Beziehung. Die Kacheln nur bei öffentlichen Konten und für Follower.
 */
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [person, state, stats] = await Promise.all([getPersonProfile(id), getFollowState(id), getProfileStats(id)]);
  if (!person || !stats) notFound();
  if (person.isMe) redirect("/profil");

  return (
    <>
      <ProfileHeader profile={person} followers={stats.followers} following={stats.following} isMe={false} />

      <section className="mt-6 max-w-xl" aria-label="Folgen und Nachricht">
        <FollowActions personId={person.id} name={person.display_name} isPrivate={person.is_private} state={state} />
      </section>

      <div className="mt-10 max-w-2xl">
        <ProfileTiles stats={stats} name={person.display_name} isMe={false} />
      </div>
    </>
  );
}
