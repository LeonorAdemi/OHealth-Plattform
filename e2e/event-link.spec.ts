import { expect, test } from "@playwright/test";

import { createCommunity, createMeetup, createUser, minutesFromNow, PASSWORD, sql, suffix, uniqueEmail } from "./support";

test("Event-Link: Wer sich über den Link registriert, ist danach zugesagt und in der Community", async ({ page }) => {
  const anna = await createUser("Anna");
  const community = await createCommunity(anna, { name: `Lauftreff ${suffix()}`, type: "community" });
  const meetup = await createMeetup(anna, {
    title: "Isarlauf",
    startsAt: minutesFromNow(2 * 24 * 60),
    shareWith: [community.id],
  });

  // Vorschau ohne Konto: Titel, Zahl der Zusagen, keine Namen
  await page.goto(`/e/${meetup.id}?quelle=e2e-test`);
  await expect(page.getByRole("heading", { name: "Isarlauf" })).toBeVisible();
  await expect(page.getByText("1 dabei")).toBeVisible();
  await expect(page.getByText("Anna")).toHaveCount(0);

  await page.getByRole("link", { name: "Konto erstellen und zusagen" }).click();
  await expect(page).toHaveURL(/\/registrieren\?/);
  const email = uniqueEmail();
  await page.getByLabel("Name", { exact: true }).fill("Dora");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: /Nutzungsbedingungen/ }).check();
  await page.getByRole("button", { name: "Konto erstellen" }).click();

  // Zurück auf dem Link sagt die App von selbst zu und zeigt das Training
  await expect(page).toHaveURL(new RegExp(`/plan/${meetup.id}\\?zugesagt=1$`));
  await expect(page.getByText("Zusage gespeichert.")).toBeVisible();
  await expect(page.getByRole("link", { name: "In den Kalender eintragen" })).toBeVisible();

  // Zugesagt, Mitglied der Community, über die das Event öffentlich ist, und Herkunft für die Kennzahlen
  const [dora] = await sql<{ joined: boolean; role: string | null; source: string | null; campaign: string | null }[]>`
    select exists (select 1 from public.meetup_participants p where p.meetup_id = ${meetup.id} and p.user_id = u.id) as joined,
           (select m.role from public.group_members m where m.group_id = ${community.id} and m.user_id = u.id) as role,
           s.source, s.campaign
    from auth.users u left join private.signup_sources s on s.user_id = u.id
    where u.email = ${email}`;
  expect(dora).toEqual({ joined: true, role: "member", source: "event_link", campaign: "e2e-test" });
});
