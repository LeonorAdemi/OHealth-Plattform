import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { toExerciseMeasure } from "@/lib/domain";
import type { AgentClient } from "@/lib/supabase/agent";
import { createAnonClient } from "@/lib/supabase/anon";
import { createClient } from "@/lib/supabase/server";

import { CHAT_NOTIFICATION_KINDS, communityKind, toNotificationKind } from "./logic";

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
    .select("id, display_name, avatar_url, bio, city, sports, is_private")
    .eq("id", userId)
    .single();

  if (error) throw new Error("Profil konnte nicht geladen werden.");
  return data;
}

/**
 * Profil einer anderen Person. Sichtbar nur mit gemeinsamer Freundesgruppe, Community oder
 * Coaching-Beziehung (Regel profiles_select), sonst null.
 */
export async function getPersonProfile(personId: string) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, city, sports, is_private")
    .eq("id", personId)
    .maybeSingle();

  if (error) throw new Error("Profil konnte nicht geladen werden.");
  return data ? { ...data, isMe: data.id === userId } : null;
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

// ---------- Chats ----------

function toChatKind(kind: string): "meetup" | "community" | "direct" {
  return kind === "community" || kind === "direct" ? kind : "meetup";
}

/** Eigene Chats, neueste Nachricht zuerst, mit Zahl der ungelesenen Nachrichten. */
export async function getMyChats(limit = 50) {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.rpc("my_chats", { max_rows: limit });
  if (error) throw new Error("Chats konnten nicht geladen werden.");
  return data.map((c) => ({
    id: c.chat_id,
    kind: toChatKind(c.kind),
    meetupId: c.meetup_id,
    groupId: c.group_id,
    otherUserId: c.other_user_id,
    otherAvatarUrl: c.other_avatar_url,
    request: c.request_state === "incoming" || c.request_state === "outgoing" ? c.request_state : null,
    title: c.title,
    startsAt: c.starts_at,
    last: c.last_at
      ? { body: c.last_body, name: c.last_display_name, isMe: c.last_user_id === userId, at: c.last_at }
      : null,
    unread: c.unread,
  }));
}

/**
 * Kurzfassung der eigenen Chats je Training und je Community: ID, letzte Nachricht, ungelesen.
 * Für die Chat-Zeilen auf Pinnwand und Community-Seite. Je Anfrage nur einmal geladen.
 */
export const getChatSummaries = cache(async () => {
  const chats = await getMyChats(200);
  const byMeetup: Record<string, ChatSummary> = {};
  const byGroup: Record<string, ChatSummary> = {};
  for (const c of chats) {
    const summary = {
      id: c.id,
      unread: c.unread,
      preview: c.last ? `${c.last.isMe ? "Du" : c.last.name}: ${c.last.body}` : null,
    };
    if (c.meetupId) byMeetup[c.meetupId] = summary;
    if (c.groupId) byGroup[c.groupId] = summary;
  }
  return { byMeetup, byGroup };
});

export type ChatSummary = { id: string; unread: number; preview: string | null };

/** Zahl der Chats mit ungelesenen Nachrichten (für den Tab). */
export async function getUnreadChatCount() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("unread_chat_count");
  return error ? 0 : (data ?? 0);
}

/** Ein Chat mit seinen Nachrichten. null, wenn es ihn nicht gibt oder ich keinen Zugang habe. */
export async function getChat(chatId: string) {
  const { supabase, userId } = await requireUser();
  const [chat, messages] = await Promise.all([
    supabase
      .from("chats")
      .select("id, kind, meetup_id, group_id, user_low, user_high, requested_by, accepted_at")
      .eq("id", chatId)
      .maybeSingle(),
    supabase.rpc("chat_messages_page", { cid: chatId }),
  ]);
  if (chat.error || messages.error) throw new Error("Der Chat konnte nicht geladen werden.");
  if (!chat.data) return null;
  return {
    id: chat.data.id,
    kind: toChatKind(chat.data.kind),
    meetupId: chat.data.meetup_id,
    groupId: chat.data.group_id,
    // Im Privatchat die andere Person
    otherUserId: chat.data.user_low === userId ? chat.data.user_high : chat.data.user_low,
    // Nachrichtenanfrage: an mich (incoming) oder von mir, noch nicht angenommen (outgoing)
    request:
      chat.data.kind === "direct" && !chat.data.accepted_at
        ? chat.data.requested_by === userId
          ? ("outgoing" as const)
          : ("incoming" as const)
        : null,
    messages: messages.data.map((m) => ({
      id: m.id,
      userId: m.user_id,
      name: m.display_name,
      body: m.body,
      createdAt: m.created_at,
      isMe: m.user_id === userId,
    })),
  };
}

