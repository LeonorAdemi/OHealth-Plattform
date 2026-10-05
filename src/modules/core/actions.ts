"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { TERMS_VERSION } from "@/lib/legal";
import type { FormState } from "@/lib/result";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

import {
  berlinLocalToDate,
  campaignTag,
  CHAT_NOTIFICATION_KINDS,
  groupTypeFor,
  MAX_BIO,
  MEETUP_LEVELS,
  meetupErrorMessage,
  normalizeSports,
  REPORT_CATEGORIES,
  REPORT_TARGETS,
  parseDistanceKm,
  parseDurationMinutes,
  parseElevation,
  parsePace,
  parseSpeed,
} from "./logic";

const credentials = z.object({
  email: z.email("Gib eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort braucht mindestens 8 Zeichen."),
});

const registration = credentials.extend({
  displayName: z
    .string()
    .trim()
    .min(1, "Gib einen Namen ein.")
    .max(40, "Der Name darf höchstens 40 Zeichen haben."),
  terms: z.literal("on", "Bestätige dein Alter und die Nutzungsbedingungen."),
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Die Eingabe ist ungültig.";
}

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-Mail oder Passwort stimmt nicht." };

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registration.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const next = safeNextPath(formData.get("next"));
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Die Datenbank hält die Zustimmung fest (Trigger on_auth_user_created_terms)
      data: {
        display_name: parsed.data.displayName,
        terms_version: TERMS_VERSION,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error)
    return { error: "Registrierung fehlgeschlagen. Versuch es erneut." };

  // Ohne E-Mail-Bestätigung ist man sofort angemeldet, sonst kommt erst die Mail.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return {
    message:
      "Fast fertig. Bestätige den Link in der E-Mail, die wir dir geschickt haben.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

const communitySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Gib der Community einen Namen.")
      .max(60, "Der Name darf höchstens 60 Zeichen haben."),
    kind: z.enum(["public", "private", "coaching"]),
    sport: z
      .string()
      .trim()
      .max(40, "Die Sportart darf höchstens 40 Zeichen haben."),
    city: z
      .string()
      .trim()
      .max(60, "Die Stadt darf höchstens 60 Zeichen haben."),
    description: z
      .string()
      .trim()
      .max(200, "Die Beschreibung darf höchstens 200 Zeichen haben."),
  })
  .refine((c) => c.kind !== "public" || c.name.length >= 3, {
    message:
      "Eine öffentliche Community braucht einen Namen mit mindestens 3 Zeichen.",
  })
  .refine((c) => c.kind !== "public" || c.name.length <= 40, {
    message:
      "Der Name einer öffentlichen Community darf höchstens 40 Zeichen haben.",
  });

const COMMUNITY_SAVE_FAILED =
  "Die Community konnte nicht erstellt werden. Versuch es erneut.";

/** Legt eine Community an. Wer sie erstellt, verwaltet sie (Admin bzw. Coach). */
export async function createCommunity(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = communitySchema.safeParse({
    name: formData.get("name") ?? "",
    kind: formData.get("kind") ?? "",
    sport: formData.get("sport") ?? "",
    city: formData.get("city") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: parsed.data.name,
      type: groupTypeFor(parsed.data.kind),
      created_by: userId,
      sport: parsed.data.sport || null,
      city: parsed.data.city || null,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("Höchstens drei Communities")) {
      return {
        error:
          "Du hast schon drei öffentliche Communities. Mehr sind nicht möglich.",
      };
    }
    return { error: COMMUNITY_SAVE_FAILED };
  }

  revalidatePath("/community");
  redirect(`/community/${data.id}`);
}

/** Tritt einer öffentlichen Community bei. Private Communities gehen nur über den Link. */
export async function joinPublicCommunity(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Diese Community gibt es nicht mehr." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: id.data, user_id: userId });
  // 23505: schon Mitglied, das ist kein Fehler.
  if (error && error.code !== "23505")
    return { error: "Beitreten hat nicht geklappt. Versuch es erneut." };

  revalidatePath("/community");
  redirect(`/community/${id.data}`);
}

/** Tritt mit einem Einladungscode bei (eingetippt statt über den Link). */
export async function joinWithCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = z.string().trim().min(1).safeParse(formData.get("code"));
  if (!code.success) return { error: "Gib den Einladungscode ein." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { code: code.data });
  if (error || !data) return { error: "Dieser Einladungscode ist ungültig." };

  revalidatePath("/community");
  redirect(`/community/${data}`);
}

/**
 * Verlässt eine Community (leave_group). Wer sie als Einziger verwaltet, übergibt die Verwaltung
 * an das Mitglied, das am längsten dabei ist. Ist man das letzte Mitglied oder der einzige Coach,
 * wird sie gelöscht, wie beim Löschen des Kontos (delete_own_account).
 */
export async function leaveCommunity(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Diese Community gibt es nicht mehr." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", { gid: id.data });
  if (error)
    return { error: "Verlassen hat nicht geklappt. Versuch es erneut." };

  revalidatePath("/community");
  redirect("/community");
}

