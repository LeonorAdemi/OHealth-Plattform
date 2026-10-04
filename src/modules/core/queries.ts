import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { toExerciseMeasure } from "@/lib/domain";
import type { AgentClient } from "@/lib/supabase/agent";
import { createClient } from "@/lib/supabase/server";

import { communityKind, toNotificationKind } from "./logic";

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

// ---------- Geplante Trainings ----------

type FeedScope = "board" | "mine" | "communities" | "single";

type FeedRow = {
  id: string;
  title: string;
  starts_at: string;
  place: string | null;
  max_participants: number | null;
  note: string | null;
  template_id: string | null;
  creator_name: string;
  participant_count: number;
  is_joined: boolean;
  is_mine: boolean;
  share_count: number;
};

function toMeetup(row: FeedRow) {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    place: row.place,
    maxParticipants: row.max_participants,
    note: row.note,
    templateId: row.template_id,
    creatorName: row.creator_name,
    count: row.participant_count,
    isJoined: row.is_joined,
    isMine: row.is_mine,
    shareCount: row.share_count,
  };
}

export type Meetup = ReturnType<typeof toMeetup>;

/**
 * Geplante Trainings, nächstes zuerst (meetup_feed):
 * board = Pinnwand einer Community, mine = selbst geplant oder zugesagt,
 * communities = geteilt in eine meiner Communities.
 */
export async function getMeetups(
  scope: Exclude<FeedScope, "single">,
  { groupId, from, to, limit = 50 }: { groupId?: string; from: Date; to?: Date; limit?: number },
) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("meetup_feed", {
    scope,
    gid: groupId,
    from_ts: from.toISOString(),
    to_ts: to?.toISOString(),
    max_rows: limit,
  });
  if (error) throw new Error("Trainings konnten nicht geladen werden.");
  return data.map(toMeetup);
}

/**
 * Ein geplantes Training mit Teilnehmern, den Communities, in denen ich es sehe (alle, wenn es
 * meins ist), und dem Chat, wenn ich dabei bin. null, wenn ich es nicht sehen darf.
 */
export async function getMeetup(meetupId: string) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.rpc("meetup_feed", {
    scope: "single",
    mid: meetupId,
    from_ts: "-infinity",
  });
  if (error) throw new Error("Das Training konnte nicht geladen werden.");
  const row = data[0];
  if (!row) return null;
  const meetup = toMeetup(row);

  const [people, shares, chat] = await Promise.all([
    supabase.rpc("meetup_participant_names", { mid: meetupId }),
    supabase.from("meetup_shares").select("group_id").eq("meetup_id", meetupId).limit(100),
    meetup.isJoined ? supabase.rpc("meetup_chat", { mid: meetupId }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (people.error || shares.error || chat.error) throw new Error("Das Training konnte nicht geladen werden.");

  return {
    ...meetup,
    participants: people.data.map((p) => ({ userId: p.user_id, name: p.display_name, isMe: p.user_id === userId })),
    sharedWith: shares.data.map((s) => s.group_id),
    messages: chat.data.map((m) => ({
      id: m.id,
      name: m.display_name,
      body: m.body,
      createdAt: m.created_at,
      isMe: m.user_id === userId,
    })),
  };
}

// ---------- Mitteilungen ----------

/** Die letzten eigenen Mitteilungen, neueste zuerst. */
export async function getNotifications(limit = 50) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, meetup_id, group_id, actor_name, title, count, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Mitteilungen konnten nicht geladen werden.");
  return data.map((n) => ({
    id: n.id,
    kind: toNotificationKind(n.kind),
    meetupId: n.meetup_id,
    groupId: n.group_id,
    actorName: n.actor_name,
    title: n.title,
    count: n.count,
    createdAt: n.created_at,
    isUnread: n.read_at === null,
  }));
}

/** Zahl der ungelesenen Mitteilungen für die Glocke. */
export async function getUnreadNotificationCount() {
  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export const NOTIFICATION_DEFAULTS = {
  newTrainingPrivate: true,
  newTrainingPublic: false,
  joined: true,
  message: true,
  cancelled: true,
};

/** Eigene Einstellungen für Mitteilungen. Ohne gespeicherte Zeile gelten die Voreinstellungen. */
export async function getNotificationPrefs() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("new_training_private, new_training_public, joined, message, cancelled")
    .maybeSingle();
  if (error) throw new Error("Einstellungen konnten nicht geladen werden.");
  if (!data) return NOTIFICATION_DEFAULTS;
  return {
    newTrainingPrivate: data.new_training_private,
    newTrainingPublic: data.new_training_public,
    joined: data.joined,
    message: data.message,
    cancelled: data.cancelled,
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
