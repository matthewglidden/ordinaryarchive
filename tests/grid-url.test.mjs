import assert from "node:assert/strict";
import test from "node:test";
import { gridIdFromPath, validateGridUrl } from "../lib/gridUrl.js";

test("accepts canonical Sports Reference grid URLs", () => {
  const url = validateGridUrl(
    "https://www.sports-reference.com/immaculate-grid/grid-1309/"
  );

  assert.ok(url);
  assert.equal(url.hostname, "www.sports-reference.com");
  assert.equal(gridIdFromPath(url.pathname), "1309");
});

test("rejects insecure, lookalike, and non-grid URLs", () => {
  assert.equal(
    validateGridUrl("http://www.sports-reference.com/immaculate-grid/grid-1"),
    null
  );
  assert.equal(
    validateGridUrl("https://evil-sports-reference.com/immaculate-grid/grid-1"),
    null
  );
  assert.equal(
    validateGridUrl("https://www.sports-reference.com.evil.test/immaculate-grid/grid-1"),
    null
  );
  assert.equal(
    validateGridUrl("https://www.sports-reference.com/immaculate-grid/grid-1/extra"),
    null
  );
  assert.equal(
    validateGridUrl("https://user@www.sports-reference.com/immaculate-grid/grid-1"),
    null
  );
});

test("removes URL fragments before fetching a grid", () => {
  const url = validateGridUrl(
    "https://sports-reference.com/immaculate-grid/grid-42#section"
  );

  assert.ok(url);
  assert.equal(url.hash, "");
});
