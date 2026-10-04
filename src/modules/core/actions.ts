"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/result";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

import { groupTypeFor } from "./logic";

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
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Die Eingabe ist ungültig.";
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registration.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const next = safeNextPath(formData.get("next"));
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: "Registrierung fehlgeschlagen. Versuch es erneut." };

  // Ohne E-Mail-Bestätigung ist man sofort angemeldet, sonst kommt erst die Mail.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return { message: "Fast fertig. Bestätige den Link in der E-Mail, die wir dir geschickt haben." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

const communitySchema = z
  .object({
    name: z.string().trim().min(1, "Gib der Community einen Namen.").max(60, "Der Name darf höchstens 60 Zeichen haben."),
    kind: z.enum(["public", "private", "coaching"]),
    sport: z.string().trim().max(40, "Die Sportart darf höchstens 40 Zeichen haben."),
    location: z.string().trim().max(60, "Der Ort darf höchstens 60 Zeichen haben."),
    description: z.string().trim().max(200, "Die Beschreibung darf höchstens 200 Zeichen haben."),
  })
  .refine((c) => c.kind !== "public" || c.name.length >= 3, {
    message: "Eine öffentliche Community braucht einen Namen mit mindestens 3 Zeichen.",
  })
  .refine((c) => c.kind !== "public" || c.name.length <= 40, {
    message: "Der Name einer öffentlichen Community darf höchstens 40 Zeichen haben.",
  });

const COMMUNITY_SAVE_FAILED = "Die Community konnte nicht erstellt werden. Versuch es erneut.";

/** Legt eine Community an. Wer sie erstellt, verwaltet sie (Admin bzw. Coach). */
export async function createCommunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = communitySchema.safeParse({
    name: formData.get("name") ?? "",
    kind: formData.get("kind") ?? "",
    sport: formData.get("sport") ?? "",
    location: formData.get("location") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: parsed.data.name,
      type: groupTypeFor(parsed.data.kind),
      created_by: userId,
      sport: parsed.data.sport || null,
      location: parsed.data.location || null,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("Höchstens drei Communities")) {
      return { error: "Du hast schon drei öffentliche Communities. Mehr sind nicht möglich." };
    }
    return { error: COMMUNITY_SAVE_FAILED };
  }

  revalidatePath("/community");
  redirect(`/community/${data.id}`);
}

/** Tritt einer öffentlichen Community bei. Private Communities gehen nur über den Link. */
export async function joinPublicCommunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Diese Community gibt es nicht mehr." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { error } = await supabase.from("group_members").insert({ group_id: id.data, user_id: userId });
  // 23505: schon Mitglied, das ist kein Fehler.
  if (error && error.code !== "23505") return { error: "Beitreten hat nicht geklappt. Versuch es erneut." };

  revalidatePath("/community");
  redirect(`/community/${id.data}`);
}

/** Tritt mit einem Einladungscode bei (eingetippt statt über den Link). */
export async function joinWithCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = z.string().trim().min(1).safeParse(formData.get("code"));
  if (!code.success) return { error: "Gib den Einladungscode ein." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { code: code.data });
  if (error || !data) return { error: "Dieser Einladungscode ist ungültig." };

  revalidatePath("/community");
  redirect(`/community/${data}`);
}

/**
 * Verlässt eine Community. Wer sie als Einziger verwaltet, übergibt die Verwaltung an das
 * Mitglied, das am längsten dabei ist. Ist man das letzte Mitglied oder der einzige Coach,
 * wird sie gelöscht, wie beim Löschen des Kontos (delete_own_account).
 */
export async function leaveCommunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Diese Community gibt es nicht mehr." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  // Als Verwalter sieht man alle Mitglieder, sonst nur sich selbst.
  const { data: members, error: readError } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", id.data)
    .order("joined_at")
    .limit(500);
  if (readError) return { error: "Verlassen hat nicht geklappt. Versuch es erneut." };

  const me = members.find((m) => m.user_id === userId);
  if (!me) return { error: "Du bist kein Mitglied dieser Community." };
  const others = members.filter((m) => m.user_id !== userId);
  const managesAlone =
    (me.role === "admin" || me.role === "coach") &&
    !others.some((m) => m.role === "admin" || m.role === "coach");

  if (managesAlone && (others.length === 0 || me.role === "coach")) {
    const { error } = await supabase.from("groups").delete().eq("id", id.data);
    if (error) return { error: "Verlassen hat nicht geklappt. Versuch es erneut." };
  } else {
    if (managesAlone) {
      const { error } = await supabase
        .from("group_members")
        .update({ role: "admin" })
        .eq("group_id", id.data)
        .eq("user_id", others[0].user_id);
      if (error) return { error: "Verlassen hat nicht geklappt. Versuch es erneut." };
    }
    const { error } = await supabase.from("group_members").delete().eq("group_id", id.data).eq("user_id", userId);
    if (error) return { error: "Verlassen hat nicht geklappt. Versuch es erneut." };
  }

  revalidatePath("/community");
  redirect("/community");
}

