// MCP-Server für KI-Assistenten: nur lesende Werkzeuge über die eigenen Trainingsdaten.
// Die Datenbank erzwingt zusätzlich, dass ein KI-Token nur Eigenes lesen kann
// (Migration agent_read_only). Aufgerufen von src/app/api/mcp/route.ts.

import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  consistencyByWeek,
  describeBests,
  describeWorkouts,
  firstDayOfWindow,
  type AgentDataSource,
} from "./agent";

const INSTRUCTIONS = `OHealth ist eine App, in der die Person ihre Workouts loggt. Du hast nur Lesezugriff auf ihre eigenen Daten: Profil, Workouts mit Sätzen, Trainingstage je Woche und Bestwerte je Übung. Daten anderer Personen gibt es hier nicht.

Für Trainingstipps: Lies zuerst die Trainingstage und die Workouts der letzten Wochen, dann die Bestwerte. Achte auf Konstanz, Verteilung der Muskelgruppen, Fortschritt bei Gewicht und Wiederholungen sowie auf Erholung. Gib wenige, konkrete Vorschläge mit Begründung aus den Daten.

Du ersetzt keine ärztliche oder physiotherapeutische Beratung. Erwähnt die Person Schmerzen oder eine Verletzung, empfiehl, das mit Fachleuten abzuklären, statt das Training dafür zu planen.`;

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export function createTrainingMcpServer(data: AgentDataSource, now: () => Date = () => new Date()) {
  const server = new McpServer({ name: "ohealth", version: "1.0.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "get_profile",
    {
      title: "Profil und Überblick",
      description:
        "Name, Mitglied seit, Zahl aller Workouts und Trainingstage der letzten vier Wochen. Guter erster Schritt.",
      annotations: READ_ONLY,
    },
    async () => {
      const [profile, count, days] = await Promise.all([
        data.profile(),
        data.workoutCount(),
        data.trainingDaysSince(firstDayOfWindow(now(), 4)),
      ]);
      return json({
        name: profile?.displayName ?? null,
        mitgliedSeit: profile?.memberSince.slice(0, 10) ?? null,
        workoutsInsgesamt: count,
        trainingstageLetzteVierWochen: consistencyByWeek(days, now(), 4),
      });
    },
  );

  server.registerTool(
    "list_workouts",
    {
      title: "Workouts",
      description:
        "Eigene Workouts der letzten Wochen mit allen Sätzen je Übung, neueste zuerst. Gewichte in kg, Dauer in Sekunden oder Minuten, Strecken in m oder km.",
      inputSchema: z.object({
        weeks: z.number().int().min(1).max(26).default(4).describe("Zeitraum in Wochen, einschließlich der laufenden"),
      }),
      annotations: READ_ONLY,
    },
    async ({ weeks }) => {
      const from = firstDayOfWindow(now(), weeks);
      // Einen Tag Puffer, weil die Grenze in deutscher Zeit gilt. describeWorkouts filtert genau.
      const since = new Date(Date.parse(`${from}T00:00:00Z`) - 24 * 60 * 60 * 1000);
      const workouts = await data.workoutsSince(since, 200);
      return json({ zeitraumAb: from, workouts: describeWorkouts(workouts, from) });
    },
  );

  server.registerTool(
    "get_consistency",
    {
      title: "Trainingstage je Woche",
      description:
        "Anzahl der Tage mit mindestens einem Workout je Kalenderwoche (Montag bis Sonntag, deutsche Zeit), neueste Woche zuerst.",
      inputSchema: z.object({
        weeks: z.number().int().min(1).max(52).default(12).describe("Anzahl der Wochen"),
      }),
      annotations: READ_ONLY,
    },
    async ({ weeks }) => {
      const days = await data.trainingDaysSince(firstDayOfWindow(now(), weeks));
      return json({ wochen: consistencyByWeek(days, now(), weeks) });
    },
  );

  server.registerTool(
    "get_personal_bests",
    {
      title: "Bestwerte je Übung",
      description:
        "Bestwert jeder geloggten Übung: bei Kraft das geschätzte Maximum für eine Wiederholung, bei Körpergewicht die meisten Wiederholungen, bei Halteübungen die längste Dauer, bei Ausdauer die Gesamtstrecke.",
      annotations: READ_ONLY,
    },
    async () => json({ bestwerte: describeBests(await data.bests()) }),
  );

  server.registerPrompt(
    "trainingsanalyse",
    {
      title: "Trainingsanalyse",
      description: "Wertet die Trainingsdaten aus und gibt konkrete Tipps für die nächsten Wochen.",
      argsSchema: z.object({
        ziel: z.string().max(200).optional().describe("Optional: dein Ziel, z. B. Kraft aufbauen"),
      }),
    },
    ({ ziel }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "Analysiere mein Training in OHealth und gib mir Tipps für die nächsten vier Wochen.",
              ziel ? `Mein Ziel: ${ziel}` : "",
              "Nutze get_profile, get_consistency, list_workouts mit 8 Wochen und get_personal_bests.",
              "Gliedere die Antwort in: was gut läuft, was auffällt, drei konkrete nächste Schritte.",
              "Begründe jeden Punkt mit Zahlen aus meinen Daten.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
      ],
    }),
  );

  return server;
}