// ---------- Folgen ----------

export type FollowList = "followers" | "following" | "requests";

/** Eigene Follower, Gefolgte oder offene Anfragen an mich. */
export async function getMyFollows(list: FollowList) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("my_follows", { list });
  if (error) throw new Error("Die Liste konnte nicht geladen werden.");
  return data.map((f) => ({
    userId: f.user_id,
    name: f.display_name,
    avatarUrl: f.avatar_url,
    since: f.since,
    followsBack: f.follows_back,
  }));
}

/** Zahl der offenen Folgen-Anfragen an mich. */
export async function getFollowRequestCount() {
  const { supabase, userId } = await requireUser();
  const { count, error } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followee_id", userId)
    .eq("status", "pending");
  return error ? 0 : (count ?? 0);
}

export type FollowState = {
  /** Folge ich der Person? */
  following: "none" | "pending" | "accepted";
  /** Folgt die Person mir (bestätigt)? */
  followsMe: boolean;
  /** Hat sie angefragt, mir zu folgen? */
  requestedMe: boolean;
  blocked: boolean;
};

/** Wie ich zu einer Person stehe. */
export async function getFollowState(personId: string): Promise<FollowState> {
  const { supabase, userId } = await requireUser();
  const [follows, block] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id, status")
      .or(`and(follower_id.eq.${userId},followee_id.eq.${personId}),and(follower_id.eq.${personId},followee_id.eq.${userId})`)
      .limit(2),
    supabase.from("blocks").select("blocked_id").eq("blocked_id", personId).maybeSingle(),
  ]);
  if (follows.error || block.error) throw new Error("Folgen konnte nicht geladen werden.");
  const mine = follows.data.find((f) => f.follower_id === userId);
  const theirs = follows.data.find((f) => f.follower_id === personId);
  return {
    following: mine ? (mine.status === "accepted" ? "accepted" : "pending") : "none",
    followsMe: theirs?.status === "accepted",
    requestedMe: theirs?.status === "pending",
    blocked: Boolean(block.data),
  };
}

const profileStatsSchema = z.object({
  followers: z.number(),
  following: z.number(),
  can_see: z.boolean(),
  days: z.array(z.string()).optional(),
  bests: z
    .array(z.object({ exercise: z.string(), e1rm: z.number(), max_weight: z.number().nullable() }))
    .optional(),
  events: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        starts_at: z.string(),
        place: z.string().nullable(),
        visible: z.boolean(),
        invite_code: z.string().nullable(),
      }),
    )
    .optional(),
  communities: z
    .array(z.object({ id: z.string(), name: z.string(), invite_code: z.string(), is_member: z.boolean() }))
    .optional(),
});

/** Kacheln eines Profils. Ohne Recht auf die Inhalte nur Follower- und Folgt-Zahl. */
export async function getProfileStats(personId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("profile_stats", { target: personId });
  if (error) throw new Error("Das Profil konnte nicht geladen werden.");
  const parsed = profileStatsSchema.safeParse(data);
  if (!parsed.success) return null;
  const p = parsed.data;
  return {
    followers: p.followers,
    following: p.following,
    canSee: p.can_see,
    days: p.days ?? [],
    bests: (p.bests ?? []).map((b) => ({ exercise: b.exercise, e1rm: b.e1rm, maxWeight: b.max_weight })),
    events: (p.events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.starts_at,
      place: e.place,
      href: e.visible ? `/plan/${e.id}` : e.invite_code ? `/beitreten/${e.invite_code}` : null,
    })),
    communities: (p.communities ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      href: c.is_member ? `/community/${c.id}` : `/beitreten/${c.invite_code}`,
    })),
  };
}

