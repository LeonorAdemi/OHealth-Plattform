import { expect, test } from "@playwright/test";

import {
  addMember,
  createCommunity,
  createMeetup,
  createUser,
  joinMeetup,
  login,
  minutesFromNow,
  moveMeetup,
  openLeaderboard,
  suffix,
  weekGrid,
} from "./support";

test("„Warst du dabei?“: Ja macht das Training zum Trainingstag in Wochenraster und Rangliste", async ({ page }) => {
  const anna = await createUser("Anna");
  const ben = await createUser("Ben");
  const crew = await createCommunity(anna, { name: `Crew ${suffix()}`, type: "friends" });
  await addMember(crew.id, ben);
  // Zusagen geht nur vor dem Beginn: erst zusagen, dann in die Vergangenheit verschieben. Eine
  // Minute Dauer, damit das Training gerade vorbei ist und in die laufende Woche fällt.
  const meetup = await createMeetup(anna, {
    title: "Morgenlauf",
    startsAt: minutesFromNow(60),
    durationMinutes: 1,
    shareWith: [crew.id],
  });
  await joinMeetup(meetup.id, ben);
  await moveMeetup(meetup.id, minutesFromNow(-5));

  await login(page, ben);
  const question = page.getByRole("region", { name: "Warst du dabei?" });
  await expect(question).toBeVisible();
  await expect(weekGrid(page, 0)).toBeVisible();

  await question.getByRole("button", { name: "Ja, war dabei: Morgenlauf" }).click();

  await expect(page.getByText("Gespeichert. Das Training zählt als Trainingstag.")).toBeVisible();
  await expect(question).toHaveCount(0);
  await expect(weekGrid(page, 1)).toBeVisible();
  await expect(page.getByRole("region", { name: "Letzte Aktivitäten" })).toContainText("Morgenlauf");

  const board = await openLeaderboard(page, crew.id);
  const row = board.getByRole("listitem").filter({ hasText: "Du" });
  await expect(row.getByRole("img", { name: "1 von 7 Tagen trainiert" })).toBeVisible();
  await expect(row).toHaveText(/1$/);
});
