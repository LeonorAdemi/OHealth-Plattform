import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { toExerciseMeasure } from "@/lib/domain";
import type { AgentClient } from "@/lib/supabase/agent";
import { createClient } from "@/lib/supabase/server";

import { communityKind } from "./logic";

/** Angemeldeter Nutzer oder Umleitung zur Anmeldung. Je Anfrage nur einmal ermittelt. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) redirect("/login");
  return { supabase, userId };
});

export async function getProfile() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .single();

  if (error) throw new Error("Profil konnte nicht geladen werden.");
  return data;
}

/** Profil für einen KI-Zugriff über MCP. Der Client trägt das Token der KI. */
export async function getProfileForAgent(supabase: AgentClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("Profil konnte nicht geladen werden.");
  return data ? { displayName: data.display_name, memberSince: data.created_at } : null;
}

/**
 * Verbundene KI-Apps des angemeldeten Nutzers (OAuth-Freigaben bei Supabase Auth).
 * Leer, wenn der OAuth-Server im Supabase-Projekt nicht eingeschaltet ist.
 */
export async function getAgentGrants() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.auth.oauth.listGrants();
  if (error || !data) return [];
  return data.map((grant) => ({
    clientId: grant.client.id,
    name: grant.client.name || "Unbenannte App",
    grantedAt: grant.granted_at,
  }));
}

export async function getExercises() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, measure, muscle_group, aliases")
    .order("name")
    .limit(500);

  if (error) throw new Error("Übungen konnten nicht geladen werden.");
  return data.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    measure: toExerciseMeasure(exercise.measure),
    muscleGroup: exercise.muscle_group,
    aliases: exercise.aliases,
  }));
}

export async function getGroupMembers(groupId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, role, profiles(display_name)")
    .eq("group_id", groupId)
    .limit(200);

  if (error) throw new Error("Mitglieder konnten nicht geladen werden.");
  return data.map((row) => ({
    userId: row.user_id,
    role: row.role,
    name: row.profiles?.display_name ?? "Unbekannt",
  }));
}

// ---------- Community ----------

/** Eigene Communities mit Art, Rolle und Mitgliederzahl, älteste Mitgliedschaft zuerst. */
export async function getMyCommunities() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_communities");

  if (error) throw new Error("Communities konnten nicht geladen werden.");
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    kind: communityKind(row.type),
    inviteCode: row.invite_code,
    description: row.description,
    sport: row.sport,
    location: row.location,
    role: row.role,
    memberCount: row.member_count,
  }));
}

/** Öffentliche Communities, passend zur Suche. Ohne Suchbegriff die größten zuerst. */
export async function searchCommunities(search: string, limit = 20) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("community_search", { search, max_rows: limit });

  if (error) throw new Error("Die Suche hat nicht geklappt.");
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    sport: row.sport,
    location: row.location,
    memberCount: row.member_count,
    isMember: row.is_member,
  }));
}

/**
 * Was ein Teilen-Link zeigt, auch ohne Anmeldung: Name, Art, Beschreibung, Sportart, Ort und
 * Mitgliederzahl, nie Namen von Mitgliedern. null, wenn der Code ungültig ist.
 */
export async function getCommunityPreview(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("community_link_preview", { code });

  if (error) throw new Error("Die Einladung konnte nicht geladen werden.");
  const row = data[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: communityKind(row.type),
    description: row.description,
    sport: row.sport,
    location: row.location,
    memberCount: row.member_count,
    isMember: row.is_member,
  };
}

/**
 * Anfrage einer KI-App, auf die Daten zuzugreifen (OAuth-Bestätigung).
 * null, wenn die Anfrage ungültig oder abgelaufen ist.
 */
export async function getAgentAuthorization(authorizationId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) return null;

  // Bereits bestätigt: direkt zurück zur KI-App.
  if ("redirect_url" in data) return { kind: "redirect" as const, url: data.redirect_url };

  return {
    kind: "consent" as const,
    clientName: data.client.name || "Eine KI-App",
    clientUri: data.client.uri || null,
    redirectUri: data.redirect_uri,
    email: data.user.email,
  };
}
