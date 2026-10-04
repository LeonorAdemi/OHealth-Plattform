import { createMcpHandler } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import type { AgentDataSource, AgentTemplate, AgentTemplateInput, AgentWorkout } from "./agent";
import { createTrainingMcpServer } from "./mcp";

// Montag, 28.09.2026, 10 Uhr deutscher Zeit
const NOW = new Date("2026-09-28T08:00:00Z");

const bench = { exerciseId: "e1", exerciseName: "Bankdrücken", measure: "weight_reps" as const, muscleGroup: "Brust" };
const workouts: AgentWorkout[] = [
  {
    performedAt: "2026-09-26T16:00:00Z",
    title: "Push",
    sets: [
      { ...bench, reps: 5, weightKg: 80, durationSeconds: null, distanceM: null },
      { ...bench, reps: 5, weightKg: 82.5, durationSeconds: null, distanceM: null },
    ],
  },
  {
    performedAt: "2026-07-01T16:00:00Z",
    title: "Alt",
    sets: [{ ...bench, reps: 3, weightKg: 70, durationSeconds: null, distanceM: null }],
  },
];

const BENCH_ID = "11111111-1111-4111-8111-111111111111";
const ROW_ID = "22222222-2222-4222-8222-222222222222";
const TEMPLATE_ID = "33333333-3333-4333-8333-333333333333";

// Vorlagen im Speicher: jede Speicherung hängt eine Version an, wie save_template.
let saved: AgentTemplateInput[] = [];
let templates: AgentTemplate[] = [];
function resetTemplates() {
  saved = [];
  templates = [
    {
      id: TEMPLATE_ID,
      name: "Oberkörper",
      visibility: "public",
      versions: [{ number: 1, note: null, source: "app", createdAt: "2026-09-20T10:00:00Z" }],
      exercises: [
        {
          exerciseId: BENCH_ID,
          exerciseName: "Bankdrücken",
          measure: "weight_reps",
          targetSets: 4,
          targetReps: 8,
          targetWeightKg: 60,
          targetDurationSeconds: null,
          targetDistanceM: null,
        },
      ],
    },
  ];
}
resetTemplates();

const data: AgentDataSource = {
  profile: async () => ({ displayName: "Anna", memberSince: "2026-09-01T10:00:00Z" }),
  workoutCount: async () => 2,
  workoutsSince: async (since) => workouts.filter((w) => w.performedAt >= since.toISOString()),
  trainingDaysSince: async (day) => ["2026-09-26", "2026-09-22", "2026-07-01"].filter((d) => d >= day),
  bests: async () => [
    {
      exerciseName: "Bankdrücken",
      muscleGroup: "Brust",
      measure: "weight_reps",
      bestE1rmKg: 96.3,
      maxWeightKg: 82.5,
      maxReps: 5,
      maxDurationSeconds: null,
      totalDistanceM: null,
    },
  ],
  templates: async () =>
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      visibility: t.visibility,
      updatedAt: t.versions[0].createdAt,
      versionNumber: t.versions[0].number,
      exerciseCount: t.exercises.length,
    })),
  template: async (id) => templates.find((t) => t.id === id) ?? null,
  exercises: async () => [
    { id: BENCH_ID, name: "Bankdrücken", muscleGroup: "Brust", measure: "weight_reps", aliases: ["Bench Press"] },
    { id: ROW_ID, name: "Langhantelrudern", muscleGroup: "Rücken", measure: "weight_reps", aliases: ["Barbell Row"] },
  ],
  saveTemplate: async (input) => {
    if (input.exercises.some((e) => ![BENCH_ID, ROW_ID].includes(e.exercise_id))) {
      throw new Error("Eine der Übungen gibt es nicht. Hol die exercise_id mit search_exercises.");
    }
    saved.push(input);
    const existing = templates.find((t) => t.id === input.templateId);
    const version = { number: (existing?.versions[0].number ?? 0) + 1, note: input.note || null, source: "ai", createdAt: "2026-09-28T08:00:00Z" };
    const exercises = input.exercises.map((e) => ({
      exerciseId: e.exercise_id,
      exerciseName: e.exercise_id === BENCH_ID ? "Bankdrücken" : "Langhantelrudern",
      measure: "weight_reps" as const,
      targetSets: e.target_sets,
      targetReps: e.target_reps ?? null,
      targetWeightKg: e.target_weight_kg ?? null,
      targetDurationSeconds: null,
      targetDistanceM: null,
    }));
    if (existing) {
      existing.name = input.name;
      existing.versions.unshift(version);
      existing.exercises = exercises;
      return existing.id;
    }
    const id = "44444444-4444-4444-8444-444444444444";
    templates.push({ id, name: input.name, visibility: "private", versions: [version], exercises });
    return id;
  },
};