const reportSchema = z.object({
  target: z.enum(REPORT_TARGETS),
  id: z.uuid(),
  category: z.enum(REPORT_CATEGORIES, "Wähl aus, was nicht passt."),
  reason: z.string().trim().max(500, "Höchstens 500 Zeichen."),
});

/**
 * Meldet eine Nachricht, ein Event, eine Person oder eine Community. Der Betreiber prüft. Was man
 * nicht sieht oder selbst geschrieben hat, lässt sich nicht melden (Trigger check_report).
 */
export async function report(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = reportSchema.safeParse({
    target: formData.get("target"),
    id: formData.get("id"),
    category: formData.get("category"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { target, id, category, reason } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    category,
    reason: reason || null,
    message_id: target === "message" ? id : null,
    meetup_id: target === "meetup" ? id : null,
    reported_user_id: target === "person" ? id : null,
    group_id: target === "community" ? id : null,
  });
  if (error) {
    if (error.code === "23505") return { error: "Das hast du schon gemeldet." };
    if (error.code === "54000")
      return {
        error: "Du hast heute schon viel gemeldet. Versuch es morgen wieder.",
      };
    return {
      error: "Die Meldung konnte nicht gesendet werden. Versuch es erneut.",
    };
  }
  return {
    message: "Danke, die Meldung ist eingegangen. Wir sehen sie uns an.",
  };
}

/** Entfernt ein Mitglied aus einer Community. Es kann 30 Tage lang nicht wieder beitreten. */
export async function removeMember(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({ groupId: z.uuid(), userId: z.uuid() })
    .safeParse({
      groupId: formData.get("groupId"),
      userId: formData.get("userId"),
    });
  if (!parsed.success) return { error: "Dieses Mitglied gibt es nicht mehr." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_group_member", {
    gid: parsed.data.groupId,
    uid: parsed.data.userId,
  });
  if (error)
    return {
      error:
        "Entfernen hat nicht geklappt. Verwaltende lassen sich nicht entfernen.",
    };

  revalidatePath(`/community/${parsed.data.groupId}`);
  return { message: "Entfernt." };
}

/** Zustimmung zur aktuellen Fassung der Nutzungsbedingungen mit Bestätigung des Mindestalters. */
export async function acceptTerms(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("terms") !== "on")
    return { error: "Bestätige dein Alter und die Nutzungsbedingungen." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_terms", {
    p_version: TERMS_VERSION,
  });
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };

  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- Geplante Trainings ----------

const meetupSchema = z.object({
  title: z.string().trim().max(80, "Höchstens 80 Zeichen für den Titel."),
  templateId: z.union([z.literal(""), z.uuid()]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Wähl einen Tag."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Wähl eine Uhrzeit."),
  place: z.string().trim().max(80, "Höchstens 80 Zeichen für den Treffpunkt."),
  max: z.union([
    z.literal(""),
    z.coerce
      .number()
      .int("Die Höchstzahl ist eine ganze Zahl.")
      .min(2, "Mindestens 2 Plätze.")
      .max(500, "Höchstens 500 Plätze."),
  ]),
  note: z.string().trim().max(300, "Höchstens 300 Zeichen für die Notiz."),
  shareWith: z.array(z.uuid()).max(20),
  sportId: z.string().regex(/^[a-z0-9_]{2,30}$/, "Wähl eine Sportart."),
  hours: z.string(),
  minutes: z.string(),
  distance: z.string(),
  elevation: z.string(),
  pace: z.string(),
  speed: z.string(),
  level: z.union([z.literal(""), z.enum(MEETUP_LEVELS)]),
});

/** Dauer, Distanz und Tempo aus den Textfeldern. Fehler als Satz für das Formular. */
function meetupMeasures(d: z.infer<typeof meetupSchema>) {
  const durationMinutes = parseDurationMinutes(d.hours, d.minutes);
  if (durationMinutes === null)
    return {
      error: "Gib eine Dauer zwischen 1 Minute und 24 Stunden ein.",
    } as const;
  const distanceM = parseDistanceKm(d.distance);
  if (Number.isNaN(distanceM))
    return {
      error: "Gib die Distanz in Kilometern ein, zum Beispiel 8,5.",
    } as const;
  const elevationM = parseElevation(d.elevation);
  if (Number.isNaN(elevationM))
    return {
      error: "Gib die Höhenmeter als ganze Zahl bis 20.000 ein.",
    } as const;
  const paceSecondsPerKm = parsePace(d.pace);
  if (Number.isNaN(paceSecondsPerKm)) {
    return {
      error:
        "Gib das Tempo als Minuten und Sekunden je Kilometer ein, zum Beispiel 6:00 oder 5.30.",
    } as const;
  }
  const speedKmh = parseSpeed(d.speed);
  if (Number.isNaN(speedKmh))
    return { error: "Gib das Tempo in km/h ein, zum Beispiel 25." } as const;
  return {
    durationMinutes,
    distanceM,
    elevationM,
    paceSecondsPerKm,
    speedKmh,
  } as const;
}

