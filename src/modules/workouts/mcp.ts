// MCP-Server für KI-Assistenten: lesende Werkzeuge über die eigenen Trainingsdaten und
// schreibende nur für eigene Vorlagen (anlegen, neue Version). Die Datenbank erzwingt das
// zusätzlich (Migrationen agent_read_only und agent_write_templates): nur Eigenes, nichts
// löschen, nichts veröffentlichen, keine Workouts eintragen. Aufgerufen von src/app/api/mcp/route.ts.

import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  consistencyByWeek,
  describeBests,
  describeExerciseSearch,
  describeTemplate,
  describeTemplateList,
  describeWorkouts,
  firstDayOfWindow,
  toTemplatePayload,
  type AgentDataSource,
} from "./agent";

const INSTRUCTIONS = `OHealth ist eine App, in der die Person ihre Workouts loggt und Workout-Vorlagen pflegt (zum Beispiel "Oberkörper"). Du siehst nur ihre eigenen Daten: Profil, Workouts mit Sätzen, Trainingstage je Woche, Bestwerte je Übung und ihre Vorlagen. Daten anderer Personen gibt es hier nicht.

Lesen: Für Trainingstipps lies zuerst die Trainingstage und die Workouts der letzten Wochen, dann die Bestwerte. Achte auf Konstanz, Verteilung der Muskelgruppen, Fortschritt bei Gewicht und Wiederholungen sowie auf Erholung. Gib wenige, konkrete Vorschläge mit Begründung aus den Daten.

Schreiben: Du darfst eigene Vorlagen anlegen (create_template) und von einer bestehenden Vorlage eine neue Version erstellen (add_template_version). Jede Version bleibt erhalten, die Person kann in der App jederzeit zu einer älteren zurück. Du kannst nichts löschen, keine Vorlage veröffentlichen und keine Workouts eintragen. Übungen gibst du mit ihrer exercise_id an, die du über search_exercises findest. Zeig der Person deinen Vorschlag zuerst und speichere erst, wenn sie zustimmt. Schreib in die Notiz einer Version kurz, was sich geändert hat und warum.

Du ersetzt keine ärztliche oder physiotherapeutische Beratung. Erwähnt die Person Schmerzen oder eine Verletzung, empfiehl, das mit Fachleuten abzuklären, statt das Training dafür zu planen.`;

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// Schreibt, überschreibt aber nichts: Jede Speicherung ist eine neue Vorlage oder Version.
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

const exerciseInput = z.object({
  exercise_id: z.uuid().describe("ID der Übung aus search_exercises oder get_template"),
  sets: z.number().int().min(1).max(20).default(3).describe("Zahl der Sätze"),
  reps: z.number().int().min(1).max(999).optional().describe("Wiederholungen je Satz (Messart Wiederholungen und Gewicht)"),
  weight_kg: z.number().min(0).max(9999).optional().describe("Gewicht in kg, 0 = Körpergewicht"),
  duration_seconds: z.number().int().min(1).max(86400).optional().describe("Dauer je Satz in Sekunden (Messart Dauer)"),
  distance_m: z.number().positive().max(1_000_000).optional().describe("Strecke je Satz in Metern (Messart Strecke)"),
});
const exercisesInput = z.array(exerciseInput).min(1).max(30).describe("Übungen in der gewünschten Reihenfolge");

const failed = (message: string) => ({ isError: true, content: [{ type: "text" as const, text: message }] });

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

  server.registerTool(
    "list_templates",
    {
      title: "Vorlagen",
      description: "Eigene Workout-Vorlagen mit template_id, Sichtbarkeit, aktueller Version und Zahl der Übungen, zuletzt geänderte zuerst.",
      annotations: READ_ONLY,
    },
    async () => json({ vorlagen: describeTemplateList(await data.templates()) }),
  );

  server.registerTool(
    "get_template",
    {
      title: "Vorlage mit Übungen",
      description: "Eine eigene Vorlage mit allen Versionen und den Übungen der aktuellen Version, je mit exercise_id und Zielwerten.",
      inputSchema: z.object({ template_id: z.uuid().describe("ID aus list_templates") }),
      annotations: READ_ONLY,
    },
    async ({ template_id }) => {
      const template = await data.template(template_id);
      return template ? json(describeTemplate(template)) : failed("Diese Vorlage gibt es nicht. Hol die template_id mit list_templates.");
    },
  );

  server.registerTool(
    "search_exercises",
    {
      title: "Übung suchen",
      description: "Sucht Übungen im Katalog und unter den eigenen Übungen, auch mit englischen oder alternativen Namen. Liefert die exercise_id für Vorlagen.",
      inputSchema: z.object({ query: z.string().trim().min(1).max(60).describe("z. B. Bankdrücken, Squat oder Rücken") }),
      annotations: READ_ONLY,
    },
    async ({ query }) => json({ treffer: describeExerciseSearch(await data.exercises(), query) }),
  );

  server.registerTool(
    "create_template",
    {
      title: "Vorlage anlegen",
      description: "Legt eine neue, private Vorlage als Version 1 an. Veröffentlichen kann nur die Person selbst in der App. Vorher den Vorschlag zeigen und Zustimmung abwarten.",
      inputSchema: z.object({
        name: z.string().trim().min(1).max(60).describe("Name, z. B. Oberkörper"),
        note: z.string().trim().max(200).optional().describe("Kurz: Ziel oder Begründung der Vorlage"),
        exercises: exercisesInput,
      }),
      annotations: WRITE,
    },
    async ({ name, note, exercises }) => {
      try {
        const id = await data.saveTemplate({ templateId: null, name, note: note ?? "", exercises: toTemplatePayload(exercises) });
        const template = await data.template(id);
        return json({ gespeichert: true, ...(template ? describeTemplate(template) : { template_id: id }) });
      } catch (error) {
        return failed(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      }
    },
  );

  server.registerTool(
    "add_template_version",
    {
      title: "Neue Version einer Vorlage",
      description: "Speichert eine geänderte Fassung einer eigenen Vorlage als neue Version. Die bisherigen Versionen bleiben erhalten, die Sichtbarkeit bleibt unverändert. Gib immer die vollständige Übungsliste an, nicht nur die Änderungen. Vorher den Vorschlag zeigen und Zustimmung abwarten.",
      inputSchema: z.object({
        template_id: z.uuid().describe("ID aus list_templates"),
        note: z.string().trim().min(1).max(200).describe("Was sich geändert hat und warum"),
        name: z.string().trim().min(1).max(60).optional().describe("Neuer Name, sonst bleibt der bisherige"),
        exercises: exercisesInput,
      }),
      annotations: WRITE,
    },
    async ({ template_id, note, name, exercises }) => {
      const current = await data.template(template_id);
      if (!current) return failed("Diese Vorlage gibt es nicht. Hol die template_id mit list_templates.");
      try {
        await data.saveTemplate({
          templateId: template_id,
          name: name ?? current.name,
          note,
          exercises: toTemplatePayload(exercises),
        });
        const updated = await data.template(template_id);
        return json({ gespeichert: true, ...(updated ? describeTemplate(updated) : { template_id }) });
      } catch (error) {
        return failed(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
      }
    },
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
