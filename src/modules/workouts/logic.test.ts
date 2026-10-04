import { describe, expect, it } from "vitest";

import {
  buildBestRanking,
  buildLeaderboard,
  buildSetsPayload,
  buildTemplatePayload,
  buildTrainingPayload,
  completeSet,
  endRest,
  extraTrainingEntry,
  formatClock,
  formatLastSets,
  formatSessionSummary,
  formatWorkoutDuration,
  parseTrainingSession,
  planTrainingEntries,
  reopenSet,
  restElapsed,
  type TrainingSession,
  dayKey,
  formatDistance,
  formatDuration,
  formatSetLine,
  formatTemplateTarget,
  groupSetsIntoBlocks,
  formatWeight,
  isoWeek,
  muscleGroups,
  normalizeForSearch,
  parseDecimal,
  searchExercises,
  summarizeSets,
  toDraftEntries,
  toTemplateDraftEntries,
  toTemplateVisibility,
  versionSourceLabel,
  type StoredSet,
  weekGrid,
  weekKeys,
} from "./logic";

// Samstag, 3. Oktober 2026, 12:00 Uhr deutscher Zeit
const NOW = new Date("2026-10-03T10:00:00Z");

describe("Kalendertage in deutscher Zeit", () => {
  it("ordnet Sonntag 23:30 Uhr deutscher Zeit dem Sonntag zu", () => {
    expect(dayKey(new Date("2026-10-04T21:30:00Z"))).toBe("2026-10-04");
  });

  it("ordnet Montag 00:30 Uhr deutscher Zeit dem Montag zu, obwohl es in UTC noch Sonntag ist", () => {
    expect(dayKey(new Date("2026-10-04T22:30:00Z"))).toBe("2026-10-05");
  });

  it("liefert die Woche von Montag bis Sonntag", () => {
    expect(weekKeys(NOW)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("beginnt die Woche auch an einem Sonntag am Montag davor", () => {
    expect(weekKeys(new Date("2026-10-04T10:00:00Z"))[0]).toBe("2026-09-28");
  });

  it("kennt die Kalenderwoche, auch über den Jahreswechsel", () => {
    expect(isoWeek(NOW)).toBe(40);
    expect(isoWeek(new Date("2027-01-01T12:00:00Z"))).toBe(53);
    expect(isoWeek(new Date("2027-01-04T12:00:00Z"))).toBe(1);
  });
});

describe("Wochenraster", () => {
  it("markiert genau die trainierten Tage der laufenden Woche", () => {
    const grid = weekGrid(["2026-09-28", "2026-09-30", "2026-10-02", "2026-09-21"], NOW);
    expect(grid).toEqual([true, false, true, false, true, false, false]);
  });
});

describe("Zahlen", () => {
  it("liest Komma und Punkt als Dezimaltrenner", () => {
    expect(parseDecimal("82,5")).toBe(82.5);
    expect(parseDecimal("82.5")).toBe(82.5);
    expect(parseDecimal(" 100 ")).toBe(100);
  });

  it("lehnt ungültige Eingaben ab", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("-5")).toBeNull();
    expect(parseDecimal("1,2,3")).toBeNull();
  });

  it("zeigt Gewichte in deutscher Schreibweise ohne überflüssige Nachkommastellen", () => {
    expect(formatWeight(80)).toBe("80");
    expect(formatWeight(82.5)).toBe("82,5");
  });
});

describe("Sätze für das Speichern", () => {
  it("nummeriert Sätze je Übung und überspringt leere Zeilen", () => {
    const result = buildSetsPayload([
      {
        exerciseId: "bank",
        measure: "weight_reps",
        sets: [
          { value: "5", weight: "80" },
          { value: "", weight: "" },
          { value: "5", weight: "82,5" },
        ],
      },
      { exerciseId: "plank", measure: "duration", sets: [{ value: "60", weight: "" }] },
    ]);

    expect(result).toEqual({
      ok: true,
      sets: [
        { exercise_id: "bank", set_number: 1, reps: 5, weight_kg: 80 },
        { exercise_id: "bank", set_number: 2, reps: 5, weight_kg: 82.5 },
        { exercise_id: "plank", set_number: 1, duration_seconds: 60, weight_kg: 0 },
      ],
    });
  });

  it("erlaubt Körpergewichtsübungen ohne Gewichtsangabe", () => {
    const result = buildSetsPayload([
      { exerciseId: "klimmzug", measure: "weight_reps", sets: [{ value: "8", weight: "" }] },
    ]);
    expect(result).toEqual({
      ok: true,
      sets: [{ exercise_id: "klimmzug", set_number: 1, reps: 8, weight_kg: 0 }],
    });
  });

  it("meldet einen Fehler, wenn kein Satz eingetragen ist", () => {
    const result = buildSetsPayload([
      { exerciseId: "bank", measure: "weight_reps", sets: [{ value: "", weight: "" }] },
    ]);
    expect(result.ok).toBe(false);
  });

  it("meldet einen Fehler bei Gewicht ohne Wiederholungen und bei halben Wiederholungen", () => {
    expect(
      buildSetsPayload([
        { exerciseId: "bank", measure: "weight_reps", sets: [{ value: "", weight: "80" }] },
      ]).ok,
    ).toBe(false);
    expect(
      buildSetsPayload([
        { exerciseId: "bank", measure: "weight_reps", sets: [{ value: "5,5", weight: "80" }] },
      ]).ok,
    ).toBe(false);
  });
});

describe("Konstanz-Rangliste", () => {
  it("sortiert nach Trainingstagen und bei Gleichstand nach Name", () => {
    const rows = buildLeaderboard(
      [
        { userId: "a", name: "Mara" },
        { userId: "b", name: "Jonas" },
        { userId: "c", name: "Elif" },
      ],
      [
        { userId: "a", day: "2026-09-28" },
        { userId: "b", day: "2026-09-28" },
        { userId: "b", day: "2026-09-29" },
        { userId: "c", day: "2026-09-30" },
        { userId: "c", day: "2026-09-21" },
      ],
      "a",
      NOW,
    );

    expect(rows.map((r) => [r.name, r.count, r.isMe])).toEqual([
      ["Jonas", 2, false],
      ["Elif", 1, false],
      ["Mara", 1, true],
    ]);
  });
});

describe("Zusammenfassung im Verlauf", () => {
  it("fasst Sätze je Übung zusammen und nennt das höchste Gewicht", () => {
    const row = { reps: 5, duration_seconds: null, distance_m: null };
    expect(
      summarizeSets([
        { ...row, weight_kg: 80, exercises: { name: "Bankdrücken" } },
        { ...row, weight_kg: 82.5, exercises: { name: "Bankdrücken" } },
        { ...row, weight_kg: 0, exercises: { name: "Klimmzug" } },
      ]),
    ).toEqual(["Bankdrücken: 2 Sätze, bis 82,5\u00a0kg", "Klimmzug: 1 Satz"]);
  });
});

describe("Bestwerte je Übung", () => {
  const members = [
    { userId: "a", name: "Mara" },
    { userId: "b", name: "Jonas" },
    { userId: "c", name: "Elif" },
  ];
  const empty = { bestE1rmKg: null, maxWeightKg: null, maxReps: null, maxDurationSeconds: null, totalDistanceM: null };

  it("ordnet Kraftübungen nach geschätztem Maximum und nennt den schwersten Satz", () => {
    const rows = buildBestRanking(
      members,
      [
        { ...empty, userId: "a", bestE1rmKg: 71.2, maxWeightKg: 61, maxReps: 5 },
        { ...empty, userId: "b", bestE1rmKg: 112.6, maxWeightKg: 96.5, maxReps: 5 },
      ],
      "weight_reps",
      "a",
    );
    expect(rows.map((r) => [r.name, r.value, r.unit, r.isMe])).toEqual([
      ["Jonas", "112,6", "kg", false],
      ["Mara", "71,2", "kg", true],
    ]);
    expect(rows[0].detail).toBe("schwerster Satz 96,5\u00a0kg");
  });

  it("wertet Körpergewichtsübungen nach Wiederholungen und stellt sie hinter Sätze mit Last", () => {
    const rows = buildBestRanking(
      members,
      [
        { ...empty, userId: "a", maxWeightKg: 0, maxReps: 12 },
        { ...empty, userId: "b", bestE1rmKg: 13.3, maxWeightKg: 10, maxReps: 10 },
        { ...empty, userId: "c", maxWeightKg: 0, maxReps: 8 },
      ],
      "weight_reps",
      "c",
    );
    expect(rows.map((r) => [r.name, r.value, r.unit])).toEqual([
      ["Jonas", "13,3", "kg"],
      ["Mara", "12", "Wdh."],
      ["Elif", "8", "Wdh."],
    ]);
  });

  it("wertet Halteübungen nach der längsten Dauer", () => {
    const rows = buildBestRanking(
      members,
      [
        { ...empty, userId: "a", maxDurationSeconds: 45 },
        { ...empty, userId: "b", maxDurationSeconds: 90 },
      ],
      "duration",
      "a",
    );
    expect(rows.map((r) => [r.name, r.value, r.unit])).toEqual([
      ["Jonas", "1:30", "min"],
      ["Mara", "45", "s"],
    ]);
  });

  it("lässt Mitglieder ohne Wert und Nichtmitglieder weg", () => {
    const rows = buildBestRanking(
      members,
      [
        { ...empty, userId: "a" },
        { ...empty, userId: "fremd", bestE1rmKg: 200 },
        { ...empty, userId: "c", totalDistanceM: 5200 },
      ],
      "distance",
      "a",
    );
    expect(rows.map((r) => [r.name, r.value, r.unit])).toEqual([["Elif", "5,2", "km"]]);
  });

  it("formatiert Dauer und Distanz", () => {
    expect(formatDuration(59)).toEqual({ value: "59", unit: "s" });
    expect(formatDuration(125)).toEqual({ value: "2:05", unit: "min" });
    expect(formatDistance(800)).toEqual({ value: "800", unit: "m" });
    expect(formatDistance(10000)).toEqual({ value: "10,0", unit: "km" });
  });
});

describe("Workout ansehen und korrigieren", () => {
  const set = (over: Partial<StoredSet>): StoredSet => ({
    exerciseId: "bank",
    exerciseName: "Bankdrücken",
    measure: "weight_reps",
    reps: 5,
    durationSeconds: null,
    distanceM: null,
    weightKg: 80,
    ...over,
  });
  const plank = { exerciseId: "plank", exerciseName: "Plank", measure: "duration" as const, reps: null };
  const stored: StoredSet[] = [
    set({}),
    set({ weightKg: 82.5 }),
    set({ ...plank, durationSeconds: 60, weightKg: 0 }),
    set({ exerciseId: "klimm", exerciseName: "Klimmzug", reps: 8, weightKg: 0 }),
    set({ weightKg: 70, reps: 8 }),
  ];

  it("bildet Blöcke in gespeicherter Reihenfolge, auch wenn eine Übung später noch einmal kommt", () => {
    expect(groupSetsIntoBlocks(stored).map((b) => [b.exerciseName, b.sets.length])).toEqual([
      ["Bankdrücken", 2],
      ["Plank", 1],
      ["Klimmzug", 1],
      ["Bankdrücken", 1],
    ]);
  });

  it("zeigt Sätze je nach Messart lesbar an", () => {
    expect(stored.map(formatSetLine)).toEqual([
      "5\u00a0×\u00a080\u00a0kg",
      "5\u00a0×\u00a082,5\u00a0kg",
      "1:00\u00a0min",
      "8\u00a0Wdh.",
      "8\u00a0×\u00a070\u00a0kg",
    ]);
  });

  it("ergibt nach Laden ins Formular und erneutem Speichern dieselben Sätze", () => {
    const draft = toDraftEntries(stored).map((entry) => ({
      ...entry,
      measure: stored.find((s) => s.exerciseId === entry.exerciseId)!.measure,
    }));
    const payload = buildSetsPayload(draft);

    expect(payload).toEqual({
      ok: true,
      sets: [
        { exercise_id: "bank", set_number: 1, reps: 5, weight_kg: 80 },
        { exercise_id: "bank", set_number: 2, reps: 5, weight_kg: 82.5 },
        { exercise_id: "plank", set_number: 1, duration_seconds: 60, weight_kg: 0 },
        { exercise_id: "klimm", set_number: 1, reps: 8, weight_kg: 0 },
        { exercise_id: "bank", set_number: 1, reps: 8, weight_kg: 70 },
      ],
    });
  });
});

describe("Übung suchen", () => {
  const catalog = [
    { id: "1", name: "Bankdrücken", muscleGroup: "Brust", aliases: ["Bench Press", "Flachbankdrücken"] },
    { id: "2", name: "Schrägbankdrücken", muscleGroup: "Brust", aliases: ["Incline Bench Press"] },
    { id: "3", name: "Enges Bankdrücken", muscleGroup: "Arme", aliases: ["Close-Grip Bench Press"] },
    { id: "4", name: "Kniebeuge", muscleGroup: "Beine", aliases: ["Squat", "Back Squat"] },
    { id: "5", name: "Überzüge", muscleGroup: "Rücken", aliases: ["Pullover"] },
    { id: "6", name: "Liegestütz", muscleGroup: "Brust", aliases: ["Push-up", "Pushup"] },
    { id: "7", name: "Reißen", muscleGroup: "Ganzkörper", aliases: ["Snatch"] },
    { id: "8", name: "Goblet Squat", muscleGroup: "Beine", aliases: ["Goblet-Kniebeuge"] },
  ];
  const names = (query: string) => searchExercises(catalog, query).map((e) => e.name);

  it("findet nichts bei leerer Eingabe", () => {
    expect(names("")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });

  it("stellt Treffer am Namensanfang vor Treffer im Namen", () => {
    expect(names("bank")).toEqual(["Bankdrücken", "Enges Bankdrücken", "Schrägbankdrücken"]);
  });

  it("findet Umlaute und ß auch ohne Sonderzeichen", () => {
    expect(names("uberzuge")).toEqual(["Überzüge"]);
    expect(names("liegestutz")).toEqual(["Liegestütz"]);
    expect(names("reissen")).toEqual(["Reißen"]);
    expect(normalizeForSearch("Rücken-Strecker ß")).toBe("rucken strecker ss");
  });

  it("findet Übungen über den englischen Namen", () => {
    expect(names("push up")).toEqual(["Liegestütz"]);
    expect(names("snatch")).toEqual(["Reißen"]);
  });

  it("stellt den exakten Treffer vor Übungen, die das Wort nur enthalten", () => {
    expect(names("squat")).toEqual(["Kniebeuge", "Goblet Squat"]);
    expect(names("kniebeuge")).toEqual(["Kniebeuge", "Goblet Squat"]);
  });

  it("verlangt, dass jedes Wort vorkommt", () => {
    expect(names("incline bench")).toEqual(["Schrägbankdrücken"]);
    expect(names("bench beine")).toEqual([]);
  });

  it("findet über die Muskelgruppe und begrenzt die Trefferzahl", () => {
    expect(names("brust")).toEqual(["Bankdrücken", "Liegestütz", "Schrägbankdrücken"]);
    expect(searchExercises(catalog, "brust", 2)).toHaveLength(2);
  });

  it("listet die Muskelgruppen in fester Reihenfolge", () => {
    expect(muscleGroups(catalog)).toEqual(["Brust", "Rücken", "Arme", "Beine", "Ganzkörper"]);
  });
});

describe("Vorlagen: Zielwerte aus dem Formular", () => {
  const bench = { exerciseId: "e1", measure: "weight_reps" as const, sets: "4", value: "8", weight: "62,5" };

  it("macht aus dem Entwurf die Übungen für save_template", () => {
    expect(buildTemplatePayload([bench])).toEqual({
      ok: true,
      exercises: [{ exercise_id: "e1", target_sets: 4, target_reps: 8, target_weight_kg: 62.5 }],
    });
  });

  it("nimmt drei Sätze an, wenn das Feld leer ist, und lässt Zielwerte weg", () => {
    expect(buildTemplatePayload([{ ...bench, sets: "", value: "", weight: "" }])).toEqual({
      ok: true,
      exercises: [{ exercise_id: "e1", target_sets: 3 }],
    });
  });

  it("legt je nach Messart den passenden Zielwert fest", () => {
    const plank = { exerciseId: "e2", measure: "duration" as const, sets: "3", value: "45", weight: "" };
    const run = { exerciseId: "e3", measure: "distance" as const, sets: "1", value: "5,2", weight: "" };
    expect(buildTemplatePayload([plank, run])).toEqual({
      ok: true,
      exercises: [
        { exercise_id: "e2", target_sets: 3, target_duration_seconds: 45 },
        { exercise_id: "e3", target_sets: 1, target_distance_m: 5.2 },
      ],
    });
  });

  it("ignoriert ein Gewicht bei Übungen ohne Last", () => {
    const plank = { exerciseId: "e2", measure: "duration" as const, sets: "3", value: "45", weight: "20" };
    const result = buildTemplatePayload([plank]);
    expect(result.ok && result.exercises[0]).not.toHaveProperty("target_weight_kg");
  });

  it("verlangt mindestens eine Übung", () => {
    expect(buildTemplatePayload([])).toEqual({ ok: false, error: "Füg mindestens eine Übung hinzu." });
  });

  it("lehnt unmögliche Eingaben mit Angabe der Übung ab", () => {
    const check = (patch: Partial<typeof bench>) => buildTemplatePayload([bench, { ...bench, ...patch }]);
    expect(check({ sets: "0" })).toMatchObject({ ok: false, error: expect.stringContaining("Übung 2") });
    expect(check({ sets: "21" })).toMatchObject({ ok: false });
    expect(check({ sets: "2,5" })).toMatchObject({ ok: false });
    expect(check({ value: "0" })).toMatchObject({ ok: false });
    expect(check({ value: "7,5" })).toMatchObject({ ok: false, error: expect.stringContaining("ganze Zahlen") });
    expect(check({ weight: "abc" })).toMatchObject({ ok: false });
  });

  it("begrenzt die Zahl der Übungen", () => {
    expect(buildTemplatePayload(Array.from({ length: 31 }, () => bench))).toMatchObject({ ok: false });
    expect(buildTemplatePayload(Array.from({ length: 30 }, () => bench))).toMatchObject({ ok: true });
  });
});

describe("Vorlagen: Anzeige", () => {
  const base = {
    exerciseId: "e1",
    exerciseName: "Bankdrücken",
    measure: "weight_reps" as const,
    targetSets: 4,
    targetReps: 8,
    targetWeightKg: 60,
    targetDurationSeconds: null,
    targetDistanceM: null,
  };

  it("zeigt Sätze, Wiederholungen und Gewicht", () => {
    expect(formatTemplateTarget(base)).toBe("4 × 8 · 60 kg");
    expect(formatTemplateTarget({ ...base, targetWeightKg: 62.5 })).toBe("4 × 8 · 62,5 kg");
  });

  it("lässt das Gewicht weg, wenn es fehlt oder 0 ist", () => {
    expect(formatTemplateTarget({ ...base, targetWeightKg: null })).toBe("4 × 8");
    expect(formatTemplateTarget({ ...base, targetWeightKg: 0 })).toBe("4 × 8");
  });

  it("zeigt nur die Zahl der Sätze, wenn kein Zielwert gesetzt ist", () => {
    const open = { ...base, targetReps: null, targetWeightKg: null };
    expect(formatTemplateTarget(open)).toBe("4 Sätze");
    expect(formatTemplateTarget({ ...open, targetSets: 1 })).toBe("1 Satz");
  });

  it("formatiert Dauer und Strecke", () => {
    const plank = { ...base, measure: "duration" as const, targetReps: null, targetDurationSeconds: 90 };
    const run = { ...base, measure: "distance" as const, targetReps: null, targetDistanceM: 5200 };
    expect(formatTemplateTarget(plank)).toBe("4 × 1:30 min");
    expect(formatTemplateTarget(run)).toBe("4 × 5,2 km");
  });

  it("gibt gespeicherte Übungen als Entwurf zurück und wieder in dieselbe Nutzlast", () => {
    const stored = [base, { ...base, exerciseId: "e2", targetWeightKg: 62.5 }];
    const draft = toTemplateDraftEntries(stored);
    expect(draft[1]).toEqual({ exerciseId: "e2", measure: "weight_reps", sets: "4", value: "8", weight: "62,5" });
    expect(buildTemplatePayload(draft)).toEqual({
      ok: true,
      exercises: [
        { exercise_id: "e1", target_sets: 4, target_reps: 8, target_weight_kg: 60 },
        { exercise_id: "e2", target_sets: 4, target_reps: 8, target_weight_kg: 62.5 },
      ],
    });
  });

  it("benennt die Herkunft einer Version und behandelt Unbekanntes als privat", () => {
    expect(versionSourceLabel("ai")).toBe("KI");
    expect(versionSourceLabel("app")).toBe("App");
    expect(toTemplateVisibility("public")).toBe("public");
    expect(toTemplateVisibility("irgendwas")).toBe("private");
  });
});

describe("Training: Zeiten", () => {
  it("formatiert Dauer und Pause wie eine Uhr", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(45)).toBe("0:45");
    expect(formatClock(723)).toBe("12:03");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(-5)).toBe("0:00");
  });

  it("nennt die Dauer eines Workouts in Minuten und Stunden", () => {
    expect(formatWorkoutDuration("2026-10-04T08:00:00Z", "2026-10-04T08:52:30Z")).toBe("52 min");
    expect(formatWorkoutDuration("2026-10-04T08:00:00Z", "2026-10-04T09:05:00Z")).toBe("1 h 05 min");
    expect(formatWorkoutDuration("2026-10-04T08:00:00Z", "2026-10-04T08:00:30Z")).toBe("unter 1 min");
  });
});

