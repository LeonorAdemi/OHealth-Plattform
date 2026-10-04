import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CreateMeetupForm } from "@/modules/core/components/meetup-forms";
import { berlinDateTimeParts } from "@/modules/core/logic";
import { getMyCommunity } from "@/modules/core/queries";

export const metadata: Metadata = { title: "Treffen planen" };

const HOUR = 60 * 60 * 1000;

export default async function NewMeetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const community = await getMyCommunity(id);
  if (!community) notFound();

  // Vorschlag: die nächste volle Stunde
  const now = new Date().getTime();
  const suggestion = berlinDateTimeParts(new Date(Math.ceil((now + 1) / HOUR) * HOUR));
  const today = berlinDateTimeParts(new Date(now)).date;

  return (
    <>
      <p className="text-sm">
        <Link
          href={`/community/${id}`}
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {community.name}
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Treffen planen</h1>
      <p className="mt-2 max-w-xl">
        Alle in {community.name} sehen das Treffen und können mit „Ich bin dabei“ zusagen.
      </p>
      <div className="mt-8">
        <CreateMeetupForm
          groupId={id}
          defaultDate={suggestion.date}
          defaultTime={suggestion.time}
          minDate={today}
        />
      </div>
    </>
  );
}
