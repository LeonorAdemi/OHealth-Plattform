import { createMcpHandler } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import type { AgentDataSource, AgentWorkout } from "./agent";
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
    expect(reply.result.instructions).toContain("nur Lesezugriff");
  });

  it("bietet genau vier Werkzeuge an, alle nur lesend", async () => {
    const reply = await rpc("tools/list");
    const tools = reply.result.tools as { name: string; annotations: { readOnlyHint: boolean } }[];
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_consistency",
      "get_personal_bests",
      "get_profile",
      "list_workouts",
    ]);
    expect(tools.every((t) => t.annotations.readOnlyHint)).toBe(true);
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

  it("bietet die Vorlage Trainingsanalyse mit optionalem Ziel an", async () => {
    const reply = await rpc("prompts/get", { name: "trainingsanalyse", arguments: { ziel: "Kraft aufbauen" } });
    expect(reply.result.messages[0].content.text).toContain("Mein Ziel: Kraft aufbauen");
  });
});
