import * as cheerio from "cheerio";

export const GRID_SOURCES = {
  NUXT_PINIA: "nuxt-pinia",
  OLD_ROWS_COLS: "old-rows-cols",
  RENDERED_HTML: "rendered-html",
};

const PINIA_PREFIX = "baseball-";
const GRID_TITLE_RE = /Grid #(\d+)/i;

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

const displayLabelForValue = (value) => {
  const normalized = normalizeLabel(value);
  if (!normalized) return normalized;
  const directTeam = TEAM_ABBREV_MAP[normalized];
  if (directTeam) return directTeam;
  const lower = normalized.toLowerCase();
  if (CATEGORY_KEY_MAP[normalized]) return CATEGORY_KEY_MAP[normalized];
  if (CATEGORY_KEY_MAP[lower]) return CATEGORY_KEY_MAP[lower];
  return normalized;
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

const parseNuxtArray = ($) => {
  const payload = $("#__NUXT_DATA__").first();
  if (!payload.length) return null;
  const raw = payload.text();
  if (!raw) return null;
  return JSON.parse(raw);
};

const extractLabelValue = (value) => {
  if (typeof value === "string") return displayLabelForValue(value);
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";

  const record = value;
  for (const key of [
    "key",
    "label",
    "title",
    "name",
    "displayName",
    "text",
    "shortLabel",
    "value",
  ]) {
    if (typeof record[key] === "string") return displayLabelForValue(record[key]);
  }

  return "";
};

const extractLabelArray = (value) => {
  if (!Array.isArray(value)) return [];
  return uniqueOrdered(value.map(extractLabelValue).filter(Boolean));
};


const extractRenderedLabels = ($) => {
  const root = $(
    "#immaculate-grid, .ig-grid, #immaculate-grid-baseball, .immaculate-grid"
  ).first();
  const scope = root.length ? root : $("body");

  const rowSelectors = [
    'aside[aria-label="Grid Row Categories"] dfn',
    'aside[aria-label="Grid Row Categories"]',
    ".ig-grid .ig-row-header",
    ".ig-grid .ig-row-label",
    ".ig-grid [data-row-label]",
    ".ig-grid [data-row]",
    ".immaculate-grid .row-label",
    "[data-row-label]",
    "[data-row]",
  ];

  const colSelectors = [
    'aside[aria-label="Grid Column Categories"] dfn',
    'aside[aria-label="Grid Column Categories"]',
    ".ig-grid .ig-col-header",
    ".ig-grid .ig-col-label",
    ".ig-grid [data-col-label]",
    ".ig-grid [data-col]",
    ".immaculate-grid .col-label",
    "[data-col-label]",
    "[data-col]",
  ];

  const collect = (selectors) => {
    const values = [];
    for (const selector of selectors) {
      values.push(
        ...scope
          .find(selector)
          .map((_, el) => displayLabelForValue($(el).text()))
          .get()
      );
    }
    return uniqueOrdered(values).slice(0, 3);
  };

  return { rows: collect(rowSelectors), cols: collect(colSelectors) };
};

const extractDisplayName = ($) => {
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    $("title").text(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeLabel(candidate);
    if (GRID_TITLE_RE.test(normalized)) return normalized;
  }

  return null;
};

const extractGridIdFromDisplayName = (value) => {
  if (!value) return null;
  const match = String(value).match(GRID_TITLE_RE);
  return match ? match[1] : null;
};

const extractPathLikeValue = (record) => {
  for (const key of ["path", "pathname", "url", "href"]) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key].trim();
    }
  }
  return null;
};

