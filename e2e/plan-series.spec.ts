import { expect, test } from "@playwright/test";

import { createCommunity, createUser, login, sql, suffix } from "./support";

test("Training planen: „Jede Woche wiederholen“ legt acht geteilte Termine an", async ({ page }) => {
  const anna = await createUser("Anna");
  const community = await createCommunity(anna, { name: `Lauftreff ${suffix()}`, type: "community" });

  await login(page, anna);
  await page.goto(`/plan/neu?community=${community.id}`);
  await expect(page.getByRole("heading", { name: "Training planen" })).toBeVisible();

  await page.getByRole("button", { name: "Laufen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Laufen", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Laufen hat Distanz und Tempo in min/km
  await page.getByLabel("Distanz in km").fill("8");
  await page.getByLabel("Tempo in min/km").fill("6:00");
  await page.getByRole("checkbox", { name: /Jede Woche wiederholen/ }).check();
  await page.getByLabel("Titel (optional)").fill("Lauftreff am Abend");
  await page.getByLabel("Treffpunkt (optional)").fill("Friedensengel");
  // Aus der Community heraus ist sie zum Teilen vorgewählt
  await expect(page.getByRole("checkbox", { name: community.name })).toBeChecked();
  await page.getByRole("button", { name: "Training planen" }).click();

  await expect(page).toHaveURL(/\/plan\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Lauftreff am Abend" })).toBeVisible();
  await expect(page.getByText(/^Jeden \S+, \d{2}:\d{2} Uhr$/)).toBeVisible();

  // Acht Termine in der Reihe, alle mit der Community geteilt, immer am selben Wochentag zur selben
  // Uhrzeit deutscher Zeit (auch über die Zeitumstellung)
  const id = new URL(page.url()).pathname.split("/").pop()!;
  const [series] = await sql<{ dates: number; shared: number; slots: number }[]>`
    select count(*)::int as dates,
           count(*) filter (where exists (
             select 1 from public.meetup_shares s where s.meetup_id = m.id and s.group_id = ${community.id}))::int as shared,
           count(distinct to_char(m.starts_at at time zone 'Europe/Berlin', 'ID HH24:MI'))::int as slots
    from public.meetups m
    where m.series_id = (select series_id from public.meetups where id = ${id})`;
  expect(series).toEqual({ dates: 8, shared: 8, slots: 1 });
});
