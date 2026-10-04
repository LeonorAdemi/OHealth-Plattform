import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/modules/core/components/simple-forms";
import { getInvitePreview } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Einladung" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await getInvitePreview(code);

  if (!invite) {
    return (
      <>
        <h1 className="text-titel font-semibold">Einladung ungültig</h1>
        <p className="mt-4 max-w-xl">
          Dieser Einladungslink funktioniert nicht. Bitte die Person, die dich eingeladen hat, um
          einen neuen Link.
        </p>
        <p className="mt-6">
          <Link href="/gruppe" className="underline underline-offset-4">
            Zu deinen Gruppen
          </Link>
        </p>
      </>
    );
  }

  if (invite.already_member) redirect(`/gruppe?g=${invite.id}`);

  return (
    <>
      <p className="text-muted-foreground text-sm">Einladung</p>
      <h1 className="text-titel mt-1 font-semibold">{invite.name}</h1>
      <p className="mt-4 max-w-xl">
        {invite.type === "coaching"
          ? "Wenn du beitrittst, sieht der Coach dieser Gruppe deine Workouts. Die anderen Mitglieder sehen sie nicht."
          : "Wenn du beitrittst, sehen die Mitglieder dieser Gruppe deine Workouts und du ihre."}
      </p>
      <div className="mt-8">
        <AcceptInviteForm code={code} />
      </div>
    </>
  );
}
