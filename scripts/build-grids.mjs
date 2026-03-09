#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const DEFAULT_GRID_BASE =
  "https://www.sports-reference.com/immaculate-grid/grid-";
const USER_AGENT =
  "OrdinaryArchiveBot/1.0 (+https://ordinaryarchive.com; contact: ordinaryarchive@users.noreply.github.com)";
const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeLabel = (value) => {
  const cleaned = value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
  if (!cleaned) return cleaned;

  const direct = CATEGORY_KEY_MAP[cleaned] || CATEGORY_KEY_MAP[cleaned.toLowerCase()];
  if (direct) return direct;

  if (/^born_outside_usa$/i.test(cleaned)) {
    return CATEGORY_KEY_MAP.born_outside_usa;
  }

  const bornCountry = cleaned.match(/^born_([a-z]{3})$/i);
  if (bornCountry) {
    const key = `born_${bornCountry[1].toUpperCase()}`;
    if (CATEGORY_KEY_MAP[key]) return CATEGORY_KEY_MAP[key];
  }

  return cleaned;
};

const shortTeamLabel = (title, subtitle) => {
  const cleanTitle = title?.trim();
  const cleanSubtitle = subtitle?.trim();
  if (cleanSubtitle) return cleanSubtitle;
  return cleanTitle ?? "";
};

const CATEGORY_TITLE_MAP = {
  ".300+ AVG CAREER": ".300 Career",
  ".300+ AVG SEASON": ".300+ Season",
  "≤ 3.00 ERA CAREER": "≤3 ERA Career",
  "≤ 3.00 ERA SEASON": "≤3 ERA Season",
  "10+ HR SEASON": "10+ HR",
  "10+ WIN SEASON": "10+ W",
  "100+ RBI SEASON": "100+ RBI",
  "100+ RUN SEASON": "100+ R",
  "20+ WIN SEASON": "20+ W",
  "200+ HITS SEASON": "200+ H",
  "200+ K SEASON": "200+ K",
  "200+ WINS CAREER": "200+ W",
  "2000+ K CAREER": "2000+ K",
  "2000+ HITS CAREER": "2000+ H",
  "30+ HR / 30+ SB SEASON": "30/30",
  "30+ HR SEASON": "30+ HR",
  "30+ SB SEASON": "30+ SB",
  "30+ SAVE SEASON": "30+ SV",
  "300+ HR CAREER": "300+ HR",
  "300+ SAVE CAREER": "300+ SV",
  "300+ WINS CAREER": "300+ W",
  "3000+ K CAREER": "3000+ K",
  "3000+ HITS CAREER": "3000+ H",
  "40+ 2B SEASON": "40+ 2B",
  "40+ HR SEASON": "40+ HR",
  "40+ SAVE SEASON": "40+ SV",
  "40+ WAR CAREER": "40+ WAR",
  "6+ WAR SEASON": "6+ WAR",
  "ALL STAR": "All-Star",
  "BORN OUTSIDE US 50 STATES AND DC": "Born Outside US",
  "CY YOUNG": "Cy Young",
  "DESIGNATED HITTER": "DH",
  "FIRST ROUND DRAFT PICK": "1st Round",
  "GOLD GLOVE": "Gold Glove",
  "HALL OF FAME": "HOF",
  "MVP": "MVP",
  "ONLY ONE TEAM": "One Team",
  "PITCHED": "Pitched",
  "PLAYED": "Played",
  "PLAYED CATCHER": "C",
  "PLAYED CENTER FIELD": "CF",
  "PLAYED FIRST BASE": "1B",
  "PLAYED IN MAJOR NEGRO LGS": "Negro Leagues",
  "PLAYED LEFT FIELD": "LF",
  "PLAYED OUTFIELD": "OF",
  "PLAYED RIGHT FIELD": "RF",
  "PLAYED SECOND BASE": "2B",
  "PLAYED SHORTSTOP": "SS",
  "PLAYED THIRD BASE": "3B",
  "ROOKIE OF THE YEAR": "ROY",
  "SILVER SLUGGER": "Silver Slugger",
  "THREW A NO-HITTER": "No-Hitter",
  "WORLD SERIES CHAMP": "WS Champ",
};

