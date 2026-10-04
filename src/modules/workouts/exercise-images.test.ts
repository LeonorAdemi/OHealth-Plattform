import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { EXERCISE_IMAGE_SLUGS, exerciseImage } from "./exercise-images";

const root = process.cwd();

// Namen aller globalen Übungen, wie sie die Migrationen anlegen.
function catalogNames(): Set<string> {
  const dir = path.join(root, "supabase", "migrations");
  const names = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    for (const block of sql.split(/insert into public\.exercises/i).slice(1)) {
      const values = block.split(/;\s*$/m)[0];
      for (const match of values.matchAll(/^\s*\('((?:[^']|'')+)'/gm)) {
        names.add(match[1].replaceAll("''", "'"));
      }
    }
  }
  return names;
}

describe("Übungsskizzen", () => {
  it("Jede Übung aus dem Katalog hat eine Skizze", () => {
    const names = catalogNames();
    expect(names.size).toBeGreaterThanOrEqual(103);
    const missing = [...names].filter((name) => exerciseImage(name) === null);
    expect(missing).toEqual([]);
  });

  it("Jede zugeordnete Skizze liegt als Datei in public/exercises", () => {
    const missing = Object.values(EXERCISE_IMAGE_SLUGS).filter(
      (slug) => !existsSync(path.join(root, "public", "exercises", `${slug}.svg`)),
    );
    expect(missing).toEqual([]);
  });

  it("Zwei Übungen teilen sich nie eine Skizzen-Datei", () => {
    const slugs = Object.values(EXERCISE_IMAGE_SLUGS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("Eine Übung ohne Katalogeintrag hat keine Skizze", () => {
    expect(exerciseImage("Meine eigene Übung")).toBeNull();
    expect(exerciseImage("toString")).toBeNull();
  });

  it("Der Pfad einer Skizze zeigt auf die SVG-Datei", () => {
    expect(exerciseImage("Bankdrücken")).toBe("/exercises/bankdruecken.svg");
  });
});
