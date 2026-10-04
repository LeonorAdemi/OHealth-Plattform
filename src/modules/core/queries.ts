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
export const getMyCommunities = cache(async () => {
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
    city: row.city,
    role: row.role,
    memberCount: row.member_count,
  }));
});

/** Eine eigene Community. null, wenn ich (nicht mehr) Mitglied bin. */
export async function getMyCommunity(id: string) {
  const mine = await getMyCommunities();
  return mine.find((c) => c.id === id) ?? null;
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
    city: row.city,
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
    city: row.city,
    memberCount: row.member_count,
    isMember: row.is_member,
  };
}

// ---------- Treffen ----------

type MeetupRow = {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  starts_at: string;
  place: string;
  max_participants: number | null;
  note: string | null;
  meetup_participants: { count: number }[];
};

const MEETUP_COLUMNS =
  "id, group_id, created_by, title, starts_at, place, max_participants, note, meetup_participants(count)";

function toMeetup(row: MeetupRow, joined: ReadonlySet<string>, userId: string) {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    startsAt: row.starts_at,
    place: row.place,
    maxParticipants: row.max_participants,
    note: row.note,
    count: row.meetup_participants[0]?.count ?? 0,
    isJoined: joined.has(row.id),
    isMine: row.created_by === userId,
  };
}

export type Meetup = ReturnType<typeof toMeetup>;

/**
 * Kommende Treffen, nächstes zuerst: einer Community oder, ohne groupId, aus allen eigenen
 * Communities. Treffen sehen nur Mitglieder (RLS).
 */
export async function getUpcomingMeetups(now: Date, { groupId, limit = 50 }: { groupId?: string; limit?: number } = {}) {
  const { supabase, userId } = await requireUser();
  let query = supabase
    .from("meetups")
    .select(`${MEETUP_COLUMNS}, groups(name)`)
    .gt("starts_at", now.toISOString())
    .order("starts_at")
    .limit(limit);
  if (groupId) query = query.eq("group_id", groupId);
  const { data, error } = await query;
  if (error) throw new Error("Treffen konnten nicht geladen werden.");

  const ids = data.map((m) => m.id);
  const { data: mine, error: mineError } = ids.length
    ? await supabase.from("meetup_participants").select("meetup_id").eq("user_id", userId).in("meetup_id", ids)
    : { data: [], error: null };
  if (mineError) throw new Error("Treffen konnten nicht geladen werden.");

  const joined = new Set(mine.map((p) => p.meetup_id));
  return data.map((row) => ({ ...toMeetup(row, joined, userId), communityName: row.groups?.name ?? "" }));
}

/** Ein Treffen mit den Namen aller, die dabei sind. null, wenn es das Treffen (für mich) nicht gibt. */
export async function getMeetup(meetupId: string) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("meetups")
    .select(`${MEETUP_COLUMNS}, groups(name)`)
    .eq("id", meetupId)
    .maybeSingle();
  if (error) throw new Error("Das Treffen konnte nicht geladen werden.");
  if (!data) return null;

  const { data: people, error: peopleError } = await supabase.rpc("meetup_participant_names", { mid: meetupId });
  if (peopleError) throw new Error("Das Treffen konnte nicht geladen werden.");

  const joined = new Set(people.some((p) => p.user_id === userId) ? [data.id] : []);
  return {
    ...toMeetup(data, joined, userId),
    communityName: data.groups?.name ?? "",
    participants: people.map((p) => ({ userId: p.user_id, name: p.display_name, isMe: p.user_id === userId })),
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