const MEETUP_FAILED =
  "Das hat nicht geklappt. Prüf deine Verbindung und versuch es erneut.";

function shareIds(formData: FormData) {
  return [...new Set(formData.getAll("shareWith").map(String))];
}

/** Eingaben des Formulars „Training planen“ bzw. „bearbeiten“ geprüft und umgerechnet. */
async function readMeetupForm(formData: FormData) {
  const parsed = meetupSchema.safeParse({
    title: formData.get("title") ?? "",
    templateId: formData.get("templateId") ?? "",
    date: formData.get("date") ?? "",
    time: formData.get("time") ?? "",
    place: formData.get("place") ?? "",
    max: formData.get("max") ?? "",
    note: formData.get("note") ?? "",
    shareWith: shareIds(formData),
    sportId: formData.get("sportId") ?? "",
    hours: formData.get("hours") ?? "",
    minutes: formData.get("minutes") ?? "",
    distance: formData.get("distance") ?? "",
    elevation: formData.get("elevation") ?? "",
    pace: formData.get("pace") ?? "",
    speed: formData.get("speed") ?? "",
    level: formData.get("level") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) } as const;
  const measures = meetupMeasures(parsed.data);
  if ("error" in measures) return { error: measures.error } as const;

  const startsAt = berlinLocalToDate(parsed.data.date, parsed.data.time);
  if (!startsAt) return { error: "Tag oder Uhrzeit sind ungültig." } as const;
  if (startsAt.getTime() <= Date.now())
    return { error: "Der Zeitpunkt liegt in der Vergangenheit." } as const;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return {
      error: "Du bist nicht mehr angemeldet. Melde dich erneut an.",
    } as const;

  // Ohne eigenen Titel heißt das Training wie die Vorlage, sonst wie die Sportart.
  let title = parsed.data.title;
  if (!title && parsed.data.templateId) {
    const { data: template } = await supabase
      .from("workout_templates")
      .select("name")
      .eq("id", parsed.data.templateId)
      .eq("user_id", userId)
      .maybeSingle();
    title = template?.name ?? "";
  }
  if (!title) {
    const { data: sport } = await supabase
      .from("sports")
      .select("name")
      .eq("id", parsed.data.sportId)
      .maybeSingle();
    if (!sport) return { error: "Wähl eine Sportart aus der Liste." } as const;
    title = sport.name;
  }

  return {
    supabase,
    shareWith: parsed.data.shareWith,
    // Gemeinsame Angaben für plan_meetup und update_meetup
    fields: {
      p_title: title.slice(0, 80),
      p_starts_at: startsAt.toISOString(),
      // Leere Angaben schickt die App als null; die Typen der Datenbankfunktion kennen dafür undefined.
      p_place: parsed.data.place || undefined,
      p_max_participants: parsed.data.max === "" ? undefined : parsed.data.max,
      p_note: parsed.data.note || undefined,
      p_template_id: parsed.data.templateId || undefined,
      p_sport_id: parsed.data.sportId,
      p_duration_minutes: measures.durationMinutes,
      p_distance_m: measures.distanceM ?? undefined,
      p_elevation_m: measures.elevationM ?? undefined,
      p_pace_seconds_per_km: measures.paceSecondsPerKm ?? undefined,
      p_speed_kmh: measures.speedKmh ?? undefined,
      p_level: parsed.data.level || undefined,
    },
  } as const;
}

/**
 * Fehler der Datenbank beim Planen oder Ändern als Satz für das Formular. denied: was eine
 * verweigerte Zugriffsregel (42501) bei dieser Aktion bedeutet.
 */
function meetupWriteError(
  error: { code?: string; message?: string },
  denied: string,
): string {
  const known = meetupErrorMessage(error);
  if (known) return known;
  if (error.message?.includes("Höchstens 60")) {
    return "Mehr als 60 geplante Trainings gehen nicht. Sag eine Reihe oder ein Training ab.";
  }
  if (error.code === "42501") return denied;
  return MEETUP_FAILED;
}

/**
 * Plant ein Training (plan_meetup): ganz oder gar nicht, samt Teilen. Ohne Teilen bleibt es privat.
 * Mit „Jede Woche“ entsteht eine Reihe mit den nächsten acht Terminen. Die ID kommt vom Gerät,
 * ein erneutes Senden legt nichts doppelt an. Wer plant, ist automatisch dabei (Trigger).
 */
export async function createMeetup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: MEETUP_FAILED };
  const input = await readMeetupForm(formData);
  if ("error" in input) return { error: input.error };

  const { data, error } = await input.supabase.rpc("plan_meetup", {
    ...input.fields,
    p_id: id.data,
    p_share_ids: input.shareWith,
    p_weekly: formData.get("weekly") === "on",
  });
  if (error || !data) {
    const denied =
      "Teilen hat nicht geklappt. Bist du noch Mitglied der gewählten Communities?";
    return { error: error ? meetupWriteError(error, denied) : MEETUP_FAILED };
  }

  revalidatePath("/", "layout");
  redirect(`/plan/${data}`);
}

