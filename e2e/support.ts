import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

import { TERMS_VERSION } from "@/lib/legal";

// Testdaten für die Ende-zu-Ende-Tests. Jeder Test legt seine Personen, Communities und Events
// selbst an, mit eindeutigen Adressen, damit Tests unabhängig voneinander und parallel laufen.
// Konten entstehen über die Admin-API von Supabase Auth, alles Weitere wie in den Datenbanktests
// direkt per SQL. Beides nur gegen die lokale Supabase (supabase start), nie gegen ein echtes Projekt.

const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const dbUrl = process.env.DB_URL ?? "";

function local(url: string, name: string) {
  if (!url) throw new Error(`${name} fehlt (siehe e2e/README.md).`);
  // Previews und Produktion teilen sich eine Datenbank: Testdaten nur in der lokalen.
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error(`Ende-zu-Ende-Tests laufen nur gegen die lokale Supabase, nicht gegen ${name}=${url}.`);
  }
  return url;
}

if (!secretKey) throw new Error("SUPABASE_SECRET_KEY fehlt (siehe e2e/README.md).");
const auth = createClient(local(apiUrl, "NEXT_PUBLIC_SUPABASE_URL"), secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}).auth.admin;

/** Verbindung zur lokalen Datenbank als Betreiber, wie in den Datenbanktests. */
export const connectDb = () => postgres(local(dbUrl, "DB_URL"), { max: 2, onnotice: () => {} });
export const sql = connectDb();

export const PASSWORD = "e2e-Passwort-2026";

export type TestUser = { id: string; email: string; name: string };

export const uniqueEmail = () => `e2e-${crypto.randomUUID()}@example.com`;
/** Alle Adressen aus uniqueEmail, für das Aufräumen (cleanup.ts) */
export const E2E_EMAIL_PATTERN = "e2e-%@example.com";

/** Kurzes, eindeutiges Anhängsel für Namen, die eindeutig sein sollen (Communities). */
export const suffix = () => crypto.randomUUID().slice(0, 6);

export const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000);

/** Konto mit bestätigter E-Mail und Zustimmung zu den Nutzungsbedingungen. */
export async function createUser(name: string): Promise<TestUser> {
  const email = uniqueEmail();
  const { data, error } = await auth.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name, terms_version: TERMS_VERSION },
  });
  if (error || !data.user) throw new Error(`Konto anlegen: ${error?.message ?? "kein Konto"}`);
  return { id: data.user.id, email, name };
}

/** Community anlegen; wer sie anlegt, verwaltet sie. „community“ ist öffentlich, „friends“ privat. */
export async function createCommunity(owner: TestUser, { name, type }: { name: string; type: "community" | "friends" }) {
  const [group] = await sql<{ id: string; name: string }[]>`
    insert into public.groups (name, type, created_by) values (${name}, ${type}, ${owner.id})
    returning id, name`;
  return group;
}

export async function addMember(groupId: string, user: TestUser) {
  await sql`insert into public.group_members (group_id, user_id) values (${groupId}, ${user.id})`;
}

/** Event in der Zukunft, geteilt mit den Communities. Wer plant, sagt automatisch zu. */
export async function createMeetup(
  owner: TestUser,
  {
    title,
    startsAt,
    durationMinutes = 60,
    shareWith,
  }: { title: string; startsAt: Date; durationMinutes?: number; shareWith: readonly string[] },
) {
  const [meetup] = await sql<{ id: string }[]>`
    insert into public.meetups (created_by, title, starts_at, sport_id, duration_minutes, place)
    values (${owner.id}, ${title}, ${startsAt}, 'laufen', ${durationMinutes}, 'Friedensengel')
    returning id`;
  for (const groupId of shareWith) {
    await sql`insert into public.meetup_shares (meetup_id, group_id) values (${meetup.id}, ${groupId})`;
  }
  return meetup;
}

export async function joinMeetup(meetupId: string, user: TestUser) {
  await sql`insert into public.meetup_participants (meetup_id, user_id) values (${meetupId}, ${user.id})`;
}

/** Verschiebt ein Event, etwa in die Vergangenheit, nachdem alle zugesagt haben. */
export async function moveMeetup(meetupId: string, startsAt: Date) {
  await sql`update public.meetups set starts_at = ${startsAt} where id = ${meetupId}`;
}

/** Anmelden über das Formular; danach ist „Heute“ offen. */
export async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Wochenraster mit der Zahl der Trainingstage (aria-label des Rasters). */
export const weekGrid = (page: Page, days: number) => page.getByRole("img", { name: `${days} von 7 Tagen trainiert` });

/** Rangliste der Trainingstage einer Community, geöffnet über ihren Bereich „Rangliste“. */
export async function openLeaderboard(page: Page, groupId: string) {
  await page.goto(`/community/${groupId}`);
  await page.getByRole("navigation", { name: "Bereiche der Community" }).getByRole("link", { name: "Rangliste" }).click();
  const board = page.getByRole("region", { name: /Trainingstage in Woche/ });
  await expect(board).toBeVisible();
  return board;
}
