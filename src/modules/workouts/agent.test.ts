import { describe, expect, it } from "vitest";

import { describeBest, firstDayOfWindow, type AgentBest } from "./agent";

const base: AgentBest = {
  exerciseName: "x",
  muscleGroup: null,
  measure: "weight_reps",
  bestE1rmKg: null,
  maxWeightKg: null,
  maxReps: null,
  maxDurationSeconds: null,
  totalDistanceM: null,
};

describe("KI-Zugriff: Aufbereitung der Daten", () => {
  it("beginnt den Zeitraum am Montag der ältesten Woche, in deutscher Zeit", () => {
    // Sonntag, 27.09.2026, 23:30 Uhr deutscher Zeit
    const now = new Date("2026-09-27T21:30:00Z");
    expect(firstDayOfWindow(now, 1)).toBe("2026-09-21");
    expect(firstDayOfWindow(now, 4)).toBe("2026-08-31");
  });

  it("beschreibt Halteübungen mit der längsten Dauer", () => {
    expect(describeBest({ ...base, measure: "duration", maxDurationSeconds: 90 })).toBe("längste Dauer 1:30 min");
  });

  it("beschreibt Ausdauer mit der Gesamtstrecke", () => {
    expect(describeBest({ ...base, measure: "distance", totalDistanceM: 5200 })).toBe("insgesamt 5,2 km");
  });

  it("beschreibt Körpergewichtsübungen mit den meisten Wiederholungen", () => {
    expect(describeBest({ ...base, maxReps: 12 })).toBe("meiste Wiederholungen ohne Zusatzgewicht: 12");
  });
});