/**
 * Ändert ein eigenes kommendes Training (update_meetup): nur diesen Termin oder bei einer Reihe
 * diesen und alle folgenden. Wer zugesagt hat, erfährt von neuer Zeit oder neuem Treffpunkt.
 */
export async function updateMeetup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("meetupId"));
  const scope = z
    .enum(["single", "series"])
    .safeParse(formData.get("scope") ?? "single");
  if (!id.success || !scope.success)
    return { error: "Dieses Training gibt es nicht mehr." };
  const input = await readMeetupForm(formData);
  if ("error" in input) return { error: input.error };

  const { data, error } = await input.supabase.rpc("update_meetup", {
    ...input.fields,
    p_id: id.data,
    p_scope: scope.data,
  });
  if (error)
    return {
      error: meetupWriteError(
        error,
        "Ändern lässt sich nur ein eigenes, kommendes Training.",
      ),
    };
  if (!data)
    return {
      error: "Dieses Training gibt es nicht mehr oder es hat schon begonnen.",
    };

  revalidatePath("/", "layout");
  redirect(`/plan/${data}`);
}

const meetupId = z.uuid();

/** Legt fest, mit welchen Communities ein eigenes Training geteilt ist. */
export async function updateMeetupShares(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = meetupId.safeParse(formData.get("meetupId"));
  const wanted = z.array(z.uuid()).max(20).safeParse(shareIds(formData));
  if (!id.success || !wanted.success)
    return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { data: current, error } = await supabase
    .from("meetup_shares")
    .select("group_id")
    .eq("meetup_id", id.data);
  if (error) return { error: MEETUP_FAILED };

  const have = new Set(current.map((s) => s.group_id));
  const add = wanted.data.filter((g) => !have.has(g));
  const remove = [...have].filter((g) => !wanted.data.includes(g));

  if (add.length > 0) {
    const { error: addError } = await supabase
      .from("meetup_shares")
      .insert(
        add.map((groupId) => ({ meetup_id: id.data, group_id: groupId })),
      );
    if (addError) return { error: MEETUP_FAILED };
  }
  if (remove.length > 0) {
    const { error: removeError } = await supabase
      .from("meetup_shares")
      .delete()
      .eq("meetup_id", id.data)
      .in("group_id", remove);
    if (removeError) return { error: MEETUP_FAILED };
  }

  revalidatePath("/", "layout");
  return { message: wanted.data.length === 0 ? "Jetzt privat" : "Gespeichert" };
}

/** Nimmt ein Training von der Pinnwand einer Community, die ich verwalte. */
export async function removeMeetupShare(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({ meetupId: z.uuid(), groupId: z.uuid() })
    .safeParse({
      meetupId: formData.get("meetupId"),
      groupId: formData.get("groupId"),
    });
  if (!parsed.success) return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetup_shares")
    .delete()
    .eq("meetup_id", parsed.data.meetupId)
    .eq("group_id", parsed.data.groupId)
    .select("group_id");
  if (error || data.length === 0)
    return { error: "Das hat nicht geklappt. Verwaltest du diese Community?" };

  revalidatePath("/", "layout");
  redirect(`/community/${parsed.data.groupId}`);
}

/** Sagt für ein Training zu ("Ich bin dabei"). */
export async function joinMeetup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = meetupId.safeParse(formData.get("meetupId"));
  if (!id.success) return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { error } = await supabase
    .from("meetup_participants")
    .insert({ meetup_id: id.data, user_id: userId });
  // 23505: schon dabei, das ist kein Fehler.
  if (error && error.code !== "23505") {
    if (error.message.includes("voll"))
      return { error: "Dieses Training ist schon voll." };
    if (error.message.includes("stattgefunden"))
      return { error: "Dieses Training hat schon stattgefunden." };
    return { error: MEETUP_FAILED };
  }

  revalidatePath("/", "layout");
  return {};
}

/**
 * Sagt über den öffentlichen Link zu (join_public_meetup). Wer noch nicht Mitglied ist, tritt
 * dabei der öffentlichen Community bei. Läuft nach ausdrücklichem Tipp oder, wer vor der
 * Registrierung „zusagen“ gewählt hat, direkt nach der Anmeldung.
 */
export async function joinPublicMeetup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = meetupId.safeParse(formData.get("meetupId"));
  if (!id.success) return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_public_meetup", { mid: id.data });
  if (error) {
    if (error.message.includes("voll"))
      return { error: "Dieses Training ist schon voll." };
    if (error.message.includes("stattgefunden"))
      return { error: "Dieses Training hat schon stattgefunden." };
    if (error.message.includes("Nicht angemeldet"))
      return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };
    if (error.code === "42501")
      return {
        error: "Zu diesem Training kannst du über den Link nicht zusagen.",
      };
    return { error: MEETUP_FAILED };
  }
  // Herkunft nur bei neuen Konten (prüft die Datenbank); ein Fehler hier hält niemanden auf.
  await supabase.rpc("record_signup_source", {
    p_source: "event_link",
    p_campaign: campaignTag(String(formData.get("quelle") ?? "")) ?? undefined,
  });

  revalidatePath("/", "layout");
  redirect(`/plan/${id.data}?zugesagt=1`);
}