const handler = createMcpHandler(() => createTrainingMcpServer(data, () => NOW));

async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await handler.fetch(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Protocol-Version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  const text = await response.text();
  const payload = text.startsWith("{") ? text : (text.match(/^data: (.*)$/m)?.[1] ?? "{}");
  return JSON.parse(payload);
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const reply = await rpc("tools/call", { name, arguments: args });
  return JSON.parse(reply.result.content[0].text);
}

describe("KI-Zugriff: MCP-Server", () => {
  it("meldet sich als OHealth mit Hinweisen für die KI", async () => {
    const reply = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(reply.result.serverInfo.name).toBe("ohealth");
    expect(reply.result.instructions).toContain("Du kannst nichts löschen, keine Vorlage veröffentlichen und keine Workouts eintragen");
    expect(reply.result.instructions).toContain("speichere erst, wenn sie zustimmt");
  });

  it("bietet lesende Werkzeuge und genau zwei schreibende für Vorlagen an, keines löscht", async () => {
    const reply = await rpc("tools/list");
    const tools = reply.result.tools as {
      name: string;
      annotations: { readOnlyHint: boolean; destructiveHint: boolean };
    }[];
    expect(tools.filter((t) => t.annotations.readOnlyHint).map((t) => t.name).sort()).toEqual([
      "get_consistency",
      "get_personal_bests",
      "get_profile",
      "get_template",
      "list_templates",
      "list_workouts",
      "search_exercises",
    ]);
    expect(tools.filter((t) => !t.annotations.readOnlyHint).map((t) => t.name).sort()).toEqual([
      "add_template_version",
      "create_template",
    ]);
    expect(tools.some((t) => t.annotations.destructiveHint)).toBe(false);
  });

  it("liefert Workouts nur aus dem gewählten Zeitraum, mit Sätzen in deutscher Schreibweise", async () => {
    const result = await callTool("list_workouts", { weeks: 2 });
    expect(result.zeitraumAb).toBe("2026-09-21");
    expect(result.workouts).toHaveLength(1);
    expect(result.workouts[0].uebungen[0]).toEqual({
      name: "Bankdrücken",
      muskelgruppe: "Brust",
      saetze: ["5 × 80 kg", "5 × 82,5 kg"],
    });
  });

  it("zählt Trainingstage je Kalenderwoche, neueste zuerst", async () => {
    const result = await callTool("get_consistency", { weeks: 2 });
    expect(result.wochen).toEqual([
      { kalenderwoche: 40, ab: "2026-09-28", trainingstage: 0, laufendeWoche: true },
      { kalenderwoche: 39, ab: "2026-09-21", trainingstage: 2, laufendeWoche: false },
    ]);
  });

  it("beschreibt Bestwerte nach denselben Regeln wie die Rangliste", async () => {
    const result = await callTool("get_personal_bests");
    expect(result.bestwerte[0].bestwert).toBe(
      "geschätztes Maximum für eine Wiederholung 96,3 kg, schwerster Satz 82,5 kg",
    );
  });

  it("weist einen zu großen Zeitraum zurück", async () => {
    const reply = await rpc("tools/call", { name: "list_workouts", arguments: { weeks: 500 } });
    const failed = reply.error !== undefined || reply.result?.isError === true;
    expect(failed).toBe(true);
  });

  it("findet Übungen auch über englische Namen und liefert ihre ID", async () => {
    const result = await callTool("search_exercises", { query: "bench" });
    expect(result.treffer).toEqual([
      { exercise_id: BENCH_ID, name: "Bankdrücken", muskelgruppe: "Brust", messart: "Wiederholungen und Gewicht" },
    ]);
  });

  it("listet Vorlagen und zeigt eine Vorlage mit Zielwerten", async () => {
    resetTemplates();
    const list = await callTool("list_templates");
    expect(list.vorlagen[0]).toMatchObject({ template_id: TEMPLATE_ID, name: "Oberkörper", sichtbarkeit: "öffentlich", aktuelleVersion: 1 });
    const detail = await callTool("get_template", { template_id: TEMPLATE_ID });
    expect(detail.uebungen[0]).toMatchObject({ exercise_id: BENCH_ID, ziel: "4 × 8 · 60 kg", sets: 4, reps: 8 });
  });

  it("legt eine Vorlage an und übersetzt die Übungen für die Datenbank", async () => {
    resetTemplates();
    const result = await callTool("create_template", {
      name: "Unterkörper",
      note: "Für Kraft",
      exercises: [{ exercise_id: ROW_ID, sets: 4, reps: 6, weight_kg: 70 }, { exercise_id: BENCH_ID }],
    });
    expect(saved).toEqual([
      {
        templateId: null,
        name: "Unterkörper",
        note: "Für Kraft",
        exercises: [
          { exercise_id: ROW_ID, target_sets: 4, target_reps: 6, target_weight_kg: 70 },
          { exercise_id: BENCH_ID, target_sets: 3 },
        ],
      },
    ]);
    expect(result).toMatchObject({ gespeichert: true, name: "Unterkörper", sichtbarkeit: "privat", aktuelleVersion: 1 });
  });

  it("speichert eine neue Version mit dem bisherigen Namen, wenn keiner angegeben ist", async () => {
    resetTemplates();
    const result = await callTool("add_template_version", {
      template_id: TEMPLATE_ID,
      note: "Rudern ergänzt für mehr Rücken",
      exercises: [{ exercise_id: BENCH_ID, sets: 4, reps: 8 }, { exercise_id: ROW_ID, sets: 3, reps: 10 }],
    });
    expect(saved[0]).toMatchObject({ templateId: TEMPLATE_ID, name: "Oberkörper", note: "Rudern ergänzt für mehr Rücken" });
    expect(result.aktuelleVersion).toBe(2);
    expect(result.versionen.map((v: { version: number; von: string }) => [v.version, v.von])).toEqual([
      [2, "KI"],
      [1, "App"],
    ]);
  });

  it("verlangt bei einer neuen Version eine Notiz", async () => {
    resetTemplates();
    const reply = await rpc("tools/call", {
      name: "add_template_version",
      arguments: { template_id: TEMPLATE_ID, exercises: [{ exercise_id: BENCH_ID }] },
    });
    expect(reply.error !== undefined || reply.result?.isError === true).toBe(true);
    expect(saved).toEqual([]);
  });

  it("meldet unbekannte Vorlagen und Übungen verständlich, statt etwas zu speichern", async () => {
    resetTemplates();
    const unknownTemplate = await rpc("tools/call", {
      name: "add_template_version",
      arguments: { template_id: "55555555-5555-4555-8555-555555555555", note: "x", exercises: [{ exercise_id: BENCH_ID }] },
    });
    expect(unknownTemplate.result.isError).toBe(true);
    expect(unknownTemplate.result.content[0].text).toContain("list_templates");

    const unknownExercise = await rpc("tools/call", {
      name: "create_template",
      arguments: { name: "X", exercises: [{ exercise_id: "66666666-6666-4666-8666-666666666666" }] },
    });
    expect(unknownExercise.result.isError).toBe(true);
    expect(unknownExercise.result.content[0].text).toContain("search_exercises");
    expect(saved).toEqual([]);
  });

  it("bietet die Vorlage Trainingsanalyse mit optionalem Ziel an", async () => {
    const reply = await rpc("prompts/get", { name: "trainingsanalyse", arguments: { ziel: "Kraft aufbauen" } });
    expect(reply.result.messages[0].content.text).toContain("Mein Ziel: Kraft aufbauen");
  });
});