const normalizeCategoryTitle = (title) => {
  const cleaned = title
    .replace(/\u2264/g, "≤")
    .replace(/\u2011|\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const upper = cleaned.toUpperCase();
  return CATEGORY_TITLE_MAP[upper] || cleaned;
};

const shortCategoryLabel = (title, shortTitle) => {
  const preferred = shortTitle?.trim() || title?.trim();
  if (!preferred) return "";
  const trimmed = preferred.replace(/\s+Awards?$/i, "").replace(/\s+Award$/i, "");
  return normalizeCategoryTitle(trimmed);
};

const TEAM_ABBREV_MAP = {
  ANA: "Angels",
  ARI: "D'backs",
  ATH: "Athletics",
  ATL: "Braves",
  BAL: "Orioles",
  BOS: "Red Sox",
  BRO: "Dodgers",
  BSN: "Braves",
  CAL: "Angels",
  CHC: "Cubs",
  CHW: "White Sox",
  CIN: "Reds",
  CLE: "Guardians",
  COL: "Rockies",
  DET: "Tigers",
  FLA: "Marlins",
  HOU: "Astros",
  KCA: "Athletics",
  KCR: "Royals",
  LAA: "Angels",
  LAD: "Dodgers",
  MIA: "Marlins",
  MIL: "Brewers",
  MIN: "Twins",
  MLA: "Orioles",
  MLN: "Braves",
  MON: "Nationals",
  NYG: "Giants",
  NYM: "Mets",
  NYY: "Yankees",
  OAK: "Athletics",
  PHA: "Athletics",
  PHI: "Phillies",
  PIT: "Pirates",
  SDP: "Padres",
  SEA: "Mariners",
  SEP: "Brewers",
  SFG: "Giants",
  SLB: "Orioles",
  STL: "Cardinals",
  TBD: "Rays",
  TBR: "Rays",
  TEX: "Rangers",
  TOR: "Blue Jays",
  WSA: "Rangers",
  WSH: "Twins",
  WSN: "Nationals",
};

const CATEGORY_KEY_MAP = {
  born_CAN: "Born 🇨🇦 (CAN)",
  born_CUB: "Born 🇨🇺 (CUB)",
  born_DOM: "Born 🇩🇴 (DOM)",
  born_JPN: "Born 🇯🇵 (JPN)",
  born_MEX: "Born 🇲🇽 (MEX)",
  born_PRI: "Born 🇵🇷 (PRI)",
  born_USA: "Born 🇺🇸 (USA)",
  born_VEN: "Born 🇻🇪 (VEN)",
  born_outside_usa: "Born 🌍 (Non-USA)",
  first_round_draft_pick: "1st round",
  career_40_war: "40+ WAR",
  career_b_avg_300: ".300+ Career",
  career_b_h_2000: "2K+ H",
  career_b_h_3000: "3K+ H",
  career_b_hr_300: "300+ HR",
  career_b_hr_500: "500+ HR",
  career_p_era_300: "≤3 ERA Career",
  career_p_so_2000: "2K+ K",
  career_p_so_3000: "3K+ K",
  career_p_sv_300: "300+ SV",
  career_p_w_200: "200+ W",
  career_p_w_300: "300+ W",
  career_played_majors: "MLB",
  career_played_nlb: "NGL",
  career_single_team: "One Team",
  season_6_war: "6+ WAR",
  season_b_avg_300: ".300+ Season",
  season_b_doubles_40: "40+ 2B",
  season_b_h_200: "200+ H",
  season_b_hr_10: "10+ HR",
  season_b_hr_30: "30+ HR",
  season_b_hr_30_sb_30: "30/30",
  season_b_hr_40: "40+ HR",
  season_b_r_100: "100+ R",
  season_b_rbi_100: "100+ RBI",
  season_b_sb_30: "30+ SB",
  season_no_hitter: "No-Hitter",
  season_p_era_300: "≤3 ERA Season",
  season_p_so_200: "200+ K",
  season_p_sv_30: "30+ SV",
  season_p_sv_40: "40+ SV",
  season_p_w_10: "10+ W",
  season_p_w_20: "20+ W",
  season_pos_1b: "1B",
  season_pos_2b: "2B",
  season_pos_3b: "3B",
  season_pos_c: "C",
  season_pos_cf: "CF",
  season_pos_dh: "DH",
  season_pos_lf: "LF",
  season_pos_of: "OF",
  season_pos_p: "P",
  season_pos_rf: "RF",
  season_pos_ss: "SS",
  season_award_mvp: "MVP",
  season_award_roty: "ROY",
  season_award_cya: "CY",
  season_award_cy: "CY",
  season_award_gg: "Gold Glove",
  season_award_ss: "Silver Slugger",
  season_award_silver_slugger: "Silver Slugger",
  season_award_gold_glove: "Gold Glove",
  season_award_hof: "HOF",
  career_award_hof: "HOF",
  season_allstar: "All-Star",
  ws_champ: "WS Champ",
  designated_hitter: "DH",
  dh: "DH",
  season_award_roy: "ROY",
  season_award_mvp2: "MVP",
  season_award_cy2: "CY",
  award_mvp: "MVP",
  award_roty: "ROY",
  award_cya: "CY",
  award_cy: "CY",
  award_gg: "Gold Glove",
  award_ss: "Silver Slugger",
  gold_glove: "Gold Glove",
  silver_slugger: "Silver Slugger",
  gg: "Gold Glove",
  ss: "SS",
  award_hof: "HOF",
  hall_of_fame: "HOF",
  all_star: "All-Star",
  world_series: "World Series",
  ws: "World Series",
  mvp: "MVP",
  roty: "ROY",
  cya: "CY",
  cy_young: "CY",
};

const fallbackCategoryLabel = (key) => {
  const normalized = key.toLowerCase();
  if (CATEGORY_KEY_MAP[normalized]) return CATEGORY_KEY_MAP[normalized];
  const underscoreMatch = normalized.replace(/-/g, "_");

  if (underscoreMatch.includes("avg_300")) {
    if (underscoreMatch.startsWith("career_")) return ".300 Career";
    if (underscoreMatch.startsWith("season_")) return ".300+ Season";
    return ".300";
  }

  if (underscoreMatch.includes("era_300")) {
    if (underscoreMatch.startsWith("career_")) return "≤3 ERA Career";
    if (underscoreMatch.startsWith("season_")) return "≤3 ERA Season";
    return "≤3 ERA";
  }

  const numericMap = [
    [/^season_b_hr_10$/, "10+ HR"],
    [/^season_p_w_10$/, "10+ W"],
    [/^season_b_rbi_100$/, "100+ RBI"],
    [/^season_b_r_100$/, "100+ R"],
    [/^season_b_h_200$/, "200+ H"],
    [/^season_p_so_200$/, "200+ K"],
    [/^season_p_w_20$/, "20+ W"],
    [/^season_b_hr_30$/, "30+ HR"],
    [/^season_b_sb_30$/, "30+ SB"],
    [/^season_p_sv_30$/, "30+ SV"],
    [/^season_b_hr_40$/, "40+ HR"],
    [/^season_p_sv_40$/, "40+ SV"],
    [/^season_b_2b_40$/, "40+ 2B"],
    [/^season_b_war_6$/, "6+ WAR"],
    [/^career_b_hr_300$/, "300+ HR"],
    [/^career_p_sv_300$/, "300+ SV"],
    [/^career_p_w_200$/, "200+ W"],
    [/^career_b_h_2000$/, "2000+ H"],
    [/^career_p_so_2000$/, "2000+ K"],
    [/^career_p_w_300$/, "300+ W"],
    [/^career_b_hr_500$/, "500+ HR"],
    [/^career_p_so_3000$/, "3000+ K"],
    [/^career_b_h_3000$/, "3000+ H"],
    [/^career_b_war_40$/, "40+ WAR"],
    [/^career_p_war_40$/, "40+ WAR"],
  ];

  for (const [pattern, label] of numericMap) {
    if (pattern.test(underscoreMatch)) return label;
  }

  if (underscoreMatch === "season_b_hr_30_sb_30") return "30/30";
  if (normalized.includes("mvp")) return "MVP";
  if (normalized.includes("roty") || normalized.includes("rookie")) return "ROY";
  if (normalized.includes("cya") || normalized.includes("cy_young")) return "CY";
  if (normalized.includes("gold_glove") || normalized.includes("gg")) {
    return "Gold Glove";
  }
  if (normalized === "ss") return "SS";
  if (
    normalized.includes("silver_slugger") ||
    normalized.includes("slugger") ||
    normalized.includes("award_ss")
  ) {
    return "Silver Slugger";
  }
  if (normalized.includes("all_star")) return "All-Star";
  if (normalized.includes("hall_of_fame") || normalized === "hof") return "HOF";
  if (normalized.includes("world_series") || normalized === "ws") {
    return "World Series";
  }
  return "";
};

const uniqueOrdered = (values) => {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

const parseStringArray = (raw) => {
  if (!raw) return [];
  const values = [];
  const regex = /["']([^"']+)["']/g;
  let match = regex.exec(raw);
  while (match) {
    values.push(normalizeLabel(match[1]));
    match = regex.exec(raw);
  }
  return uniqueOrdered(values);
};

const parseNuxtArray = ($) => {
  const payload = $("#__NUXT_DATA__").first();
  if (!payload.length) return null;
  const raw = payload.text();
  if (!raw) return null;
  return JSON.parse(raw);
};

const hasBaseballReferenceLink = (value) => {
  if (!value) return false;
  if (typeof value === "string") {
    return value.includes("baseball-reference.com");
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasBaseballReferenceLink(entry));
  }
  if (typeof value === "object") {
    return Object.values(value).some((entry) => hasBaseballReferenceLink(entry));
  }
  return false;
};

const isBaseballGridObject = (gridObject) => {
  const key =
    typeof gridObject.localStorageKey === "string"
      ? gridObject.localStorageKey
      : "";
  if (key) {
    if (/(basketball|football|hockey|womens|mens)/i.test(key)) return false;
    if (/-sr(-\\d+)?$/.test(key)) return true;
  }
  if (gridObject.possibleAnswers && hasBaseballReferenceLink(gridObject.possibleAnswers)) {
    return true;
  }
  return false;
};

const findGridBlobs = (nuxtArray, gridIdHint) => {
  const stringNodes = nuxtArray.filter((entry) => typeof entry === "string");
  if (gridIdHint) {
    return stringNodes.filter(
      (entry) =>
        entry.includes(`"gridId":"${gridIdHint}"`) &&
        entry.includes("\"rows\":[") &&
        entry.includes("\"cols\":[")
    );
  }
  return stringNodes.filter(
    (entry) =>
      entry.includes("\"rows\":[") &&
      entry.includes("\"cols\":[") &&
      entry.includes("\"displayName\":\"Grid #")
  );
};

const labelTeamKeys = (record, teamMap, label) => {
  const keys = [
    record.teamId,
    record.abbrev,
    record.abbreviation,
    record.code,
    record.shortName,
    record.slug,
  ].filter((value) => typeof value === "string");

  if (!keys.length) return false;

  if (label) {
    for (const key of keys) {
      if (!teamMap.has(key)) teamMap.set(key, label);
    }
  }

  return true;
};

const buildLabelMaps = (nuxtArray) => {
  const teamMap = new Map();
  const categoryMap = new Map();

  for (const entry of nuxtArray) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry;

    const title = typeof record.title === "string" ? record.title : undefined;
    const subtitle =
      typeof record.subtitle === "string" ? record.subtitle : undefined;
    const nickname =
      typeof record.nickname === "string" ? record.nickname : undefined;
    const shortTitle =
      typeof record.shortTitle === "string" ? record.shortTitle : undefined;

    const hasTeamKeys = labelTeamKeys(record, teamMap);
    if (hasTeamKeys && (title || subtitle || nickname)) {
      const label = shortTeamLabel(title, subtitle || nickname);
      if (label) {
        labelTeamKeys(record, teamMap, label);
      }
    }

    const validatorKey =
      typeof record.validatorKey === "string" ? record.validatorKey : null;
    const categoryKey =
      typeof record.categoryKey === "string" ? record.categoryKey : null;
    const keyedLabel =
      (validatorKey && CATEGORY_KEY_MAP[validatorKey]) ||
      (categoryKey && CATEGORY_KEY_MAP[categoryKey]) ||
      "";
    const label = keyedLabel || shortCategoryLabel(title, shortTitle);
    if (validatorKey && label) {
      categoryMap.set(validatorKey, normalizeLabel(label));
    } else if (categoryKey && label) {
      categoryMap.set(categoryKey, normalizeLabel(label));
    }
  }

  return { teamMap, categoryMap };
};