/**
 * Beantwortet „Warst du dabei?“ (confirm_attendance). Bei „Ja“ entsteht eine Aktivität mit Sportart
 * und Dauer des Trainings, die als Trainingstag zählt; „Nein“ nimmt sie wieder zurück.
 */
export async function confirmAttendance(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = meetupId.safeParse(formData.get("meetupId"));
  const answer = z.enum(["ja", "nein"]).safeParse(formData.get("antwort"));
  if (!id.success || !answer.success)
    return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_attendance", {
    p_meetup_id: id.data,
    p_attended: answer.data === "ja",
  });
  if (error) {
    if (error.message.includes("noch nicht vorbei"))
      return { error: "Das Training ist noch nicht vorbei." };
    if (error.message.includes("zu lange her"))
      return { error: "Das Training ist mehr als 14 Tage her." };
    if (error.code === "42501")
      return { error: "Bestätigen kann nur, wer zugesagt hat." };
    return { error: MEETUP_FAILED };
  }

  revalidatePath("/", "layout");
  // Nach „Ja“ auf „Heute“ bleiben (mit Hinweis), sonst zur Seite des Trainings: dort steht, dass es
  // zählt, mit dem Weg zur Aktivität.
  if (answer.data === "ja")
    redirect(
      formData.get("von") === "heute" ? "/?dabei=1" : `/plan/${id.data}`,
    );
  return { message: "Gespeichert." };
}

/** Sagt für ein Training ab. Damit schließt sich auch der Chat. */
export async function leaveMeetup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = meetupId.safeParse(formData.get("meetupId"));
  if (!id.success) return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { error } = await supabase
    .from("meetup_participants")
    .delete()
    .eq("meetup_id", id.data)
    .eq("user_id", userId);
  if (error) return { error: MEETUP_FAILED };

  revalidatePath("/", "layout");
  return {};
}

/** Entfernt ein eigenes Training, für alle. */
export async function deleteMeetup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = meetupId.safeParse(formData.get("meetupId"));
  if (!id.success) return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetups")
    .delete()
    .eq("id", id.data)
    .select("id");
  if (error || data.length === 0)
    return { error: "Das Training konnte nicht entfernt werden." };

  revalidatePath("/", "layout");
  redirect("/");
}

/** Sagt diesen und alle folgenden Termine einer eigenen Reihe ab und beendet die Reihe. */
export async function cancelMeetupSeries(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = meetupId.safeParse(formData.get("meetupId"));
  if (!id.success) return { error: "Dieses Training gibt es nicht mehr." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_meetup_series", {
    p_id: id.data,
  });
  if (error || !data) {
    return {
      error:
        "Die Reihe konnte nicht abgesagt werden. Lade die Seite neu und versuch es erneut.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- Chat ----------

/**
 * Schreibt eine Nachricht in einen Chat. Nur wer Zugang hat (RLS, private.can_access_chat).
 * Die ID kommt vom Gerät: Wird nach einem Verbindungsabbruch erneut gesendet, entsteht nichts doppelt.
 */
export async function sendChatMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({
      id: z.uuid(),
      chatId: z.uuid(),
      body: z
        .string()
        .trim()
        .min(1, "Schreib eine Nachricht.")
        .max(1000, "Höchstens 1000 Zeichen."),
    })
    .safeParse({
      id: formData.get("id"),
      chatId: formData.get("chatId"),
      body: formData.get("body") ?? "",
    });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { error } = await supabase
    .from("chat_messages")
    .insert({
      id: parsed.data.id,
      chat_id: parsed.data.chatId,
      user_id: userId,
      body: parsed.data.body,
    });
  if (error && error.code !== "23505") {
    if (error.message.includes("Zu viele"))
      return { error: "Zu viele Nachrichten. Warte einen Moment." };
    if (error.code === "42501")
      return { error: "Schreiben können nur alle, die dabei sind." };
    return { error: "Die Nachricht wurde nicht gesendet. Versuch es erneut." };
  }

  revalidatePath("/chats", "layout");
  return { message: "sent" };
}

/** Löscht eine eigene Nachricht. */
export async function deleteChatMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({ id: z.uuid(), chatId: z.uuid() })
    .safeParse({ id: formData.get("id"), chatId: formData.get("chatId") });
  if (!parsed.success) return { error: "Diese Nachricht gibt es nicht mehr." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { error: "Die Nachricht konnte nicht gelöscht werden." };

  revalidatePath("/chats", "layout");
  return {};
}

/** Merkt sich, dass man einen Chat bis jetzt gelesen hat. Wiederholbar. */
export async function markChatRead(chatId: string): Promise<void> {
  const id = z.uuid().safeParse(chatId);
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_chat_read", { cid: id.data });

  // Die Push-Mitteilungen zu diesem Chat gelten damit ebenfalls als gelesen.
  const { data: chat } = await supabase
    .from("chats")
    .select("meetup_id, group_id")
    .eq("id", id.data)
    .maybeSingle();
  if (!chat) return;
  const unread = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (chat.meetup_id)
    await unread.eq("kind", "message").eq("meetup_id", chat.meetup_id);
  else if (chat.group_id)
    await unread.eq("kind", "community_message").eq("group_id", chat.group_id);
  else
    await unread
      .in("kind", ["direct_message", "message_request"])
      .eq("chat_id", id.data);
}

/** Zahl der Chats mit ungelesenen Nachrichten, für die Zahl am Tab. */
export async function fetchUnreadChatCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_chat_count");
  return error ? 0 : (data ?? 0);
}

