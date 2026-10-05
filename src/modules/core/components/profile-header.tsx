import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";

import { describeProfile } from "../logic";

type Profile = {
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  sports: string[];
  is_private: boolean;
};

function Count({ value, label, href }: { value: number; label: string; href?: string }) {
  const content = (
    <>
      <span className="num font-semibold">{value}</span> <span className="text-muted-foreground">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1 hover:underline hover:underline-offset-4">
      {content}
    </Link>
  ) : (
    <span className="inline-flex min-h-11 items-center gap-1">{content}</span>
  );
}

/**
 * Kopf eines Profils wie bei Instagram: Bild, Name, Angaben, Follower und Gefolgte, Kurztext.
 * Beim eigenen Profil führen die Zahlen zu den Listen.
 */
export function ProfileHeader({
  profile,
  followers,
  following,
  isMe,
}: {
  profile: Profile;
  followers: number;
  following: number;
  isMe: boolean;
}) {
  const details = describeProfile(profile);
  return (
    <>
      <div className="flex items-start gap-4 md:gap-6">
        <Avatar path={profile.avatar_url} name={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-titel font-semibold break-words">{profile.display_name}</h1>
          {details && <p className="text-muted-foreground mt-1">{details}</p>}
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
            <Count value={followers} label="Follower" href={isMe ? "/verbindungen?tab=follower" : undefined} />
            <Count value={following} label="Folgt" href={isMe ? "/verbindungen?tab=folgt" : undefined} />
          </p>
        </div>
      </div>
      {profile.bio && <p className="mt-4 max-w-xl whitespace-pre-line">{profile.bio}</p>}
      {isMe && profile.is_private && (
        <p className="text-muted-foreground mt-2 text-sm">
          Privates Konto: Nur bestätigte Follower sehen deine Trainingstage, Bestwerte und Events.
        </p>
      )}
    </>
  );
}