describe("Training: Vorbelegung", () => {
  const bench = {
    exerciseId: "bank",
    exerciseName: "Bankdrücken",
    measure: "weight_reps" as const,
    targetSets: 3,
    targetReps: 8,
    targetWeightKg: 60,
    targetDurationSeconds: null,
    targetDistanceM: null,
  };
  const last = (reps: number, weightKg: number) => ({
    exerciseId: "bank",
    exerciseName: "Bankdrücken",
    measure: "weight_reps" as const,
    reps,
    durationSeconds: null,
    distanceM: null,
    weightKg,
  });

  it("nimmt Satz für Satz die Werte vom letzten Mal und füllt mit dem letzten Satz auf", () => {
    const [entry] = planTrainingEntries([bench], new Map([["bank", [last(8, 62.5), last(6, 65)]]]));
    expect(entry.sets.map((s) => [s.value, s.weight])).toEqual([
      ["8", "62,5"],
      ["6", "65"],
      ["6", "65"],
    ]);
    expect(entry.fromTemplate).toBe(true);
    expect(entry.sets.every((s) => s.doneAt === null)).toBe(true);
  });

  it("nimmt ohne früheres Training die Zielwerte der Vorlage", () => {
    const [entry] = planTrainingEntries([bench], new Map());
    expect(entry.sets).toHaveLength(3);
    expect(entry.sets[0]).toMatchObject({ value: "8", weight: "60" });
  });

  it("legt im Training hinzugefügte Übungen getrennt von der Vorlage an", () => {
    const extra = extraTrainingEntry("klimm", "weight_reps");
    expect(extra).toMatchObject({ exerciseId: "klimm", fromTemplate: false });
    expect(extra.sets).toEqual([{ value: "", weight: "", doneAt: null, restSeconds: null }]);
    expect(extraTrainingEntry("bank", "weight_reps", [last(8, 60), last(8, 60)]).sets).toHaveLength(2);
  });
});

