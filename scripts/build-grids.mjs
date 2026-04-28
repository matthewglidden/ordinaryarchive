#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { extractGridIngestionFromHtml } from "../lib/gridIngestion.js";

const DEFAULT_GRID_BASE =
  "https://www.sports-reference.com/immaculate-grid/grid-";
const USER_AGENT =
  "OrdinaryArchiveBot/1.0 (+https://ordinaryarchive.com; contact: ordinaryarchive@users.noreply.github.com)";
const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = (argv) => {
  const args = {
    limit: null,
    out: null,
    gridStart: 1,
    gridEnd: null,
    gridBase: DEFAULT_GRID_BASE,
    gridSuffix: "",
    maxMisses: 5,
    wayback: null,
    incremental: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--limit") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--limit expects a number");
      }
      args.limit = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--out") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--out expects a path");
      }
      args.out = next;
      i += 1;
      continue;
    }
    if (arg === "--grid-start") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--grid-start expects a number");
      }
      args.gridStart = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--grid-end") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--grid-end expects a number");
      }
      args.gridEnd = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--grid-base") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--grid-base expects a url prefix");
      }
      args.gridBase = next;
      i += 1;
      continue;
    }
    if (arg === "--grid-suffix") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--grid-suffix expects a string");
      }
      args.gridSuffix = next;
      i += 1;
      continue;
    }
    if (arg === "--max-misses") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--max-misses expects a number");
      }
      args.maxMisses = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--wayback") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--wayback expects a timestamp (YYYYMMDDhhmmss)");
      }
      args.wayback = next;
      i += 1;
      continue;
    }
    if (arg === "--incremental") {
      args.incremental = true;
      continue;
    }
  }

  return args;
};

const buildUrl = (url, wayback) => {
  if (!wayback) return url;
  return `https://web.archive.org/web/${wayback}/${url}`;
};

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  });
  if (response.status === 404) return { html: null, status: 404 };
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  const html = await response.text();
  return { html, status: response.status };
};

const extractDateId = (html, fallback) => {
  const $ = cheerio.load(html);
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = String(candidate).match(DATE_RE);
    if (match) return match[1];
  }

  const bodyText = $("body").text();
  const match = bodyText.match(DATE_RE);
  if (match) return match[1];

  return fallback;
};

const buildGridUrl = (base, suffix, index) => `${base}${index}${suffix}`;

const isUsThanksgiving = (id) => {
  if (!/^\d{4}-11-\d{2}$/.test(id)) return false;
  const [year, month, day] = id.split("-").map(Number);
  if (month !== 11) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDay() === 4 && day >= 22 && day <= 28;
};

const gridKey = (grid) => `${grid.gridNumber ?? ""}:${grid.id ?? ""}`;

const sameGrid = (a, b) =>
  a.gridNumber === b.gridNumber &&
  a.id === b.id &&
  a.url === b.url &&
  JSON.stringify(a.rows) === JSON.stringify(b.rows) &&
  JSON.stringify(a.cols) === JSON.stringify(b.cols) &&
  JSON.stringify(a.hints || []) === JSON.stringify(b.hints || []) &&
  JSON.stringify(a.searchTerms || []) === JSON.stringify(b.searchTerms || []);

const assertNoConflictingDuplicates = (entries) => {
  const byGridNumber = new Map();
  const byId = new Map();

  for (const entry of entries) {
    if (typeof entry.gridNumber === "number") {
      const existing = byGridNumber.get(entry.gridNumber);
      if (existing && !sameGrid(existing, entry)) {
        throw new Error(
          `Existing dataset contains conflicting gridNumber ${entry.gridNumber}.`
        );
      }
      if (!existing) byGridNumber.set(entry.gridNumber, entry);
    }

    if (typeof entry.id === "string") {
      const existing = byId.get(entry.id);
      if (existing && !sameGrid(existing, entry)) {
        throw new Error(`Existing dataset contains conflicting id ${entry.id}.`);
      }
      if (!existing) byId.set(entry.id, entry);
    }
  }
};