// ---------- Mitteilungen ----------

/** Zahl der ungelesenen Mitteilungen, für die Glocke (fragt regelmäßig nach). */
export async function fetchUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .not("kind", "in", `(${CHAT_NOTIFICATION_KINDS.join(",")})`)
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}

/** Markiert alle eigenen Mitteilungen als gelesen, etwa beim Öffnen der Mitteilungen. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  // Ohne Neuladen: Die offene Seite zeigt "Neu" noch für diesen Besuch, die Glocke setzt sich selbst zurück.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .not("kind", "in", `(${CHAT_NOTIFICATION_KINDS.join(",")})`)
    .is("read_at", null);
}

/** Markiert die Mitteilungen zu einem Training als gelesen, sobald man es ansieht. */
export async function markMeetupNotificationsRead(
  meetupId: string,
): Promise<void> {
  const id = z.uuid().safeParse(meetupId);
  if (!id.success) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("meetup_id", id.data)
    .is("read_at", null)
    .select("id");
  if (data && data.length > 0) revalidatePath("/", "layout");
}

/** Speichert, welche Mitteilungen man bekommen will. */
export async function updateNotificationPrefs(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const on = (name: string) => formData.get(name) === "on";
  const { error } = await supabase.from("notification_prefs").upsert({
    user_id: userId,
    new_training_private: on("newTrainingPrivate"),
    new_training_public: on("newTrainingPublic"),
    joined: on("joined"),
    message: on("message"),
    cancelled: on("cancelled"),
    reminder: on("reminder"),
    community_message: on("communityMessage"),
    friends: on("friends"),
    direct_message: on("directMessage"),
    updated_at: new Date().toISOString(),
  });
  if (error)
    return {
      error:
        "Die Einstellungen konnten nicht gespeichert werden. Versuch es erneut.",
    };

  revalidatePath("/profil/einstellungen");
  return { message: "Gespeichert" };
}

const pushSubscription = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/** Speichert das Push-Abo dieses Geräts für die angemeldete Person. */
export async function savePushSubscription(input: unknown): Promise<FormState> {
  const parsed = pushSubscription.safeParse(input);
  if (!parsed.success)
    return { error: "Dieses Gerät unterstützt keine Mitteilungen." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  if (error)
    return {
      error:
        "Mitteilungen konnten nicht eingeschaltet werden. Versuch es erneut.",
    };
  return { message: "Eingeschaltet" };
}

/** Entfernt das Push-Abo dieses Geräts. */
export async function removePushSubscription(
  endpoint: unknown,
): Promise<FormState> {
  const parsed = z.string().max(1000).safeParse(endpoint);
  if (!parsed.success) return {};
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data);
  return { message: "Ausgeschaltet" };
}

// ---------- Passwort zurücksetzen ----------

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = z
    .email("Gib eine gültige E-Mail-Adresse ein.")
    .safeParse(formData.get("email"));
  if (!email.success) return { error: firstIssue(email.error) };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/passwort-neu")}`,
  });

  // Immer dieselbe Antwort, damit niemand herausfinden kann, welche Adressen ein Konto haben.
  return {
    message:
      "Falls es zu dieser Adresse ein Konto gibt, haben wir dir einen Link geschickt.",
  };
}

export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = z
    .string()
    .min(8, "Das Passwort braucht mindestens 8 Zeichen.")
    .safeParse(formData.get("password"));
  if (!password.success) return { error: firstIssue(password.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    return {
      error:
        "Das Passwort konnte nicht geändert werden. Fordere einen neuen Link an.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- Profil ----------

const profileDetails = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Gib einen Namen ein.")
    .max(40, "Der Name darf höchstens 40 Zeichen haben."),
  bio: z
    .string()
    .trim()
    .max(MAX_BIO, `Der Kurztext darf höchstens ${MAX_BIO} Zeichen haben.`)
    .transform((v) => v || null),
  city: z
    .string()
    .trim()
    .max(60, "Die Stadt darf höchstens 60 Zeichen haben.")
    .transform((v) => v || null),
  sports: z
    .array(z.string().max(40, "Eine Sportart darf höchstens 40 Zeichen haben."))
    .max(20),
  isPrivate: z.boolean(),
});

/** Speichert Name, Kurztext, Stadt, Sportarten und ob das Konto privat ist, und führt zurück zum Profil. */
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = profileDetails.safeParse({
    displayName: formData.get("displayName") ?? "",
    bio: formData.get("bio") ?? "",
    city: formData.get("city") ?? "",
    sports: formData.getAll("sports").filter((v) => typeof v === "string"),
    isPrivate: formData.get("isPrivate") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { displayName, bio, city, sports, isPrivate } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio,
      city,
      sports: normalizeSports(sports),
      is_private: isPrivate,
    })
    .eq("id", userId);
  if (error)
    return {
      error: "Das Profil konnte nicht gespeichert werden. Versuch es erneut.",
    };

  revalidatePath("/", "layout");
  redirect("/profil");
}