describe("Training: Abhaken und Pausen", () => {
  const T0 = 1_000_000;
  const session = (): TrainingSession => ({
    version: 1,
    id: "w1",
    templateId: "t1",
    templateVersionId: "v1",
    title: "Oberkörper",
    startedAt: T0,
    rest: null,
    entries: [
      {
        exerciseId: "bank",
        measure: "weight_reps",
        fromTemplate: true,
        sets: [
          { value: "8", weight: "60", doneAt: null, restSeconds: null },
          { value: "8", weight: "60", doneAt: null, restSeconds: null },
          { value: "8", weight: "60", doneAt: null, restSeconds: null },
        ],
      },
    ],
  });

  it("misst die Pause zwischen zwei abgehakten Sätzen, vor dem ersten gibt es keine", () => {
    let s = completeSet(session(), 0, 0, T0 + 60_000);
    expect(s.entries[0].sets[0].restSeconds).toBeNull();
    expect(restElapsed(s, T0 + 150_000)).toBe(90);

    s = completeSet(s, 0, 1, T0 + 150_000);
    expect(s.entries[0].sets[1].restSeconds).toBe(90);
    expect(s.rest).toEqual({ startedAt: T0 + 150_000, endedAt: null });
  });

  it("hält die Pause an, wenn sie beendet wird, und ordnet diese Dauer dem nächsten Satz zu", () => {
    let s = completeSet(session(), 0, 0, T0);
    s = endRest(s, T0 + 75_000);
    expect(restElapsed(s, T0 + 200_000)).toBe(75);
    s = completeSet(s, 0, 1, T0 + 200_000);
    expect(s.entries[0].sets[1].restSeconds).toBe(75);
  });

  it("ändert einen bereits abgehakten Satz nicht ein zweites Mal", () => {
    const s = completeSet(session(), 0, 0, T0);
    expect(completeSet(s, 0, 0, T0 + 5_000)).toBe(s);
  });

  it("nimmt das Abhaken zurück, ohne die Pause anzuhalten", () => {
    let s = completeSet(session(), 0, 0, T0);
    s = reopenSet(s, 0, 0);
    expect(s.entries[0].sets[0]).toMatchObject({ doneAt: null, restSeconds: null });
    expect(s.rest).toEqual({ startedAt: T0, endedAt: null });
  });

  it("speichert nur abgehakte Sätze, mit Pause", () => {
    let s = completeSet(session(), 0, 0, T0);
    s = completeSet(s, 0, 2, T0 + 120_000);
    expect(buildTrainingPayload(s.entries)).toEqual({
      ok: true,
      sets: [
        { exercise_id: "bank", set_number: 1, reps: 8, weight_kg: 60 },
        { exercise_id: "bank", set_number: 2, reps: 8, weight_kg: 60, rest_seconds: 120 },
      ],
    });
  });

  it("verlangt mindestens einen abgehakten Satz mit Wert", () => {
    expect(buildTrainingPayload(session().entries)).toEqual({ ok: false, error: "Hak mindestens einen Satz ab." });
    const s = completeSet(session(), 0, 0, T0);
    s.entries[0].sets[0].value = "";
    expect(buildTrainingPayload(s.entries)).toMatchObject({ ok: false });
  });

  it("liest ein gespeichertes Training und verwirft Unpassendes", () => {
    const s = session();
    expect(parseTrainingSession(JSON.stringify(s))).toEqual(s);
    expect(parseTrainingSession(null)).toBeNull();
    expect(parseTrainingSession("kein json")).toBeNull();
    expect(parseTrainingSession(JSON.stringify({ ...s, version: 2 }))).toBeNull();
  });
});

