"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/result";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

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

const groupName = z
  .string()
  .trim()
  .min(1, "Gib der Gruppe einen Namen.")
  .max(60, "Der Name darf höchstens 60 Zeichen haben.");

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = groupName.safeParse(formData.get("name"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Du bist nicht mehr angemeldet. Melde dich erneut an." };

  const { error } = await supabase
    .from("groups")
    .insert({ name: parsed.data, type: "friends", created_by: userId });
  if (error) return { error: "Die Gruppe konnte nicht erstellt werden. Versuch es erneut." };

  revalidatePath("/gruppe");
  return {};
}

export async function joinGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = z.string().trim().min(1).safeParse(formData.get("code"));
  if (!code.success) return { error: "Gib den Einladungscode ein." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_group", { code: code.data });
  if (error) return { error: "Dieser Einladungscode ist ungültig." };

  revalidatePath("/gruppe");
  return {};
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

/** Tritt der Gruppe aus einem Einladungslink bei. Läuft erst nach ausdrücklicher Bestätigung. */
export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = z.string().trim().min(1).safeParse(formData.get("code"));
  if (!code.success) return { error: "Dieser Einladungslink ist ungültig." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { code: code.data });
  if (error || !data) return { error: "Dieser Einladungslink ist ungültig." };

  revalidatePath("/gruppe");
  redirect(`/gruppe?g=${data}`);
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
 * Erlaubt oder verweigert einer KI-App den Lesezugriff und leitet zur App zurück.
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
