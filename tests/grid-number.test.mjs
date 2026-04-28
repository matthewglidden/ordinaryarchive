import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  getExistingGridNumber,
  getLatestExistingGridNumber,
  inferGridDateFromNeighbors,
  resolveGridDateId,
} from "../scripts/build-grids.mjs";

const readJson = (relativeUrl) =>
  JSON.parse(readFileSync(fileURLToPath(relativeUrl), "utf8"));

test("detects the latest grid number from the current production schema", () => {
  const grids = readJson(new URL("../data/grids.json", import.meta.url));
  const lastGrid = grids.at(-1);
  assert.ok(grids.length >= 1118);
  assert.equal(getLatestExistingGridNumber(grids), lastGrid.gridNumber);
  assert.equal(getExistingGridNumber(grids[0]), 1);
  assert.equal(getExistingGridNumber(lastGrid), lastGrid.gridNumber);
});

test("supports the new extraction result shapes", () => {
  assert.equal(getExistingGridNumber({ gridNum: 1117 }), 1117);
  assert.equal(getExistingGridNumber({ gridId: "1118" }), 1118);
  assert.equal(getExistingGridNumber({ displayName: "Grid #1119" }), 1119);
  assert.equal(
    getExistingGridNumber({
      url: "https://www.sports-reference.com/immaculate-grid/grid-1120",
    }),
    1120
  );
});

test("infers missing Playwright fallback dates from neighboring grids", () => {
  const grids = [
    { gridNumber: 1118, id: "2026-04-24" },
    { gridNumber: 1120, id: "2026-04-26" },
  ];

  assert.equal(inferGridDateFromNeighbors(grids, 1119), "2026-04-25");
  assert.equal(
    resolveGridDateId({
      html: "",
      meta: { source: "playwright", date: null },
      gridNumber: 1119,
      existing: grids,
      pending: [],
    }),
    "2026-04-25"
  );
});

test("fails closed instead of writing grid-number ids when no date can be resolved", () => {
  assert.throws(
    () =>
      resolveGridDateId({
        html: "",
        meta: { source: "playwright", date: null },
        gridNumber: 1119,
        existing: [],
        pending: [],
      }),
    /Unable to determine date id for grid #1119/
  );
});

test("current data keeps Playwright-derived grids on the historical date-id schema", () => {
  const grids = readJson(new URL("../data/grids.json", import.meta.url));
  const grid1119 = grids.find((grid) => grid.gridNumber === 1119);

  assert.ok(grid1119);
  assert.equal(grid1119.id, "2026-04-25");
  assert.notEqual(grid1119.id, "grid-1119");
});