const mergeIncremental = (existing, newEntries) => {
  const merged = existing.slice();
  const seen = new Map();

  for (const entry of existing) {
    if (typeof entry.gridNumber === "number") {
      seen.set(`gridNumber:${entry.gridNumber}`, entry);
    }
    if (typeof entry.id === "string") {
      seen.set(`id:${entry.id}`, entry);
    }
  }

  for (const entry of newEntries) {
    const existingByNumber =
      typeof entry.gridNumber === "number"
        ? seen.get(`gridNumber:${entry.gridNumber}`)
        : null;
    const existingById =
      typeof entry.id === "string" ? seen.get(`id:${entry.id}`) : null;
    const prior = existingByNumber || existingById;

    if (prior) {
      if (!sameGrid(prior, entry)) {
        throw new Error(
          `Conflicting grid already exists for ${gridKey(entry)}; refusing to overwrite.`
        );
      }
      continue;
    }

    merged.push(entry);
    if (typeof entry.gridNumber === "number") {
      seen.set(`gridNumber:${entry.gridNumber}`, entry);
    }
    if (typeof entry.id === "string") {
      seen.set(`id:${entry.id}`, entry);
    }
  }

  return merged;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const outPath = args.out
    ? path.resolve(process.cwd(), args.out)
    : path.join(repoRoot, "data", "grids.json");
  const today = new Date().toISOString().slice(0, 10);

  console.log("Scanning grid sequence...");

  let existing = [];
  let maxGridNumber = 0;
  try {
    const parsed = JSON.parse(await fs.readFile(outPath, "utf8"));
    if (Array.isArray(parsed)) {
      existing = parsed;
      assertNoConflictingDuplicates(existing);
      maxGridNumber = existing.reduce((max, entry) => {
        if (typeof entry.gridNumber === "number") {
          return Math.max(max, entry.gridNumber);
        }
        return max;
      }, 0);
      if (existing.some((entry) => entry.id === today)) {
        console.log(`Today's grid (${today}) already present; exiting early.`);
        return;
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw error;
    }
    // ignore if file doesn't exist yet
  }

  const results = [];
  const seenGridNumbers = new Set();
  let misses = 0;
  let index = args.incremental ? Math.max(1, maxGridNumber + 1) : args.gridStart;

  while (true) {
    if (args.gridEnd && index > args.gridEnd) break;
    if (args.limit && results.length >= args.limit) break;
    if (misses >= args.maxMisses) break;

    const gridUrl = buildGridUrl(args.gridBase, args.gridSuffix, index);
    const fetchUrl = buildUrl(gridUrl, args.wayback);

    console.log(`Fetching grid #${index}: ${fetchUrl}`);
    const { html, status } = await fetchHtml(fetchUrl);

    if (!html || status === 404) {
      misses += 1;
      console.warn(`Missing grid #${index} (misses=${misses})`);
      index += 1;
      await sleep(350);
      continue;
    }

    misses = 0;

    const meta = extractGridIngestionFromHtml(html, String(index));
    if (meta.extractedGridId !== String(index)) {
      throw new Error(
        `Never save a grid when extractedGridId (${meta.extractedGridId}) does not match requestedGridId (${index}).`
      );
    }
    if (meta.rows.length !== 3 || meta.cols.length !== 3) {
      throw new Error(
        `Invalid grid label count for requested ${index} (rows=${meta.rows.length}, cols=${meta.cols.length}).`
      );
    }
    if (meta.rows.some((label) => !label) || meta.cols.some((label) => !label)) {
      throw new Error(`Grid ${index} contains empty labels.`);
    }

    const id = extractDateId(html, `grid-${index}`);
    const hints = [];
    const searchTerms = [];
    if (/^\d{4}-02-06$/.test(id)) {
      hints.push("Babe Ruth's birthday - he fits at least once");
    }
    if (id === "2023-12-31") {
      hints.push("Salute to Clemente (🇵🇷)");
    }
    if (id === "2024-07-04") {
      hints.push("Red White and Blue (🇺🇸)");
    }
    if (id === "2026-02-07") {
      hints.push("Hank Aaron's birthday - try him anywhere");
    }
    if (/^\d{4}-02-14$/.test(id)) {
      hints.push("Try heart/hart/valentine names today (💘)");
    }
    if (isUsThanksgiving(id)) {
      hints.push("🦃 Day - try Turkey Stearnes");
      searchTerms.push("Thanksgiving");
    }

    const summaryRows = meta.rows.length ? meta.rows.join(", ") : "none";
    const summaryCols = meta.cols.length ? meta.cols.join(", ") : "none";
    console.log(
      `Grid ${id} [${meta.source}]: rows [${summaryRows}] | cols [${summaryCols}]`
    );

    const isDateId = /^\d{4}-\d{2}-\d{2}$/.test(id);
    if (isDateId && id > today) {
      console.log(`Grid ${index} (${id}) is after today (${today}); stopping.`);
      break;
    }

    if (seenGridNumbers.has(index)) {
      throw new Error(`Duplicate grid number ${index} encountered during crawl.`);
    }
    seenGridNumbers.add(index);

    results.push({
      gridNumber: index,
      id,
      url: gridUrl,
      rows: meta.rows,
      cols: meta.cols,
      all: [...meta.rows, ...meta.cols],
      ...(hints.length ? { hints } : {}),
      ...(searchTerms.length ? { searchTerms } : {}),
    });

    if (id === today) {
      console.log(`Captured today's grid (${today}); stopping.`);
      break;
    }

    index += 1;
    await sleep(350);
  }

  const finalResults = args.incremental
    ? mergeIncremental(existing, results)
    : results;

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(
    outPath,
    `${JSON.stringify(finalResults, null, 2)}\n`,
    "utf8"
  );
  console.log(`Saved ${finalResults.length} grids to ${outPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
