import { defineConfig, devices } from "@playwright/test";

// Ende-zu-Ende-Tests der Kernabläufe gegen die lokale Supabase (supabase start), je bei 390 und
// 1280 px. Ablauf und Umgebungsvariablen: e2e/README.md.

const PORT = 3100;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  // Testkonten vorher (nach einem abgebrochenen Lauf) und nachher entfernen
  globalSetup: "./e2e/cleanup.ts",
  globalTeardown: "./e2e/cleanup.ts",
  fullyParallel: true,
  forbidOnly: CI,
  // Keine Wiederholung: Ein roter Test ist ein Fehler, kein Zufall.
  retries: 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "390", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // In der CI läuft der fertige Build, lokal reicht der Entwicklungsserver.
    command: CI ? `npm run start -- --port ${PORT}` : `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