const buildCandidateFromRecord = (
  record,
  requestedGridId,
  context = {}
) => {
  if (!record || typeof record !== "object") return null;

  const rowsSource =
    record.verticalItems ||
    record.rows ||
    record.rowItems ||
    record.rowLabels ||
    record.gridRows;
  const colsSource =
    record.horizontalItems ||
    record.cols ||
    record.colItems ||
    record.colLabels ||
    record.gridCols;

  if (!Array.isArray(rowsSource) || !Array.isArray(colsSource)) return null;

  const rowsRaw = extractLabelArray(rowsSource);
  const colsRaw = extractLabelArray(colsSource);
  const rows = rowsRaw.slice(0, 3);
  const cols = colsRaw.slice(0, 3);
  const displayName =
    typeof record.displayName === "string" && record.displayName.trim()
      ? normalizeLabel(record.displayName)
      : null;
  const path = extractPathLikeValue(record);
  const piniaKey = context.piniaKey || null;
  const source =
    context.source ||
    (Array.isArray(record.verticalItems) || Array.isArray(record.horizontalItems)
      ? GRID_SOURCES.NUXT_PINIA
      : GRID_SOURCES.OLD_ROWS_COLS);

  let extractedGridId = null;
  if (typeof record.gridId === "string" && record.gridId.trim()) {
    extractedGridId = record.gridId.trim();
  } else if (
    typeof record.gridId === "number" &&
    Number.isFinite(record.gridId)
  ) {
    extractedGridId = String(record.gridId);
  } else if (
    typeof record.gridNum === "string" &&
    /^\d+$/.test(record.gridNum)
  ) {
    extractedGridId = record.gridNum;
  } else if (
    typeof record.gridNum === "number" &&
    Number.isFinite(record.gridNum)
  ) {
    extractedGridId = String(record.gridNum);
  } else if (displayName) {
    extractedGridId = extractGridIdFromDisplayName(displayName);
  }

  if (!extractedGridId && piniaKey === `${PINIA_PREFIX}${requestedGridId}`) {
    extractedGridId = requestedGridId;
  }

  const gridNum =
    extractedGridId && /^\d+$/.test(extractedGridId)
      ? Number(extractedGridId)
      : null;

  return {
    requestedGridId,
    extractedGridId,
    gridNum,
    displayName,
    rows,
    cols,
    source,
    piniaKey,
    path,
    validationWarnings: [],
  };
};

const fingerprintCandidate = (candidate) =>
  JSON.stringify({
    extractedGridId: candidate.extractedGridId,
    gridNum: candidate.gridNum,
    displayName: candidate.displayName,
    rows: candidate.rows,
    cols: candidate.cols,
  });

const collectNuxtCandidates = (node, requestedGridId, candidates, path = []) => {
  if (node == null) return;

  if (typeof node === "string") {
    const trimmed = node.trim();
    if (!trimmed) return;
    if (
      trimmed.includes(`"gridId":"${requestedGridId}"`) ||
      trimmed.includes(`"gridNum":${requestedGridId}`) ||
      trimmed.includes(`"baseball-${requestedGridId}"`) ||
      trimmed.includes('"rows":') ||
      trimmed.includes('"cols":') ||
      trimmed.includes('"verticalItems":') ||
      trimmed.includes('"horizontalItems":')
    ) {
      try {
        collectNuxtCandidates(JSON.parse(trimmed), requestedGridId, candidates, path);
      } catch {
        return;
      }
    }
    return;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      collectNuxtCandidates(node[i], requestedGridId, candidates, path.concat(String(i)));
    }
    return;
  }

  if (typeof node !== "object") return;

  const record = node;
  const candidate = buildCandidateFromRecord(record, requestedGridId, {
    source:
      Array.isArray(record.verticalItems) || Array.isArray(record.horizontalItems)
        ? GRID_SOURCES.NUXT_PINIA
        : GRID_SOURCES.OLD_ROWS_COLS,
    path: path.join("."),
  });
  if (candidate) candidates.push(candidate);

  if (record.pinia && typeof record.pinia === "object" && !Array.isArray(record.pinia)) {
    const pinia = record.pinia;
    const piniaKey = `${PINIA_PREFIX}${requestedGridId}`;
    if (Object.prototype.hasOwnProperty.call(pinia, piniaKey)) {
      const pinned = pinia[piniaKey];
      const pinnedCandidate = buildCandidateFromRecord(pinned, requestedGridId, {
        source: GRID_SOURCES.NUXT_PINIA,
        piniaKey,
        path: path.concat("pinia", piniaKey).join("."),
      });
      if (pinnedCandidate) candidates.push(pinnedCandidate);
    }
  }

  const directKey = `${PINIA_PREFIX}${requestedGridId}`;
  if (
    Object.prototype.hasOwnProperty.call(record, directKey) &&
    typeof record[directKey] === "object"
  ) {
    const pinnedCandidate = buildCandidateFromRecord(record[directKey], requestedGridId, {
      source: GRID_SOURCES.NUXT_PINIA,
      piniaKey: directKey,
      path: path.concat(directKey).join("."),
    });
    if (pinnedCandidate) candidates.push(pinnedCandidate);
  }

  for (const [key, value] of Object.entries(record)) {
    collectNuxtCandidates(value, requestedGridId, candidates, path.concat(key));
  }
};