/** Meldet eine Community, zum Beispiel wegen eines unpassenden Namens. Der Betreiber prüft. */
export async function reportCommunity(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      id: z.uuid(),
      reason: z.string().trim().min(1, "Schreib kurz, was nicht passt.").max(500, "Höchstens 500 Zeichen."),
    })
    .safeParse({ id: formData.get("id"), reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ group_id: parsed.data.id, reason: parsed.data.reason });
  if (error) return { error: "Die Meldung konnte nicht gesendet werden. Versuch es erneut." };

  return { message: "Danke, die Meldung ist eingegangen. Wir sehen sie uns an." };
}

// ---------- Passwort zurücksetzen ----------

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = z.email("Gib eine gültige E-Mail-Adresse ein.").safeParse(formData.get("email"));
  if (!email.success) return { error: firstIssue(email.error) };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/passwort-neu")}`,
  });

  // Immer dieselbe Antwort, damit niemand herausfinden kann, welche Adressen ein Konto haben.
  return { message: "Falls es zu dieser Adresse ein Konto gibt, haben wir dir einen Link geschickt." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = z
    .string()
    .min(8, "Das Passwort braucht mindestens 8 Zeichen.")
    .safeParse(formData.get("password"));
  if (!password.success) return { error: firstIssue(password.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    return { error: "Das Passwort konnte nicht geändert werden. Fordere einen neuen Link an." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- Profil ----------

export async function updateDisplayName(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = z
    .string()
    .trim()
    .min(1, "Gib einen Namen ein.")
    .max(40, "Der Name darf höchstens 40 Zeichen haben.")
    .safeParse(formData.get("displayName"));
  if (!name.success) return { error: firstIssue(name.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.data })
    .eq("id", userId);
  if (error) return { error: "Der Name konnte nicht gespeichert werden. Versuch es erneut." };

  revalidatePath("/", "layout");
  return { message: "Gespeichert" };
}

// ---------- Einladung ----------

/**
 * Tritt einer Community aus einem Teilen-Link bei. Läuft nach ausdrücklicher Bestätigung oder,
 * wer vor der Registrierung „Beitreten" gewählt hat, direkt nach der Anmeldung.
 */
export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = z.string().trim().min(1).safeParse(formData.get("code"));
  if (!code.success) return { error: "Dieser Einladungslink ist ungültig." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { code: code.data });
  if (error || !data) return { error: "Dieser Einladungslink ist ungültig." };

  revalidatePath("/community");
  redirect(`/community/${data}`);
}

// ---------- Konto löschen ----------

/**
 * Löscht das eigene Konto samt allen eigenen Daten (delete_own_account).
 * Die Datenbankfunktion wirkt nur auf den angemeldeten Nutzer und regelt auch,
 * was mit seinen Gruppen passiert.
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("confirm") !== "yes") {
    return { error: "Bestätige zuerst, dass du dein Konto löschen willst." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return { error: "Das Konto konnte nicht gelöscht werden. Prüf deine Verbindung und versuch es erneut." };
  }

  // Das Konto existiert nicht mehr. Nur noch die Sitzungs-Cookies auf diesem Gerät entfernen.
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/login?geloescht=1");
}

// ---------- KI-Zugriff (MCP) ----------

const authorizationId = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9._~-]+$/);

/**
 * Erlaubt oder verweigert einer KI-App den Zugriff und leitet zur App zurück.
 * Was die KI lesen darf, legt die Datenbank fest (Migration agent_read_only).
 */
export async function decideAgentAccess(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = authorizationId.safeParse(formData.get("authorizationId"));
  const decision = formData.get("decision");
  if (!id.success || (decision !== "approve" && decision !== "deny")) {
    return { error: "Diese Anfrage ist ungültig. Starte die Verbindung in deiner KI-App neu." };
  }

  const supabase = await createClient();
  const { data, error } =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(id.data, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(id.data, { skipBrowserRedirect: true });

  if (error || !data?.redirect_url) {
    return { error: "Diese Anfrage ist abgelaufen. Starte die Verbindung in deiner KI-App neu." };
  }

  revalidatePath("/profil");
  redirect(data.redirect_url);
}

/** Entzieht einer KI-App den Zugriff. Ihre Sitzungen und Tokens werden ungültig. */
export async function revokeAgentAccess(_prev: FormState, formData: FormData): Promise<FormState> {
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!clientId.success) return { error: "Diese App ist nicht verbunden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId: clientId.data });
  if (error) return { error: "Der Zugriff konnte nicht entzogen werden. Versuch es erneut." };

  revalidatePath("/profil");
  return { message: "Zugriff entzogen" };
}
