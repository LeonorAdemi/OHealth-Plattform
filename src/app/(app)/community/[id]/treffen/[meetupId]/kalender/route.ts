import { z } from "zod";

import { buildMeetupIcs } from "@/modules/core/logic";
import { getMeetup } from "@/modules/core/queries";

// Kalendereintrag zum Herunterladen. Nur für Mitglieder, sonst gibt es das Treffen nicht (RLS).
export async function GET(request: Request, { params }: { params: Promise<{ id: string; meetupId: string }> }) {
  const { id, meetupId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(meetupId).success) {
    return new Response("Nicht gefunden", { status: 404 });
  }

  const meetup = await getMeetup(meetupId);
  if (!meetup || meetup.groupId !== id) return new Response("Nicht gefunden", { status: 404 });

  const url = new URL(`/community/${id}/treffen/${meetupId}`, request.url).toString();
  const ics = buildMeetupIcs({ ...meetup, url });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="treffen.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