const mapKeysToLabels = (keys, teamMap, categoryMap) =>
  keys.slice(0, 3).map((key) => {
    const teamLabel = teamMap.get(key) || TEAM_ABBREV_MAP[key];
    const categoryLabel = categoryMap.get(key) || fallbackCategoryLabel(key);
    const label = teamLabel || categoryLabel || key;
    return { key, label };
  });

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

const extractLabelsFromSelectors = (root, selectors, $) => {
  const collected = [];
  for (const selector of selectors) {
    const values = root
      .find(selector)
      .map((_, el) => normalizeLabel($(el).text()))
      .get();
    collected.push(...values);
  }
  return uniqueOrdered(collected);
};

const extractLabelsFromTable = ($, gridRoot) => {
  const table = gridRoot.find("table").first();
  if (!table.length) return { rows: [], cols: [] };
  const rowEls = table.find("tr");
  if (rowEls.length < 4) return { rows: [], cols: [] };
  const headerCells = rowEls
    .first()
    .find("th, td")
    .slice(1)
    .map((_, el) => normalizeLabel($(el).text()))
    .get();
  const rowLabels = rowEls
    .slice(1)
    .map((_, el) => {
      const cell = $(el).find("th, td").first();
      return normalizeLabel(cell.text());
    })
    .get();
  return {
    rows: uniqueOrdered(rowLabels),
    cols: uniqueOrdered(headerCells),
  };
};

