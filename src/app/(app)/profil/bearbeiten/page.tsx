import type { Metadata } from "next";
import Link from "next/link";

import { AvatarPicker, ProfileForm } from "@/modules/core/components/profile-forms";
import { getProfile } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Profil bearbeiten" };

export default async function EditProfilePage() {
  const profile = await getProfile();

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
      <h1 className="text-titel mt-2 font-semibold">Profil bearbeiten</h1>
      <p className="text-muted-foreground mt-2 max-w-xl text-sm">
        Bild, Name und Angaben sehen alle, mit denen du in einer Gruppe oder Community bist, deine Follower und bei einem öffentlichen Konto alle angemeldeten Nutzer.
      </p>

      <section className="mt-8" aria-label="Profilbild">
        <AvatarPicker path={profile.avatar_url} name={profile.display_name} />
      </section>

      <div className="mt-10">
        <ProfileForm profile={profile} />
      </div>
    </>
  );
}
