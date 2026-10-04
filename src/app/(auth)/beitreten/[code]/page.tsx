import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { AcceptCommunityInvite } from "@/modules/core/components/community-forms";
import { COMMUNITY_JOIN_HINT, COMMUNITY_KIND_LABEL, describeCommunity, joinAfterAuthPath } from "@/modules/core/logic";
import { getCommunityPreview } from "@/modules/core/queries";

// Teilen-Link einer Community. Öffentlich, damit Messenger eine Vorschau zeigen und
// Eingeladene vor der Registrierung sehen, wem sie beitreten. Namen von Mitgliedern
// erscheinen hier nie.

const preview = cache(getCommunityPreview);

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const community = await preview(code);
  if (!community) return { title: "Einladung" };

  const description = [community.description, describeCommunity(community)].filter(Boolean).join(" · ");
  return {
    title: community.name,
    description,
    openGraph: { title: `${community.name} auf OHealth`, description, type: "website", siteName: "OHealth" },
    robots: { index: false },
  };
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ beitreten?: string }>;
}) {
  const [{ code }, { beitreten }] = await Promise.all([params, searchParams]);
  const community = await preview(code);

  if (!community) {
    return (
      <>
        <h1 className="text-titel font-semibold">Einladung ungültig</h1>
        <p className="mt-4">
          Dieser Link funktioniert nicht mehr. Bitte die Person, die dich eingeladen hat, um einen neuen.
        </p>
      </>
    );
  }

  if (community.isMember) redirect(`/community/${community.id}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const next = joinAfterAuthPath(code);

  return (
    <>
      <p className="text-muted-foreground text-sm">
        Einladung · {COMMUNITY_KIND_LABEL[community.kind]}
      </p>
      <h1 className="text-titel mt-1 font-semibold">{community.name}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{describeCommunity(community)}</p>
      {community.description && <p className="mt-4">{community.description}</p>}
      <p className="mt-4">{COMMUNITY_JOIN_HINT[community.kind]}</p>

      <div className="mt-8">
        {signedIn ? (
          <AcceptCommunityInvite code={code} autoJoin={beitreten === "1"} />
        ) : (
          <div className="space-y-4">
            <Button asChild className="w-full">
              <Link href={`/registrieren?next=${encodeURIComponent(next)}`}>Konto erstellen und beitreten</Link>
            </Button>
            <p className="text-sm">
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                Ich habe schon ein Konto
              </Link>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
