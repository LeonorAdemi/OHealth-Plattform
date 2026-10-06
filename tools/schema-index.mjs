// Erzeugt supabase/SCHEMA_INDEX.md: für jedes Datenbankobjekt die Stelle seiner aktuellen
// Fassung in den Migrationen. So muss niemand alle Migrationen lesen, um den Stand einer
// Funktion oder Regel zu finden. Aufruf: `npm run db:index`, mit `--check` nur prüfen.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "supabase/migrations");
const target = path.join(root, "supabase/SCHEMA_INDEX.md");

const name = String.raw`((?:"?\w+"?\.)?"?\w+"?)`;
const rules = [
  ["Funktionen", "def", new RegExp(String.raw`^\s*create\s+(?:or\s+replace\s+)?function\s+${name}`, "i")],
  ["Funktionen", "drop", new RegExp(String.raw`^\s*drop\s+function\s+(?:if\s+exists\s+)?${name}`, "i")],
  ["Views", "def", new RegExp(String.raw`^\s*create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?${name}`, "i")],
  ["Views", "drop", new RegExp(String.raw`^\s*drop\s+(?:materialized\s+)?view\s+(?:if\s+exists\s+)?${name}`, "i")],
  ["Tabellen", "def", new RegExp(String.raw`^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?${name}`, "i")],
  ["Tabellen", "alter", new RegExp(String.raw`^\s*alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${name}`, "i")],
  ["Tabellen", "drop", new RegExp(String.raw`^\s*drop\s+table\s+(?:if\s+exists\s+)?${name}`, "i")],
  ["Regeln (RLS)", "def", new RegExp(String.raw`^\s*create\s+policy\s+"?([\w ]+?)"?\s+on\s+${name}`, "i")],
  ["Regeln (RLS)", "alter", new RegExp(String.raw`^\s*alter\s+policy\s+"?([\w ]+?)"?\s+on\s+${name}`, "i")],
  ["Regeln (RLS)", "drop", new RegExp(String.raw`^\s*drop\s+policy\s+(?:if\s+exists\s+)?"?([\w ]+?)"?\s+on\s+${name}`, "i")],
  ["Trigger", "def", new RegExp(String.raw`^\s*create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+"?(\w+)"?`, "i")],
  ["Trigger", "drop", new RegExp(String.raw`^\s*drop\s+trigger\s+(?:if\s+exists\s+)?"?(\w+)"?\s+on\s+${name}`, "i")],
  ["Typen", "def", new RegExp(String.raw`^\s*create\s+type\s+${name}`, "i")],
  ["Typen", "alter", new RegExp(String.raw`^\s*alter\s+type\s+${name}`, "i")],
  ["Jobs (pg_cron)", "def", /cron\.schedule\(\s*'([^']+)'/i],
  ["Jobs (pg_cron)", "drop", /cron\.unschedule\(\s*'([^']+)'/i],
];

const qualify = (n) => {
  const clean = n.replaceAll('"', "").toLowerCase();
  return clean.includes(".") ? clean : `public.${clean}`;
};
const keyOf = (group, m) => {
  if (group === "Regeln (RLS)") return `${qualify(m[2])}: ${m[1].trim()}`;
  if (group === "Trigger") return m[2] ? `${m[1]} on ${qualify(m[2])}` : m[1];
  if (group === "Jobs (pg_cron)") return m[1];
  return qualify(m[1]);
};

const short = (file) => file.replace(/^\d+_/, "").replace(/\.sql$/, "");
const objects = new Map();
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const lines = readFileSync(path.join(dir, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*--/.test(line)) return;
    for (const [group, kind, re] of rules) {
      const m = line.match(re);
      if (!m) continue;
      let key = keyOf(group, m);
      // Trigger werden bei drop mit Tabelle genannt, bei create oft erst in einer späteren Zeile.
      if (group === "Trigger") key = key.split(" on ")[0];
      const id = `${group}\u0000${key}`;
      const o = objects.get(id) ?? { group, key, at: null, versions: 0, changes: [], dropped: false };
      if (kind === "def") {
        o.at = `${file}:${i + 1}`;
        o.versions += 1;
        o.dropped = false;
      } else if (kind === "alter") {
        if (!o.changes.includes(short(file)) && !o.at?.startsWith(file)) o.changes.push(short(file));
      } else {
        o.dropped = true;
      }
      objects.set(id, o);
      break;
    }
  });
}

const groups = ["Tabellen", "Views", "Funktionen", "Regeln (RLS)", "Trigger", "Typen", "Jobs (pg_cron)"];
const out = [
  "# Index des Datenbankschemas",
  "",
  "Generiert von `tools/schema-index.mjs` (`npm run db:index`), nicht von Hand ändern. Je Objekt steht die Stelle seiner aktuellen Fassung (`Datei:Zeile`), bei mehreren Fassungen deren Zahl, bei Tabellen und Regeln die Migrationen, die sie später ändern. Gelesen wird nur die genannte Stelle, nicht alle Migrationen. Objekte, die gelöscht wurden, fehlen.",
  "",
];
for (const g of groups) {
  const list = [...objects.values()].filter((o) => o.group === g && !o.dropped).sort((a, b) => a.key.localeCompare(b.key));
  if (!list.length) continue;
  out.push(`## ${g}`, "");
  for (const o of list) {
    const parts = [o.at ?? "nur geändert"];
    if (o.versions > 1) parts.push(`${o.versions} Fassungen`);
    if (o.changes.length) parts.push(`geändert in ${o.changes.join(", ")}`);
    out.push(`- ${o.key} → ${parts.join("; ")}`);
  }
  out.push("");
}
const text = out.join("\n");

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {}
  if (current !== text) {
    console.error("supabase/SCHEMA_INDEX.md ist veraltet. `npm run db:index` ausführen und mit committen.");
    process.exit(1);
  }
} else {
  writeFileSync(target, text);
}