const dedupeCandidates = (candidates) => {
  const seen = new Set();
  const result = [];
  for (const candidate of candidates) {
    const fingerprint = fingerprintCandidate(candidate);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(candidate);
  }
  return result;
};

const compareCandidates = (a, b) => {
  const priority = {
    [GRID_SOURCES.NUXT_PINIA]: 0,
    [GRID_SOURCES.OLD_ROWS_COLS]: 1,
    [GRID_SOURCES.RENDERED_HTML]: 2,
  };
  const aPriority = priority[a.source] ?? 9;
  const bPriority = priority[b.source] ?? 9;
  if (aPriority !== bPriority) return aPriority - bPriority;
  if (a.rows.length !== b.rows.length) return b.rows.length - a.rows.length;
  if (a.cols.length !== b.cols.length) return b.cols.length - a.cols.length;
  return 0;
};

const validateExactCandidate = (candidate, requestedGridId) => {
  const warnings = [];

  if (!candidate.extractedGridId) {
    throw new Error(
      `Unable to determine a grid id for requested grid ${requestedGridId}.`
    );
  }
  if (candidate.extractedGridId !== requestedGridId) {
    throw new Error(
      `Grid id mismatch: requested ${requestedGridId} but extracted ${candidate.extractedGridId}.`
    );
  }

  if (candidate.displayName) {
    const displayId = extractGridIdFromDisplayName(candidate.displayName);
    if (displayId && displayId !== requestedGridId) {
      throw new Error(
        `Display name mismatch: requested ${requestedGridId} but displayName was ${candidate.displayName}.`
      );
    }
  }

  if (candidate.piniaKey && candidate.piniaKey !== `${PINIA_PREFIX}${requestedGridId}`) {
    throw new Error(
      `Pinia key mismatch: requested ${requestedGridId} but found ${candidate.piniaKey}.`
    );
  }

  if (candidate.path) {
    const pathMatch = candidate.path.match(/grid-(\d+)/i);
    if (pathMatch && pathMatch[1] !== requestedGridId) {
      throw new Error(
        `Path mismatch: requested ${requestedGridId} but found ${candidate.path}.`
      );
    }
  }

  if (candidate.rows.length !== 3 || candidate.cols.length !== 3) {
    throw new Error(
      `Grid labels incomplete for ${requestedGridId} (rows=${candidate.rows.length}, cols=${candidate.cols.length}).`
    );
  }

  if (
    candidate.rows.some((label) => !label) ||
    candidate.cols.some((label) => !label)
  ) {
    throw new Error(`Grid ${requestedGridId} contains empty labels.`);
  }

  if (candidate.source === GRID_SOURCES.RENDERED_HTML) {
    warnings.push("rendered-html fallback used");
  }

  return {
    ...candidate,
    validationWarnings: warnings,
  };
};

