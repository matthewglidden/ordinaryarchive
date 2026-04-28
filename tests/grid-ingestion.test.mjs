import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { extractGridIngestionFromHtml } from "../lib/gridIngestion.js";

const fixture = (name) =>
  readFileSync(
    join(fileURLToPath(new URL("./fixtures/", import.meta.url)), name),
    "utf8"
  );

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

test("rejects stale 1117 requests that only contain 1116 payloads", () => {
  const html = fixture("grid-1117-stale-1116.html");
  assert.throws(
    () => extractGridIngestionFromHtml(html, "1117"),
    /Stale or mismatched grid payload/
  );
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