/** Menschen finden: mit Suchbegriff nach Namen, sonst Vorschläge aus den eigenen Communities. */
export async function searchPeople(search: string, limit = 20) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("people_search", { search: search || undefined, max_rows: limit });
  if (error) throw new Error("Die Suche hat nicht geklappt.");
  return data.map((p) => ({
    userId: p.user_id,
    name: p.display_name,
    avatarUrl: p.avatar_url,
    isPrivate: p.is_private,
    city: p.city,
    sports: p.sports,
    following: p.follow_status === "accepted" ? ("accepted" as const) : p.follow_status === "pending" ? ("pending" as const) : ("none" as const),
    followsMe: p.follows_me,
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
 * meins ist), und der ID seines Chats, wenn ich dabei bin. null, wenn ich es nicht sehen darf.
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

  const [people, shares, chatRow] = await Promise.all([
    supabase.rpc("meetup_participant_names", { mid: meetupId }),
    supabase.from("meetup_shares").select("group_id").eq("meetup_id", meetupId).limit(100),
    // Den Chat gibt es, sobald jemand außer der planenden Person zusagt; sehen nur, wer dabei ist (RLS).
    meetup.isJoined
      ? supabase.from("chats").select("id").eq("meetup_id", meetupId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (people.error || shares.error || chatRow.error) throw new Error("Das Training konnte nicht geladen werden.");
  const chatId = chatRow.data?.id ?? null;

  return {
    ...meetup,
    participants: people.data.map((p) => ({ userId: p.user_id, name: p.display_name, isMe: p.user_id === userId })),
    sharedWith: shares.data.map((s) => s.group_id),
    chatId,
  };
}

// ---------- Mitteilungen ----------

/** Die letzten eigenen Mitteilungen, neueste zuerst. */
export async function getNotifications(limit = 50) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, meetup_id, group_id, actor_id, actor_name, title, count, created_at, read_at")
    // Chat-Nachrichten zählt der Tab „Chats“; als Mitteilung dienen sie nur noch dem Push.
    .not("kind", "in", `(${CHAT_NOTIFICATION_KINDS.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Mitteilungen konnten nicht geladen werden.");
  return data.map((n) => ({
    id: n.id,
    kind: toNotificationKind(n.kind),
    meetupId: n.meetup_id,
    groupId: n.group_id,
    actorId: n.actor_id,
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
    .not("kind", "in", `(${CHAT_NOTIFICATION_KINDS.join(",")})`)
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
  reminder: true,
  communityMessage: false,
  friends: true,
  directMessage: true,
};

/** Eigene Einstellungen für Mitteilungen. Ohne gespeicherte Zeile gelten die Voreinstellungen. */
export async function getNotificationPrefs() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("new_training_private, new_training_public, joined, message, cancelled, reminder, community_message, friends, direct_message")
    .maybeSingle();
  if (error) throw new Error("Einstellungen konnten nicht geladen werden.");
  if (!data) return NOTIFICATION_DEFAULTS;
  return {
    newTrainingPrivate: data.new_training_private,
    newTrainingPublic: data.new_training_public,
    joined: data.joined,
    message: data.message,
    cancelled: data.cancelled,
    reminder: data.reminder,
    communityMessage: data.community_message,
    friends: data.friends,
    directMessage: data.direct_message,
  };
}

// ---------- Push ----------
// Ohne Sitzung: Die Datenbank prüft das gemeinsame Geheimnis (push_payload, push_forget).

const pushPayloadSchema = z.object({
  kind: z.string(),
  actor_name: z.string(),
  title: z.string(),
  count: z.number(),
  meetup_id: z.string().nullable(),
  chat_id: z.string().nullable().optional(),
  actor_id: z.string().nullable().optional(),
  latest: z.string().nullable(),
  vapid_public_key: z.string().nullable(),
  vapid_private_key: z.string().nullable(),
  subscriptions: z.array(z.object({ endpoint: z.string(), p256dh: z.string(), auth: z.string() })),
});

/**
 * Inhalt, Geräte-Abos und Schlüssel einer Mitteilung. "denied" bei falschem Geheimnis,
 * null, wenn es nichts (mehr) zu senden gibt.
 */
export async function getPushPayload(notificationId: string, secret: string) {
  const { data, error } = await createAnonClient().rpc("push_payload", { nid: notificationId, secret });
  if (error?.code === "42501") return "denied" as const;
  if (error) throw new Error("Push-Inhalt konnte nicht geladen werden.");
  if (!data) return null;
  const parsed = pushPayloadSchema.safeParse(data);
  if (!parsed.success) return null;
  const p = parsed.data;
  return {
    kind: toNotificationKind(p.kind),
    actorName: p.actor_name,
    title: p.title,
    count: p.count,
    meetupId: p.meetup_id,
    chatId: p.chat_id ?? null,
    actorId: p.actor_id ?? null,
    latest: p.latest,
    vapid: p.vapid_public_key && p.vapid_private_key ? { publicKey: p.vapid_public_key, privateKey: p.vapid_private_key } : null,
    subscriptions: p.subscriptions,
  };
}

/** Entfernt ein Abo, das der Push-Dienst nicht mehr kennt. */
export async function forgetPushSubscription(endpoint: string, secret: string) {
  await createAnonClient().rpc("push_forget", { endpoint, secret });
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