const extractRenderedCandidate = ($, requestedGridId) => {
  const displayName = extractDisplayName($);
  const extractedGridId = extractGridIdFromDisplayName(displayName);
  if (!displayName || extractedGridId !== requestedGridId) return null;

  const labels = extractRenderedLabels($);
  if (labels.rows.length !== 3 || labels.cols.length !== 3) return null;

  if (labels.rows.some((label) => !label) || labels.cols.some((label) => !label)) {
    return null;
  }

  return {
    requestedGridId,
    extractedGridId,
    gridNum: Number(requestedGridId),
    displayName,
    rows: labels.rows,
    cols: labels.cols,
    source: GRID_SOURCES.RENDERED_HTML,
    piniaKey: null,
    path: null,
    validationWarnings: ["rendered-html fallback used"],
  };
};

export function extractGridIngestionFromHtml(html, requestedGridId) {
  if (!requestedGridId || !/^\d+$/.test(String(requestedGridId))) {
    throw new Error("A numeric requestedGridId is required.");
  }
  const normalizedRequestedGridId = String(requestedGridId);
  const $ = cheerio.load(html);

  let nuxtArray = null;
  try {
    const parsed = parseNuxtArray($);
    if (Array.isArray(parsed)) nuxtArray = parsed;
  } catch {
    throw new Error("Failed to parse __NUXT_DATA__ JSON payload.");
  }

  const payloadCandidates = [];
  if (nuxtArray) {
    collectNuxtCandidates(nuxtArray, normalizedRequestedGridId, payloadCandidates);
  }

  const dedupedPayloadCandidates = dedupeCandidates(payloadCandidates);
  const exactPayloadCandidates = dedupedPayloadCandidates.filter(
    (candidate) => candidate.extractedGridId === normalizedRequestedGridId
  );

  if (dedupedPayloadCandidates.length) {
    if (!exactPayloadCandidates.length) {
      const extractedIds = dedupedPayloadCandidates
        .map((candidate) => candidate.extractedGridId)
        .filter(Boolean);
      throw new Error(
        `Stale or mismatched grid payload for requested ${normalizedRequestedGridId}: found ${uniqueOrdered(extractedIds).join(", ") || "no exact grid id"}.`
      );
    }

    const orderedExactCandidates = exactPayloadCandidates.slice().sort(compareCandidates);
    const selected = validateExactCandidate(
      orderedExactCandidates[0],
      normalizedRequestedGridId
    );

    for (const candidate of orderedExactCandidates.slice(1)) {
      const compare = fingerprintCandidate(candidate);
      if (compare !== fingerprintCandidate(selected)) {
        throw new Error(
          `Conflicting exact grid payloads found for requested ${normalizedRequestedGridId}.`
        );
      }
    }

    const warnings = [...selected.validationWarnings];
    if (orderedExactCandidates.length > 1) {
      warnings.push(
        `multiple exact payloads matched; selected ${selected.source}`
      );
    }

    return {
      requestedGridId: normalizedRequestedGridId,
      extractedGridId: selected.extractedGridId,
      gridNum: selected.gridNum,
      displayName: selected.displayName,
      rows: selected.rows,
      cols: selected.cols,
      source: selected.source,
      piniaKey: selected.piniaKey || undefined,
      path: selected.path || undefined,
      validationWarnings: uniqueOrdered(warnings),
      date: null,
    };
  }

  const renderedCandidate = extractRenderedCandidate($, normalizedRequestedGridId);
  if (renderedCandidate) {
    return {
      requestedGridId: normalizedRequestedGridId,
      extractedGridId: renderedCandidate.extractedGridId,
      gridNum: renderedCandidate.gridNum,
      displayName: renderedCandidate.displayName,
      rows: renderedCandidate.rows,
      cols: renderedCandidate.cols,
      source: renderedCandidate.source,
      piniaKey: undefined,
      path: undefined,
      validationWarnings: uniqueOrdered(renderedCandidate.validationWarnings),
      date: null,
    };
  }

  throw new Error(
    `Unable to extract a stable grid payload for requested ${normalizedRequestedGridId}.`
  );
}
