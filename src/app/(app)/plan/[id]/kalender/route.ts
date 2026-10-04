import { z } from "zod";

import { buildMeetupIcs } from "@/modules/core/logic";
import { getMeetup } from "@/modules/core/queries";

// Kalendereintrag zum Herunterladen. Nur wer das Training sehen darf (RLS).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Nicht gefunden", { status: 404 });

  const meetup = await getMeetup(id);
  if (!meetup) return new Response("Nicht gefunden", { status: 404 });

  const url = new URL(`/plan/${id}`, request.url).toString();
  const ics = buildMeetupIcs({ ...meetup, url });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="training.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
