#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, "../data/grids.json");
const raw = await fs.readFile(dataPath, "utf8");
const data = JSON.parse(raw);

const EXEMPT_REPEAT = new Set(["Played", "Negro Leagues"]);
const EXEMPT_GRIDS = new Set([730, 1037]);

const normalize = (value) => value.trim().toLowerCase();

const isExempt = (label) => EXEMPT_REPEAT.has(label);

const findRepeats = (labels) => {
  const counts = new Map();
  for (const label of labels) {
    const key = normalize(label);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([key, count]) => count > 1 && !isExempt(labels.find((l) => normalize(l) === key)))
    .map(([key, count]) => ({
      label: labels.find((l) => normalize(l) === key) ?? key,
      count,
    }));
};

const issues = [];

for (const grid of data) {
  const rowRepeats = findRepeats(grid.rows || []);
  const colRepeats = findRepeats(grid.cols || []);

  if (EXEMPT_GRIDS.has(grid.gridNumber)) continue;

  if (rowRepeats.length || colRepeats.length) {
    issues.push({
      id: grid.id,
      gridNumber: grid.gridNumber,
      rowRepeats,
      colRepeats,
      rows: grid.rows,
      cols: grid.cols,
    });
  }
}

if (issues.length) {
  console.log(JSON.stringify(issues, null, 2));
  process.exitCode = 1;
} else {
  console.log("No suspicious duplications detected.");
}