const extractLabelsFromDataAttrs = ($) => {
  const attrs = [
    "data-grid",
    "data-grid-json",
    "data-ig",
    "data-immaculate-grid",
    "data-grid-config",
  ];
  for (const attr of attrs) {
    const nodes = $(`[${attr}]`);
    for (const el of nodes.toArray()) {
      const raw = $(el).attr(attr);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const rows =
          parsed.rows ||
          parsed.rowLabels ||
          parsed.row_labels ||
          parsed.gridRows;
        const cols =
          parsed.cols ||
          parsed.colLabels ||
          parsed.col_labels ||
          parsed.gridCols;
        if (Array.isArray(rows) && Array.isArray(cols)) {
          return {
            rows: uniqueOrdered(rows.map(normalizeLabel)).slice(0, 3),
            cols: uniqueOrdered(cols.map(normalizeLabel)).slice(0, 3),
          };
        }
      } catch (error) {
        continue;
      }
    }
  }
  return { rows: [], cols: [] };
};

const extractLabelsFromScripts = ($) => {
  const scripts = $("script")
    .map((_, el) => $(el).text())
    .get();

  for (const script of scripts) {
    if (!script) continue;
    const rowMatch = script.match(
      /row(?:s|Labels?)["']?\s*:\s*(\[[^\]]+\])/i
    );
    const colMatch = script.match(
      /col(?:s|umns|Labels?)["']?\s*:\s*(\[[^\]]+\])/i
    );
    if (rowMatch && colMatch) {
      const rows = parseStringArray(rowMatch[1]);
      const cols = parseStringArray(colMatch[1]);
      if (rows.length >= 3 && cols.length >= 3) {
        return { rows: rows.slice(0, 3), cols: cols.slice(0, 3) };
      }
    }
  }
  return { rows: [], cols: [] };
};

const extractLabels = ($) => {
  const gridRoot = $(
    "#immaculate-grid, .ig-grid, #immaculate-grid-baseball, .immaculate-grid"
  ).first();
  const scope = gridRoot.length ? gridRoot : $("body");

  const rowSelectors = [
    ".ig-grid .ig-row-header",
    ".ig-grid .ig-row-label",
    ".ig-grid [data-row-label]",
    ".ig-grid [data-row]",
    ".immaculate-grid .row-label",
    "[data-row-label]",
    "[data-row]",
  ];

  const colSelectors = [
    ".ig-grid .ig-col-header",
    ".ig-grid .ig-col-label",
    ".ig-grid [data-col-label]",
    ".ig-grid [data-col]",
    ".immaculate-grid .col-label",
    "[data-col-label]",
    "[data-col]",
  ];

  let rows = extractLabelsFromSelectors(scope, rowSelectors, $);
  let cols = extractLabelsFromSelectors(scope, colSelectors, $);

  if (rows.length < 3 || cols.length < 3) {
    const dataFallback = extractLabelsFromDataAttrs($);
    if (rows.length < 3) rows = dataFallback.rows;
    if (cols.length < 3) cols = dataFallback.cols;
  }

  if (rows.length < 3 || cols.length < 3) {
    const scriptFallback = extractLabelsFromScripts($);
    if (rows.length < 3) rows = scriptFallback.rows;
    if (cols.length < 3) cols = scriptFallback.cols;
  }

  if (rows.length < 3 || cols.length < 3) {
    const tableFallback = extractLabelsFromTable($, scope);
    if (rows.length < 3) rows = tableFallback.rows;
    if (cols.length < 3) cols = tableFallback.cols;
  }

  rows = rows.slice(0, 3);
  cols = cols.slice(0, 3);

  return { rows, cols };
};

const extractGridMetaFromHtml = ($, gridIdHint) => {
  const domLabels = extractLabels($);
  if (domLabels.rows.length === 3 && domLabels.cols.length === 3) {
    return { rows: domLabels.rows, cols: domLabels.cols };
  }

  let nuxtArray = null;
  try {
    const parsed = parseNuxtArray($);
    if (Array.isArray(parsed)) nuxtArray = parsed;
  } catch (error) {
    throw new Error("Failed to parse __NUXT_DATA__ JSON payload.");
  }

  if (!nuxtArray) {
    throw new Error("Unable to locate __NUXT_DATA__ payload.");
  }

  const blobs = findGridBlobs(nuxtArray, gridIdHint);
  if (!blobs.length) {
    throw new Error("Unable to find grid data blob inside __NUXT_DATA__.");
  }

  let gridObject = null;
  for (const blob of blobs) {
    try {
      const parsed = JSON.parse(blob);
      if (isBaseballGridObject(parsed)) {
        gridObject = parsed;
        break;
      }
      if (!gridObject) gridObject = parsed;
    } catch (error) {
      continue;
    }
  }

  if (!gridObject) {
    throw new Error("Failed to parse grid data blob JSON.");
  }

  if (!isBaseballGridObject(gridObject)) {
    return {
      rows: [],
      cols: [],
      date: typeof gridObject.date === "string" ? gridObject.date : null,
      isBaseball: false,
      localStorageKey:
        typeof gridObject.localStorageKey === "string"
          ? gridObject.localStorageKey
          : null,
    };
  }

  const rows = Array.isArray(gridObject.rows)
    ? gridObject.rows.filter((value) => typeof value === "string")
    : [];
  const cols = Array.isArray(gridObject.cols)
    ? gridObject.cols.filter((value) => typeof value === "string")
    : [];

  const { teamMap, categoryMap } = buildLabelMaps(nuxtArray);
  const mappedRows = mapKeysToLabels(rows, teamMap, categoryMap);
  const mappedCols = mapKeysToLabels(cols, teamMap, categoryMap);

  return {
    rows: mappedRows.map((row) => row.label),
    cols: mappedCols.map((col) => col.label),
    date: typeof gridObject.date === "string" ? gridObject.date : null,
    isBaseball: true,
    localStorageKey:
      typeof gridObject.localStorageKey === "string"
        ? gridObject.localStorageKey
        : null,
  };
};

const extractDateId = ($, fallback) => {
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(DATE_RE);
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

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const outPath = args.out
    ? path.resolve(process.cwd(), args.out)
    : path.join(repoRoot, "data", "grids.json");
  const today = new Date().toISOString().slice(0, 10);

  console.log("Scanning grid sequence...");

  const results = [];
  let hasToday = false;
  let existing = [];
  let maxGridNumber = 0;
  try {
    const parsed = JSON.parse(await fs.readFile(outPath, "utf8"));
    if (Array.isArray(parsed)) {
      existing = parsed;
      hasToday = existing.some((entry) => entry.id === today);
      maxGridNumber = existing.reduce((max, entry) => {
        if (typeof entry.gridNumber === "number") {
          return Math.max(max, entry.gridNumber);
        }
        return max;
      }, 0);
      if (hasToday) {
        console.log(`Today's grid (${today}) already present; exiting early.`);
        return;
      }
    }
  } catch (error) {
    // ignore if file doesn't exist yet
  }
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

    const $ = cheerio.load(html);
    let rows = [];
    let cols = [];
    let date = null;
    let isBaseball = true;
    let localStorageKey = null;
    try {
      const meta = extractGridMetaFromHtml($, String(index));
      rows = meta.rows || [];
      cols = meta.cols || [];
      date = meta.date || null;
      isBaseball = meta.isBaseball !== false;
      localStorageKey = meta.localStorageKey || null;
    } catch (error) {
      console.warn(
        `Grid meta extraction failed for ${gridUrl}: ${error.message}`
      );
      const fallback = extractLabels($);
      rows = fallback.rows || [];
      cols = fallback.cols || [];
    }
    if (!isBaseball) {
      console.log(
        `Skipping non-baseball grid #${index} (${localStorageKey || "unknown"})`
      );
      index += 1;
      await sleep(350);
      continue;
    }

    const id = date || extractDateId($, `grid-${index}`);
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
      hints.push("\u{1F983} Day - try Turkey Stearnes");
      searchTerms.push("Thanksgiving");
    }
    const summaryRows = rows.length ? rows.join(", ") : "none";
    const summaryCols = cols.length ? cols.join(", ") : "none";
    console.log(`Grid ${id}: rows [${summaryRows}] | cols [${summaryCols}]`);

    const hasValidLabels = rows.length === 3 && cols.length === 3;
    const isDateId = /^\d{4}-\d{2}-\d{2}$/.test(id);
    if (!hasValidLabels && isDateId && id >= today) {
      console.log(
        `Grid ${index} (${id}) not available yet; stopping after ${today}.`
      );
      break;
    }
    if (isDateId && id > today) {
      console.log(
        `Grid ${index} (${id}) is after today (${today}); stopping.`
      );
      break;
    }
    if (!hasValidLabels) {
      const scriptCount = $("script").length;
      const dataAttrCount = $(
        "[data-grid],[data-grid-json],[data-ig],[data-immaculate-grid],[data-grid-config]"
      ).length;
      console.warn(
        `Label extraction mismatch for ${gridUrl} (rows=${rows.length}, cols=${cols.length}, scripts=${scriptCount}, dataAttrs=${dataAttrCount})`
      );
      misses += 1;
      index += 1;
      await sleep(350);
      continue;
    }

    const normalizedRows = rows.map(normalizeLabel);
    const normalizedCols = cols.map(normalizeLabel);

    if (seenGridNumbers.has(index)) {
      console.warn(`Skipping duplicate grid number ${index}`);
      index += 1;
      await sleep(350);
      continue;
    }
    seenGridNumbers.add(index);

    results.push({
      gridNumber: index,
      id,
      url: gridUrl,
      rows: normalizedRows,
      cols: normalizedCols,
      all: [...normalizedRows, ...normalizedCols],
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
    ? [
        ...existing,
        ...results.filter(
          (grid) =>
            !existing.some(
              (entry) =>
                entry.gridNumber === grid.gridNumber || entry.id === grid.id
            )
        ),
      ]
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
