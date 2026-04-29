#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import {
  canonicalGridLabel,
  extractGridIngestionFromHtml,
} from "../lib/gridIngestion.js";

const DEFAULT_GRID_BASE =
  "https://www.sports-reference.com/immaculate-grid/grid-";
const USER_AGENT =
  "OrdinaryArchiveBot/1.0 (+https://ordinaryarchive.com; contact: ordinaryarchive@users.noreply.github.com)";
const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;
const DATE_ID_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_FETCH_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html",
};
const NO_CACHE_FETCH_HEADERS = {
  ...DEFAULT_FETCH_HEADERS,
  "Cache-Control": "no-cache, no-store, max-age=0",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Accept-Language": "en-US,en;q=0.9",
};
const FETCH_VARIANTS = [
  {
    name: "normal",
    headers: DEFAULT_FETCH_HEADERS,
    cacheBust: false,
  },
  {
    name: "cache-busted",
    headers: DEFAULT_FETCH_HEADERS,
    cacheBust: true,
  },
  {
    name: "no-cache",
    headers: NO_CACHE_FETCH_HEADERS,
    cacheBust: false,
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const getExistingGridNumber = (grid) => {
  if (!grid || typeof grid !== "object") return null;

  const candidates = [
    grid.gridNumber,
    grid.gridNum,
    grid.extractedGridId,
    grid.gridId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
      return Number(candidate);
    }
  }

  const lookups = [
    grid.displayName,
    grid.url,
    grid.slug,
    grid.path,
    grid.pathname,
  ];

  for (const value of lookups) {
    if (typeof value !== "string") continue;
    const displayMatch = value.match(/Grid #(\d+)/i);
    if (displayMatch) return Number(displayMatch[1]);
    const urlMatch = value.match(/(?:grid-|baseball-)(\d+)/i);
    if (urlMatch) return Number(urlMatch[1]);
  }

  const archiveMetadata = grid.archiveMetadata;
  if (archiveMetadata && typeof archiveMetadata === "object") {
    const nested = getExistingGridNumber(archiveMetadata);
    if (Number.isFinite(nested)) return nested;
  }

  return null;
};

export const getLatestExistingGridNumber = (grids) => {
  const values = grids
    .map((grid) => getExistingGridNumber(grid))
    .filter(Number.isFinite);

  if (!values.length) {
    throw new Error(
      "Unable to determine the latest existing grid number from data/grids.json."
    );
  }

  return Math.max(...values);
};

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

const fetchHtml = async (url, headers = DEFAULT_FETCH_HEADERS) => {
  const response = await fetch(url, { headers });
  if (response.status === 404) return { html: null, status: 404 };
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  const html = await response.text();
  return { html, status: response.status };
};

const cacheBustUrl = (url) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
};

const sanitizeExtractionSummary = (summary) => {
  if (!summary || typeof summary !== "object") return null;
  const failures = Array.isArray(summary.failures)
    ? summary.failures.map((failure) => ({
        code: failure.code || "UNKNOWN",
        candidate: failure.candidate
          ? {
              strategy: failure.candidate.strategy || failure.candidate.source || null,
              source: failure.candidate.source || null,
              extractedGridId: failure.candidate.extractedGridId || null,
              gridNum: failure.candidate.gridNum ?? null,
              canonicalGridId: failure.candidate.canonicalGridId || null,
              pathGridId: failure.candidate.pathGridId || null,
              piniaKeyGridId: failure.candidate.piniaKeyGridId || null,
              displayGridId: failure.candidate.displayGridId || null,
              rowsCount: failure.candidate.rowsCount ?? null,
              colsCount: failure.candidate.colsCount ?? null,
            }
          : null,
      }))
    : [];

  return {
    requestedGridId: summary.requestedGridId || null,
    canonicalGridId: summary.canonicalGridId || null,
    candidateCount: summary.candidateCount ?? null,
    failures,
  };
};

const extractWithFetchVariants = async (gridUrl, requestedGridId, wayback = null) => {
  const attempts = [];

  for (const variant of FETCH_VARIANTS) {
    const resolvedGridUrl = buildUrl(
      variant.cacheBust ? cacheBustUrl(gridUrl) : gridUrl,
      wayback
    );

    try {
      const fetched = await fetchHtml(resolvedGridUrl, variant.headers);
      if (!fetched.html || fetched.status === 404) {
        attempts.push({
          variant: variant.name,
          status: fetched.status,
          outcome: "missing",
        });
        continue;
      }

      try {
        const meta = extractGridIngestionFromHtml(fetched.html, requestedGridId);
        return {
          meta,
          html: fetched.html,
          attempts,
          fetchUrl: resolvedGridUrl,
          variant: variant.name,
        };
      } catch (error) {
        attempts.push({
          variant: variant.name,
          status: fetched.status,
          outcome: error.code || "ERROR",
          summary: sanitizeExtractionSummary(error.summary),
        });
      }
    } catch (error) {
      attempts.push({
        variant: variant.name,
        status: null,
        outcome: error.code || "FETCH_ERROR",
      });
    }
  }

  const error = new Error(
    `Unable to extract grid ${requestedGridId} after trying all fetch variants.`
  );
  error.code = "GRID_EXTRACTION_FAILED";
  error.summary = {
    requestedGridId,
    attempts,
  };
  throw error;
};

const extractWithPlaywrightFallback = async (gridUrl, requestedGridId) => {
  const { extractGridIngestionWithPlaywright } = await import(
    "../lib/playwrightGridFallback.mjs"
  );

  try {
    const meta = await extractGridIngestionWithPlaywright({
      requestedGridId,
      url: gridUrl,
      debugDir: path.join(repoRoot, "tmp", "grid-debug"),
    });
    return {
      meta,
      html: meta.html || null,
      summary: {
        requestedGridId,
        strategy: "playwright",
        outcome: "success",
      },
    };
  } catch (error) {
    return {
      meta: null,
      summary: {
        requestedGridId,
        strategy: "playwright",
        outcome: error.code || "PLAYWRIGHT_FAILED",
        message: error.message,
        debugFile: error.debugFile || null,
        debugFileError: error.debugFileError || null,
      },
    };
  }
};

const extractDateId = (html, fallback) => {
  if (!html) return fallback;
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

const isDateId = (value) => typeof value === "string" && DATE_ID_RE.test(value);

const addDaysToDateId = (dateId, offset) => {
  const [year, month, day] = dateId.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
};

const getExistingGridDateId = (grid) => {
  if (!grid || typeof grid !== "object") return null;
  if (isDateId(grid.id)) return grid.id;
  if (isDateId(grid.date)) return grid.date;
  if (isDateId(grid.gridDate)) return grid.gridDate;

  const archiveMetadata = grid.archiveMetadata;
  if (archiveMetadata && typeof archiveMetadata === "object") {
    return getExistingGridDateId(archiveMetadata);
  }

  return null;
};

export const inferGridDateFromNeighbors = (grids, gridNumber) => {
  if (!Number.isFinite(gridNumber)) {
    throw new Error("A numeric gridNumber is required to infer a grid date.");
  }

  const known = [];
  for (const grid of grids) {
    const knownGridNumber = getExistingGridNumber(grid);
    const dateId = getExistingGridDateId(grid);
    if (Number.isFinite(knownGridNumber) && isDateId(dateId)) {
      known.push({ gridNumber: knownGridNumber, dateId });
    }
  }

  let prior = null;
  let next = null;
  for (const entry of known) {
    if (entry.gridNumber < gridNumber) {
      if (!prior || entry.gridNumber > prior.gridNumber) prior = entry;
    } else if (entry.gridNumber > gridNumber) {
      if (!next || entry.gridNumber < next.gridNumber) next = entry;
    }
  }

  const candidates = [];
  if (prior) {
    candidates.push(addDaysToDateId(prior.dateId, gridNumber - prior.gridNumber));
  }
  if (next) {
    candidates.push(addDaysToDateId(next.dateId, gridNumber - next.gridNumber));
  }

  const uniqueCandidates = [...new Set(candidates)];
  if (uniqueCandidates.length > 1) {
    throw new Error(
      `Conflicting inferred date ids for grid #${gridNumber}: ${uniqueCandidates.join(", ")}.`
    );
  }

  return uniqueCandidates[0] || null;
};

export const resolveGridDateId = ({
  html = null,
  meta = null,
  gridNumber,
  existing = [],
  pending = [],
} = {}) => {
  if (!Number.isFinite(gridNumber)) {
    throw new Error("A numeric gridNumber is required to resolve a grid date id.");
  }

  const metaDate =
    meta && typeof meta === "object"
      ? getExistingGridDateId(meta) || getExistingGridDateId(meta.archiveMetadata)
      : null;
  if (isDateId(metaDate)) return metaDate;

  const htmlDate = extractDateId(html, null);
  if (isDateId(htmlDate)) return htmlDate;

  const inferredDate = inferGridDateFromNeighbors(
    [...existing, ...pending],
    gridNumber
  );
  if (isDateId(inferredDate)) return inferredDate;

  throw new Error(
    `Unable to determine date id for grid #${gridNumber}; refusing to write non-date id.`
  );
};

export const canonicalizeGridLabelsForWrite = (meta) => ({
  rows: meta.rows.map((label) => canonicalGridLabel(label)),
  cols: meta.cols.map((label) => canonicalGridLabel(label)),
});

const buildGridUrl = (base, suffix, index) => `${base}${index}${suffix}`;

const isUsThanksgiving = (id) => {
  if (!/^\d{4}-11-\d{2}$/.test(id)) return false;
  const [year, month, day] = id.split("-").map(Number);
  if (month !== 11) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDay() === 4 && day >= 22 && day <= 28;
};

const gridKey = (grid) => {
  const number = getExistingGridNumber(grid);
  const identifier =
    grid?.id ?? grid?.displayName ?? grid?.url ?? grid?.slug ?? grid?.path ?? "";
  return `${Number.isFinite(number) ? number : ""}:${identifier}`;
};

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

  for (const entry of entries) {
    const gridNumber = getExistingGridNumber(entry);
    if (Number.isFinite(gridNumber)) {
      const existing = byGridNumber.get(gridNumber);
      if (existing && !sameGrid(existing, entry)) {
        throw new Error(
          `Existing dataset contains conflicting gridNumber ${gridNumber}.`
        );
      }
      if (!existing) byGridNumber.set(gridNumber, entry);
    }
  }
};

const mergeIncremental = (existing, newEntries) => {
  const merged = existing.slice();
  const seen = new Map();

  for (const entry of existing) {
    const gridNumber = getExistingGridNumber(entry);
    if (Number.isFinite(gridNumber)) {
      seen.set(`gridNumber:${gridNumber}`, entry);
    }
  }

  for (const entry of newEntries) {
    const gridNumber = getExistingGridNumber(entry);
    const existingByNumber = Number.isFinite(gridNumber)
      ? seen.get(`gridNumber:${gridNumber}`)
      : null;
    const prior = existingByNumber;

    if (prior) {
      if (!sameGrid(prior, entry)) {
        throw new Error(
          `Conflicting grid already exists for ${gridKey(entry)}; refusing to overwrite.`
        );
      }
      continue;
    }

    merged.push(entry);
    const mergedGridNumber = getExistingGridNumber(entry);
    if (Number.isFinite(mergedGridNumber)) {
      seen.set(`gridNumber:${mergedGridNumber}`, entry);
    }
  }

  return merged;
};

const persistResults = async (outPath, grids) => {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(grids, null, 2)}\n`, "utf8");
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
      maxGridNumber = getLatestExistingGridNumber(existing);
      if (existing.some((entry) => entry.id === today)) {
        console.log(`Today's grid (${today}) already present; exiting early.`);
        return;
      }
    }
  } catch (error) {
    if (error && error.code === "ENOENT") {
      // No existing dataset yet.
      existing = [];
    } else {
      throw error;
    }
  }

  const results = [];
  const seenGridNumbers = new Set();
  let misses = 0;
  let index = args.incremental ? Math.max(1, maxGridNumber + 1) : args.gridStart;
  let currentRequestedGrid = null;

  try {
    while (true) {
      if (args.gridEnd && index > args.gridEnd) break;
      if (args.limit && results.length >= args.limit) break;
      if (misses >= args.maxMisses) break;

      currentRequestedGrid = index;
      const gridUrl = buildGridUrl(args.gridBase, args.gridSuffix, index);
      console.log(`Fetching grid #${index}: ${buildUrl(gridUrl, args.wayback)}`);
      let meta = null;
      let html = null;
      let staticFailureSummary = null;
      try {
        ({ meta, html } = await extractWithFetchVariants(
          gridUrl,
          String(index),
          args.wayback
        ));
      } catch (error) {
        staticFailureSummary = error && error.summary ? error.summary : null;
        if (error && error.code === "GRID_EXTRACTION_FAILED") {
          console.error(
            `Static ingestion failed for grid #${index}; trying Playwright fallback.`
          );
          const playwrightResult = await extractWithPlaywrightFallback(
            buildUrl(gridUrl, args.wayback),
            String(index)
          );
          if (playwrightResult.meta) {
            meta = playwrightResult.meta;
            html = playwrightResult.html || null;
            console.log(
              `Playwright fallback succeeded for grid #${index} using ${playwrightResult.summary.strategy}.`
            );
          } else {
            const error = new Error(
              `Playwright fallback failed for grid #${index}.`
            );
            error.code = "GRID_EXTRACTION_FAILED";
            error.summary = {
              requestedGridId: String(index),
              static: staticFailureSummary,
              playwright: playwrightResult.summary,
            };
            throw error;
          }
        } else {
          throw error;
        }
      }
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

      misses = 0;

      const id = resolveGridDateId({
        html,
        meta,
        gridNumber: index,
        existing,
        pending: results,
      });
      const canonicalLabels = canonicalizeGridLabelsForWrite(meta);
      if (
        canonicalLabels.rows.some((label) => !label) ||
        canonicalLabels.cols.some((label) => !label)
      ) {
        throw new Error(`Grid ${index} contains empty canonical labels.`);
      }

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

      const summaryRows = canonicalLabels.rows.length
        ? canonicalLabels.rows.join(", ")
        : "none";
      const summaryCols = canonicalLabels.cols.length
        ? canonicalLabels.cols.join(", ")
        : "none";
      console.log(
        `Grid ${id} [${meta.source}]: rows [${summaryRows}] | cols [${summaryCols}]`
      );

      if (isDateId(id) && id > today) {
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
        rows: canonicalLabels.rows,
        cols: canonicalLabels.cols,
        all: [...canonicalLabels.rows, ...canonicalLabels.cols],
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

    await persistResults(outPath, finalResults);
    console.log(`Saved ${finalResults.length} grids to ${outPath}`);
  } catch (error) {
    if (args.incremental && results.length) {
      const finalResults = mergeIncremental(existing, results);
      await persistResults(outPath, finalResults);
      const savedNumbers = results.map((grid) => grid.gridNumber).join(", ");
      console.error(
        `Saved incremental grids [${savedNumbers}] before failing on grid #${currentRequestedGrid}.`
      );
      console.error(`Wrote ${finalResults.length} grids to ${outPath}`);
    }
    if (error && error.summary) {
      console.error(
        `Sanitized extraction summary: ${JSON.stringify(error.summary, null, 2)}`
      );
    }
    throw error;
  }
};

const isMainModule = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === path.resolve(entry);
})();

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
