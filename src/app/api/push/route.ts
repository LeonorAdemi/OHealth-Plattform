import webpush from "web-push";
import { z } from "zod";

import { pushContent } from "@/modules/core/logic";
import { forgetPushSubscription, getPushPayload } from "@/modules/core/queries";

// Versendet den Push zu einer neuen Mitteilung. Aufgerufen von der Datenbank (pg_net,
// Migration push_and_reminders) mit gemeinsamem Geheimnis im Header x-push-secret. Die App kennt
// das Geheimnis nicht selbst: Sie reicht es an push_payload weiter, die Datenbank prüft es und
// liefert erst dann Inhalt, Abos und Schlüssel (Migration push_keys_in_db).

const body = z.object({ id: z.uuid() });
const secretHeader = z.string().min(32).max(200);

const DEFAULT_SUBJECT = "https://o-health-plattform.vercel.app";

export async function POST(request: Request) {
  const secret = secretHeader.safeParse(request.headers.get("x-push-secret"));
  if (!secret.success) return new Response("Nicht erlaubt", { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Ungültig", { status: 400 });

  const payload = await getPushPayload(parsed.data.id, secret.data);
  if (payload === "denied") return new Response("Nicht erlaubt", { status: 401 });
  if (!payload || payload.subscriptions.length === 0) return new Response(null, { status: 204 });
  if (!payload.vapid) return new Response("Push nicht eingerichtet", { status: 503 });

  const message = JSON.stringify(pushContent(payload));
  const vapidDetails = {
    subject: process.env.VAPID_SUBJECT ?? DEFAULT_SUBJECT,
    publicKey: payload.vapid.publicKey,
    privateKey: payload.vapid.privateKey,
  };

  const results = await Promise.allSettled(
    payload.subscriptions.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, {
        TTL: 60 * 60 * 6,
        urgency: payload.kind === "message" || payload.kind === "reminder" ? "high" : "normal",
        vapidDetails,
      }),
    ),
  );

  // Abgelaufene Abos (404, 410) entfernen
  await Promise.all(
    results.map((r, i) => {
      const status = r.status === "rejected" ? (r.reason as { statusCode?: number })?.statusCode : undefined;
      return status === 404 || status === 410
        ? forgetPushSubscription(payload.subscriptions[i].endpoint, secret.data)
        : undefined;
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return Response.json({ sent, failed: results.length - sent });
}
