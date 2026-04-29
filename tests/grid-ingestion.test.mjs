import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  canonicalGridLabel,
  extractGridIngestionFromHtml,
} from "../lib/gridIngestion.js";
import { canonicalizeGridLabelsForWrite } from "../scripts/build-grids.mjs";

const fixture = (name) =>
  readFileSync(
    join(fileURLToPath(new URL("./fixtures/", import.meta.url)), name),
    "utf8"
  );

test("canonicalizes grid category keys and verbose fallback text", () => {
  assert.equal(canonicalGridLabel("season_pos_1b"), "1B");
  assert.equal(canonicalGridLabel("born_outside_usa"), "Born 🌍 (Non-USA)");
  assert.equal(canonicalGridLabel("career_b_h_3000"), "3K+ H");
  assert.equal(canonicalGridLabel("Played First Base min. 1 game"), "1B");
  assert.equal(
    canonicalGridLabel("Born Outside US 50 States and&nbsp;DC"),
    "Born 🌍 (Non-USA)"
  );
});

test("extracts old rows/cols payloads", () => {
  const html = fixture("grid-1115-old-rows-cols.html");
  const meta = extractGridIngestionFromHtml(html, "1115");

  assert.equal(meta.requestedGridId, "1115");
  assert.equal(meta.extractedGridId, "1115");
  assert.equal(meta.gridNum, 1115);
  assert.equal(meta.source, "old-rows-cols");
  assert.deepEqual(meta.rows, ["White Sox", "Tigers", "Pirates"]);
  assert.deepEqual(meta.cols, ["Guardians", "30+ HR", "6+ WAR"]);
  assert.deepEqual(meta.validationWarnings, []);
});

test("extracts the 1116 transition payload", () => {
  const html = fixture("grid-1116-transition.html");
  const meta = extractGridIngestionFromHtml(html, "1116");

  assert.equal(meta.requestedGridId, "1116");
  assert.equal(meta.extractedGridId, "1116");
  assert.equal(meta.gridNum, 1116);
  assert.equal(meta.source, "nuxt-pinia");
  assert.deepEqual(meta.rows, ["White Sox", "Tigers", "Pirates"]);
  assert.deepEqual(meta.cols, ["Guardians", "30+ HR", "6+ WAR"]);
  assert.deepEqual(meta.validationWarnings, []);
});

test("extracts the 1117 nuxt/pinia payload", () => {
  const html = fixture("grid-1117-nuxt-pinia.html");
  const meta = extractGridIngestionFromHtml(html, "1117");

  assert.equal(meta.requestedGridId, "1117");
  assert.equal(meta.extractedGridId, "1117");
  assert.equal(meta.gridNum, 1117);
  assert.equal(meta.source, "nuxt-pinia");
  assert.deepEqual(meta.rows, ["White Sox", "Tigers", "Pirates"]);
  assert.deepEqual(meta.cols, ["Guardians", "30+ HR", "6+ WAR"]);
  assert.deepEqual(meta.validationWarnings, []);
});

test("falls through from stale nuxt payload to rendered aside labels", () => {
  const html = fixture("grid-1119-stale-nuxt-rendered.html");
  const meta = extractGridIngestionFromHtml(html, "1119");

  assert.equal(meta.requestedGridId, "1119");
  assert.equal(meta.extractedGridId, "1119");
  assert.equal(meta.source, "rendered-html");
  assert.equal(meta.strategy, "rendered-aside");
  assert.deepEqual(meta.rows, ["White Sox", "Tigers", "Pirates"]);
  assert.deepEqual(meta.cols, ["Guardians", "30+ HR", "6+ WAR"]);
});

test("extracts grid-cell aria-label candidates", () => {
  const html = fixture("grid-1119-gridcell-aria.html");
  const meta = extractGridIngestionFromHtml(html, "1119");

  assert.equal(meta.requestedGridId, "1119");
  assert.equal(meta.extractedGridId, "1119");
  assert.equal(meta.source, "rendered-html");
  assert.equal(meta.strategy, "grid-cell-aria");
  assert.deepEqual(meta.rows, ["White Sox", "Tigers", "Pirates"]);
  assert.deepEqual(meta.cols, ["Guardians", "30+ HR", "6+ WAR"]);
});

test("fails with a sanitized summary when all strategies fail", () => {
  const html = fixture("grid-1119-stale-1116.html");
  let error = null;
  try {
    extractGridIngestionFromHtml(html, "1119");
  } catch (caught) {
    error = caught;
  }
  assert.ok(error);
  assert.equal(error.code, "GRID_EXTRACTION_FAILED");
  assert.ok(error.summary);
});

test("falls back to rendered labels when payload data is unavailable", () => {
  const html = fixture("grid-1118-rendered.html");
  const meta = extractGridIngestionFromHtml(html, "1118");

  assert.equal(meta.requestedGridId, "1118");
  assert.equal(meta.extractedGridId, "1118");
  assert.equal(meta.source, "rendered-html");
  assert.deepEqual(meta.rows, ["White Sox", "Tigers", "Pirates"]);
  assert.deepEqual(meta.cols, ["Guardians", "30+ HR", "6+ WAR"]);
  assert.ok(meta.validationWarnings.includes("rendered-html fallback used"));
});

test("prefers validator keys over verbose rendered text", () => {
  const html = `<!doctype html>
    <html>
      <head><title>Grid #1123</title></head>
      <body>
        <h1>Grid #1123</h1>
        <aside aria-label="Grid Row Categories">
          <dfn data-validator-key="season_pos_1b">Played First Base min. 1 game</dfn>
          <dfn data-validator-key="born_outside_usa">Born Outside US 50 States and&nbsp;DC</dfn>
          <dfn data-validator-key="career_b_h_3000">3000+ Hits Career Batting</dfn>
        </aside>
        <aside aria-label="Grid Column Categories">
          <dfn data-validator-key="season_b_h_200">200+ Hits Season Batting</dfn>
          <dfn data-validator-key="season_b_avg_300">.300+ AVG Season Batting</dfn>
          <dfn data-validator-key="season_b_hr_30">30+ HR Season Batting</dfn>
        </aside>
      </body>
    </html>`;
  const meta = extractGridIngestionFromHtml(html, "1123");

  assert.equal(meta.source, "rendered-html");
  assert.deepEqual(meta.rows, ["1B", "Born 🌍 (Non-USA)", "3K+ H"]);
  assert.deepEqual(meta.cols, ["200+ H", ".300+ Season", "30+ HR"]);
});

test("canonicalizes Playwright-derived labels at the write boundary", () => {
  const labels = canonicalizeGridLabelsForWrite({
    rows: [
      "200+ Hits Season Batting",
      ".300+ AVG Season Batting",
      "3000+ Hits Career Batting",
    ],
    cols: ["Only One Team", "Hall of Fame", "Played First Base min. 1 game"],
  });

  assert.deepEqual(labels.rows, ["200+ H", ".300+ Season", "3K+ H"]);
  assert.deepEqual(labels.cols, ["One Team", "HOF", "1B"]);
});