const AVATAR_MAX_BYTES = 512 * 1024;

/** Erkennt WebP und JPEG an den ersten Bytes, unabhängig davon, was der Browser angibt. */
function avatarExtension(bytes: Uint8Array): "webp" | "jpg" | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
    return "webp";
  if (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "jpg";
  return null;
}

/**
 * Lädt ein neues Profilbild hoch. Das Gerät hat es schon auf 512 × 512 Pixel verkleinert. Jedes Bild
 * bekommt einen neuen, zufälligen Namen; das alte wird danach gelöscht.
 */
export async function uploadAvatar(formData: FormData): Promise<FormState> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Wähle ein Bild aus." };
  if (file.size > AVATAR_MAX_BYTES)
    return { error: "Das Bild ist zu groß. Wähle ein anderes." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = avatarExtension(bytes);
  if (!ext)
    return {
      error:
        "Dieses Bildformat wird nicht unterstützt. Wähle ein Foto im Format JPEG, PNG oder WebP.",
    };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const failed = {
    error:
      "Das Bild konnte nicht gespeichert werden. Prüf deine Verbindung und versuch es erneut.",
  };

  const upload = await supabase.storage.from("avatars").upload(path, bytes, {
    contentType: ext === "webp" ? "image/webp" : "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) return failed;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", userId);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    return failed;
  }
  if (current?.avatar_url)
    await supabase.storage.from("avatars").remove([current.avatar_url]);

  revalidatePath("/", "layout");
  return { message: "Profilbild gespeichert" };
}

/** Entfernt das Profilbild. Danach erscheinen wieder die Initialen. */
export async function removeAvatar(): Promise<FormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);
  if (error)
    return {
      error: "Das Bild konnte nicht entfernt werden. Versuch es erneut.",
    };
  if (current?.avatar_url)
    await supabase.storage.from("avatars").remove([current.avatar_url]);

  revalidatePath("/", "layout");
  return { message: "Profilbild entfernt" };
}

// ---------- Folgen ----------

const personId = z.uuid();

function revalidateFollows(id: string) {
  revalidatePath(`/person/${id}`);
  revalidatePath("/verbindungen");
  revalidatePath("/profil");
  revalidatePath("/menschen");
}

/** Folgen: öffentlichen Konten sofort, privaten als Anfrage. */
export async function followPerson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = personId.safeParse(formData.get("personId"));
  if (!id.success) return { error: "Diese Person gibt es nicht." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("follow_person", {
    target: id.data,
  });
  if (error) {
    if (error.code === "54000")
      return {
        error:
          "Du hast viele offene Anfragen. Warte, bis einige beantwortet sind.",
      };
    return { error: "Folgen hat nicht geklappt. Versuch es erneut." };
  }
  revalidateFollows(id.data);
  return { message: data === "pending" ? "Angefragt" : "Du folgst jetzt" };
}

/** Nicht mehr folgen oder eine Anfrage zurückziehen. */
export async function unfollowPerson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = personId.safeParse(formData.get("personId"));
  if (!id.success) return { error: "Diese Person gibt es nicht." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unfollow_person", { target: id.data });
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };
  revalidateFollows(id.data);
  return {};
}

/** Folgen-Anfrage annehmen oder ablehnen. */
export async function respondFollowRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = personId.safeParse(formData.get("personId"));
  if (!id.success) return { error: "Diese Anfrage gibt es nicht mehr." };
  const accept = formData.get("accept") === "yes";
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_follow_request", {
    follower: id.data,
    accept,
  });
  if (error) return { error: "Diese Anfrage gibt es nicht mehr." };
  revalidateFollows(id.data);
  revalidatePath("/", "layout");
  return { message: accept ? "Angenommen" : "Abgelehnt" };
}

/** Einen Follower entfernen. */
export async function removeFollower(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = personId.safeParse(formData.get("personId"));
  if (!id.success) return { error: "Diese Person gibt es nicht." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_follower", {
    follower: id.data,
  });
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };
  revalidateFollows(id.data);
  return { message: "Entfernt" };
}

/** Blockiert eine Person: kein Folgen und keine Privatchats mehr, in beide Richtungen. */
export async function blockPerson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = personId.safeParse(formData.get("personId"));
  if (!id.success) return { error: "Diese Person gibt es nicht." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_person", { target: id.data });
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };
  revalidateFollows(id.data);
  return { message: "Blockiert" };
}

export async function unblockPerson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = personId.safeParse(formData.get("personId"));
  if (!id.success) return { error: "Diese Person gibt es nicht." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unblock_person", { target: id.data });
  if (error) return { error: "Das hat nicht geklappt. Versuch es erneut." };
  revalidateFollows(id.data);
  return {};
}

