import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { MeetupForm } from "@/modules/core/components/meetup-forms";
import { berlinDateTimeParts, meetupFormValues } from "@/modules/core/logic";
import { getMeetup, getSports } from "@/modules/core/queries";
import { getMyRecentSportIds, getMyTemplates } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Training bearbeiten" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [meetup, sports, recentSportIds, templates] = await Promise.all([
    getMeetup(id),
    getSports(),
    getMyRecentSportIds(),
    getMyTemplates(),
  ]);
  if (!meetup) notFound();
  // Nur eigene, kommende Trainings lassen sich ändern (die Datenbank prüft das ebenso).
  if (!meetup.isMine || new Date(meetup.startsAt) <= new Date()) redirect(`/plan/${id}`);

  const start = berlinDateTimeParts(new Date(meetup.startsAt));
  const today = berlinDateTimeParts(new Date()).date;

  return (
    <>
      <p className="text-sm">
        <Link
          href={`/plan/${id}`}
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {meetup.title}
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Training bearbeiten</h1>
      <p className="mt-2 max-w-xl">Wer schon zugesagt hat, erfährt es, wenn sich Zeit oder Treffpunkt ändern.</p>
      <div className="mt-8">
        <MeetupForm
          sports={sports}
          recentSportIds={recentSportIds}
          defaultSportId={meetup.sportId}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          communities={[]}
          preselected={[]}
          defaultDate={start.date}
          defaultTime={start.time}
          minDate={today}
          existing={meetupFormValues(meetup)}
        />
      </div>
    </>
  );
}
