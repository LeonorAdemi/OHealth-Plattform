import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Avatar } from "@/components/ui/avatar";
import { FriendActions } from "@/modules/core/components/friend-actions";
import { describeProfile } from "@/modules/core/logic";
import { getFriendState, getPersonProfile } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Profil" };

/** Profil einer anderen Person. Sichtbar mit gemeinsamer Gruppe oder Community oder als Freund. */
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [person, friendState] = await Promise.all([getPersonProfile(id), getFriendState(id)]);
  if (!person) notFound();
  if (person.isMe) redirect("/profil");

  const details = describeProfile(person);

  return (
    <>
      <div className="flex items-start gap-4 md:gap-6">
        <Avatar path={person.avatar_url} name={person.display_name} size="lg" />
        <div className="min-w-0 flex-1 pt-2">
          <h1 className="text-titel font-semibold break-words">{person.display_name}</h1>
          {details && <p className="text-muted-foreground mt-1">{details}</p>}
        </div>
      </div>
      {person.bio && <p className="mt-6 max-w-xl whitespace-pre-line">{person.bio}</p>}

      <section className="mt-8 max-w-xl" aria-label="Freundschaft">
        <FriendActions personId={person.id} name={person.display_name} state={friendState} />
      </section>
    </>
  );
}
