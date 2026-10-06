import { expect, test } from "@playwright/test";

import { addMember, createCommunity, createUser, login, openLeaderboard, suffix, weekGrid } from "./support";

test("Aktivität eintragen: zählt sofort im Wochenraster und in der Rangliste der Gruppe", async ({ page }) => {
  const anna = await createUser("Anna");
  const ben = await createUser("Ben");
  const crew = await createCommunity(anna, { name: `Crew ${suffix()}`, type: "friends" });
  await addMember(crew.id, ben);

  await login(page, ben);
  await expect(weekGrid(page, 0)).toBeVisible();
  await page.goto("/aktivitaet/neu");

  await page.getByRole("button", { name: "Laufen", exact: true }).click();
  await page.getByLabel("Minuten").fill("45");
  await page.getByLabel("Distanz in km (optional)").fill("8,5");
  await page.getByRole("button", { name: "Aktivität speichern" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(weekGrid(page, 1)).toBeVisible();
  await expect(page.getByRole("region", { name: "Letzte Aktivitäten" })).toContainText("Laufen");

  const board = await openLeaderboard(page, crew.id);
  const row = board.getByRole("listitem").filter({ hasText: "Du" });
  await expect(row.getByRole("img", { name: "1 von 7 Tagen trainiert" })).toBeVisible();
  await expect(row).toHaveText(/1$/);
  // Anna hat nichts eingetragen und steht hinter Ben
  await expect(board.getByRole("listitem").first()).toContainText("Du");
  await expect(board.getByRole("listitem").nth(1)).toContainText("Anna");
});