/**
 * Öffnet den Privatchat mit einer Person. Wer sich gegenseitig folgt, schreibt direkt; sonst wird
 * die erste Nachricht zur Anfrage (an öffentliche Konten und an Konten, denen ich bestätigt folge).
 */
export async function openDirectChat(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = personId.safeParse(formData.get("personId"));
  if (!id.success) return { error: "Diese Person gibt es nicht." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_direct_chat", {
    other: id.data,
  });
  if (error || !data)
    return {
      error:
        "Einem privaten Konto kannst du erst schreiben, wenn du ihm folgst.",
    };
  redirect(`/chats/${data}`);
}

/** Nachrichtenanfrage annehmen oder ablehnen (ablehnen löscht den Chat). */
export async function respondChatRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("chatId"));
  if (!id.success) return { error: "Diese Anfrage gibt es nicht mehr." };
  const accept = formData.get("accept") === "yes";
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_chat_request", {
    cid: id.data,
    accept,
  });
  if (error) return { error: "Diese Anfrage gibt es nicht mehr." };
  revalidatePath("/chats", "layout");
  if (!accept) redirect("/chats");
  return {};
}

// ---------- Einladung ----------

/**
 * Tritt einer Community aus einem Teilen-Link bei. Läuft nach ausdrücklicher Bestätigung oder,
 * wer vor der Registrierung „Beitreten" gewählt hat, direkt nach der Anmeldung.
 */
export async function acceptInvite(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = z.string().trim().min(1).safeParse(formData.get("code"));
  if (!code.success) return { error: "Dieser Einladungslink ist ungültig." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { code: code.data });
  if (error || !data) return { error: "Dieser Einladungslink ist ungültig." };
  // Herkunft nur bei neuen Konten (prüft die Datenbank); ein Fehler hier hält niemanden auf.
  await supabase.rpc("record_signup_source", {
    p_source: "group_link",
    p_campaign: campaignTag(String(formData.get("quelle") ?? "")) ?? undefined,
  });

  revalidatePath("/community");
  redirect(`/community/${data}`);
}

// ---------- Konto löschen ----------

/**
 * Löscht das eigene Konto samt allen eigenen Daten (delete_own_account).
 * Die Datenbankfunktion wirkt nur auf den angemeldeten Nutzer und regelt auch,
 * was mit seinen Gruppen passiert.
 */
export async function deleteAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("confirm") !== "yes") {
    return { error: "Bestätige zuerst, dass du dein Konto löschen willst." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId)
    return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  // Profilbilder zuerst: Dateien im Storage hängen nicht am Profil und verschwinden sonst nicht.
  const { data: files, error: listError } = await supabase.storage
    .from("avatars")
    .list(userId, { limit: 100 });
  const removed = files?.length
    ? await supabase.storage
        .from("avatars")
        .remove(files.map((f) => `${userId}/${f.name}`))
    : { error: null };
  if (listError || removed.error) {
    return {
      error:
        "Das Konto konnte nicht gelöscht werden. Prüf deine Verbindung und versuch es erneut.",
    };
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return {
      error:
        "Das Konto konnte nicht gelöscht werden. Prüf deine Verbindung und versuch es erneut.",
    };
  }

  // Das Konto existiert nicht mehr. Nur noch die Sitzungs-Cookies auf diesem Gerät entfernen.
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login?geloescht=1");
}

// ---------- KI-Zugriff (MCP) ----------

const authorizationId = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9._~-]+$/);

/**
 * Erlaubt oder verweigert einer KI-App den Zugriff und leitet zur App zurück.
 * Was die KI lesen darf, legt die Datenbank fest (Migration agent_read_only).
 */
export async function decideAgentAccess(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = authorizationId.safeParse(formData.get("authorizationId"));
  const decision = formData.get("decision");
  if (!id.success || (decision !== "approve" && decision !== "deny")) {
    return {
      error:
        "Diese Anfrage ist ungültig. Starte die Verbindung in deiner KI-App neu.",
    };
  }

  const supabase = await createClient();
  const { data, error } =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(id.data, {
          skipBrowserRedirect: true,
        })
      : await supabase.auth.oauth.denyAuthorization(id.data, {
          skipBrowserRedirect: true,
        });

  if (error || !data?.redirect_url) {
    return {
      error:
        "Diese Anfrage ist abgelaufen. Starte die Verbindung in deiner KI-App neu.",
    };
  }

  revalidatePath("/profil/einstellungen");
  redirect(data.redirect_url);
}

/** Entzieht einer KI-App den Zugriff. Ihre Sitzungen und Tokens werden ungültig. */
export async function revokeAgentAccess(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!clientId.success) return { error: "Diese App ist nicht verbunden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.oauth.revokeGrant({
    clientId: clientId.data,
  });
  if (error)
    return {
      error: "Der Zugriff konnte nicht entzogen werden. Versuch es erneut.",
    };

  revalidatePath("/profil/einstellungen");
  return { message: "Zugriff entzogen" };
}