describe("Verlauf je Übung", () => {
  const row = {
    workoutId: "w1",
    performedAt: "2026-10-04T08:00:00Z",
    setCount: 3,
    maxWeightKg: 62.5,
    totalReps: 22,
    bestE1rmKg: 79.2,
    maxDurationSeconds: null,
    totalDistanceM: null,
  };

  it("fasst ein Workout je Messart zusammen", () => {
    expect(formatSessionSummary(row, "weight_reps")).toBe("3 Sätze · bis 62,5 kg · 22 Wdh.");
    expect(formatSessionSummary({ ...row, maxWeightKg: 0 }, "weight_reps")).toBe("3 Sätze · 22 Wdh.");
    expect(formatSessionSummary({ ...row, setCount: 1, maxDurationSeconds: 90 }, "duration")).toBe(
      "1 Satz · bis 1:30 min",
    );
    expect(formatSessionSummary({ ...row, totalDistanceM: 5200 }, "distance")).toBe("3 Sätze · 5,2 km");
  });

  it("zeigt die Sätze vom letzten Mal in einer Zeile", () => {
    const set = { exerciseId: "b", exerciseName: "B", measure: "weight_reps" as const, durationSeconds: null, distanceM: null };
    expect(formatLastSets([{ ...set, reps: 8, weightKg: 60 }, { ...set, reps: 6, weightKg: 62.5 }])).toBe(
      "8 × 60 kg, 6 × 62,5 kg",
    );
  });
});

describe("Korrektur behält die Pausen", () => {
  it("gibt die Pause aus dem gespeicherten Satz an die Nutzlast weiter", () => {
    const stored = [
      { exerciseId: "b", exerciseName: "B", measure: "weight_reps" as const, reps: 8, durationSeconds: null, distanceM: null, weightKg: 60, restSeconds: null },
      { exerciseId: "b", exerciseName: "B", measure: "weight_reps" as const, reps: 8, durationSeconds: null, distanceM: null, weightKg: 60, restSeconds: 95 },
    ];
    const draft = toDraftEntries(stored).map((entry) => ({ ...entry, measure: "weight_reps" as const }));
    expect(buildSetsPayload(draft)).toEqual({
      ok: true,
      sets: [
        { exercise_id: "b", set_number: 1, reps: 8, weight_kg: 60 },
        { exercise_id: "b", set_number: 2, reps: 8, weight_kg: 60, rest_seconds: 95 },
      ],
    });
  });
});
