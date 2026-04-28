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

const shortTeamLabel = (title, subtitle) => {
  const cleanTitle = title?.trim();
  const cleanSubtitle = subtitle?.trim();
  if (cleanSubtitle) return cleanSubtitle;
  return cleanTitle ?? "";
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

const gridExtractionError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const gridExtractionErrorWithSummary = (code, message, summary) => {
  const error = gridExtractionError(code, message);
  if (summary) error.summary = summary;
  return error;
};

const parseNuxtArray = ($) => {
  const payload = $("#__NUXT_DATA__").first();
  if (!payload.length) return null;
  const raw = payload.text();
  if (!raw) return null;
  return JSON.parse(raw);
};

const extractGridIdFromUrlLike = (value) => {
  if (!value) return null;
  const match = String(value).match(/(?:grid-|baseball-)(\d+)/i);
  return match ? match[1] : null;
};

const resolveNuxtValue = (value, nuxtArray, seen = new Set()) => {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < nuxtArray.length
  ) {
    if (seen.has(value)) return value;
    seen.add(value);
    return resolveNuxtValue(nuxtArray[value], nuxtArray, seen);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveNuxtValue(entry, nuxtArray, seen));
  }

  return value;
};

const extractLabelValue = (value, nuxtArray) => {
  const resolved = resolveNuxtValue(value, nuxtArray);
  if (typeof resolved === "string") return displayLabelForValue(resolved);
  if (typeof resolved === "number") return String(resolved);
  if (Array.isArray(resolved)) {
    return resolved
      .map((entry) => extractLabelValue(entry, nuxtArray))
      .filter(Boolean)
      .join(" ");
  }
  if (!resolved || typeof resolved !== "object") return "";

  const record = resolved;
  const resolvedTitle = resolveNuxtValue(record.title, nuxtArray);
  const resolvedSubtitle = resolveNuxtValue(record.subtitle, nuxtArray);
  const resolvedShortTitle = resolveNuxtValue(record.shortTitle, nuxtArray);

  if (typeof resolvedTitle === "string") {
    const teamLabel = shortTeamLabel(
      resolvedTitle,
      typeof resolvedSubtitle === "string" ? resolvedSubtitle : undefined
    );
    if (teamLabel) return displayLabelForValue(teamLabel);
    const categoryLabel = shortCategoryLabel(
      resolvedTitle,
      typeof resolvedShortTitle === "string" ? resolvedShortTitle : undefined
    );
    if (categoryLabel) return displayLabelForValue(categoryLabel);
  }

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
    const field = resolveNuxtValue(record[key], nuxtArray);
    if (typeof field === "string") return displayLabelForValue(field);
  }

  return "";
};

const extractLabelArray = (value, nuxtArray) => {
  if (!Array.isArray(value)) return [];
  return uniqueOrdered(value.map((entry) => extractLabelValue(entry, nuxtArray)).filter(Boolean));
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

const extractGridCellAriaLabels = ($) => {
  const root = $(
    "#immaculate-grid, .ig-grid, #immaculate-grid-baseball, .immaculate-grid"
  ).first();
  const scope = root.length ? root : $("body");

  const table = scope.find("table, [role='grid']").first();
  if (!table.length) return { rows: [], cols: [] };

  const rowElements = table.find("tr, [role='row']").get();
  if (rowElements.length < 4) return { rows: [], cols: [] };

  const rows = [];
  const cols = [];

  const cellElements = (rowElement) =>
    $(rowElement)
      .find("th, td, [role='gridcell'], [role='columnheader'], [role='rowheader']")
      .get();

  const firstRowCells = cellElements(rowElements[0]);
  if (firstRowCells.length < 4) return { rows: [], cols: [] };

  for (let i = 1; i < 4; i += 1) {
    const cell = firstRowCells[i];
    const value = displayLabelForValue(
      $(cell).attr("aria-label") || $(cell).text()
    );
    if (!value) return { rows: [], cols: [] };
    cols.push(value);
  }

  for (let i = 1; i < 4; i += 1) {
    const rowCells = cellElements(rowElements[i]);
    if (rowCells.length < 4) return { rows: [], cols: [] };
    const cell = rowCells[0];
    const value = displayLabelForValue(
      $(cell).attr("aria-label") || $(cell).text()
    );
    if (!value) return { rows: [], cols: [] };
    rows.push(value);
  }

  return {
    rows: uniqueOrdered(rows).slice(0, 3),
    cols: uniqueOrdered(cols).slice(0, 3),
  };
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

const extractCanonicalHref = ($) => {
  const candidates = [
    $("link[rel='canonical']").attr("href"),
    $("meta[property='og:url']").attr("content"),
    $("meta[name='twitter:url']").attr("content"),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
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
  const nuxtArray = context.nuxtArray || [];

  const rowsSource = resolveNuxtValue(
    record.verticalItems ||
    record.rows ||
    record.rowItems ||
    record.rowLabels ||
    record.gridRows,
    nuxtArray
  );
  const colsSource = resolveNuxtValue(
    record.horizontalItems ||
    record.cols ||
    record.colItems ||
    record.colLabels ||
    record.gridCols,
    nuxtArray
  );

  if (!Array.isArray(rowsSource) || !Array.isArray(colsSource)) return null;

  const rowsRaw = extractLabelArray(rowsSource, nuxtArray);
  const colsRaw = extractLabelArray(colsSource, nuxtArray);
  const rows = rowsRaw.slice(0, 3);
  const cols = colsRaw.slice(0, 3);
  const resolvedGridId = resolveNuxtValue(record.gridId, nuxtArray);
  const resolvedGridNum = resolveNuxtValue(record.gridNum, nuxtArray);
  const resolvedDisplayName = resolveNuxtValue(record.displayName, nuxtArray);
  const displayName =
    typeof resolvedDisplayName === "string" && resolvedDisplayName.trim()
      ? normalizeLabel(resolvedDisplayName)
      : null;
  const path = extractPathLikeValue(record);
  const canonicalHref = context.canonicalHref || null;
  const piniaKey = context.piniaKey || null;
  const displayGridId = extractGridIdFromDisplayName(displayName);
  const pathGridId = extractGridIdFromUrlLike(path);
  const canonicalGridId = extractGridIdFromUrlLike(canonicalHref);
  const piniaKeyGridId = extractGridIdFromUrlLike(piniaKey);
  const source =
    context.source ||
    (Array.isArray(record.verticalItems) || Array.isArray(record.horizontalItems)
      ? GRID_SOURCES.NUXT_PINIA
      : GRID_SOURCES.OLD_ROWS_COLS);

  let extractedGridId = null;
  if (typeof resolvedGridId === "string" && resolvedGridId.trim()) {
    extractedGridId = resolvedGridId.trim();
  } else if (typeof resolvedGridId === "number" && Number.isFinite(resolvedGridId)) {
    extractedGridId = String(resolvedGridId);
  } else if (typeof resolvedGridNum === "string" && /^\d+$/.test(resolvedGridNum)) {
    extractedGridId = resolvedGridNum;
  } else if (typeof resolvedGridNum === "number" && Number.isFinite(resolvedGridNum)) {
    extractedGridId = String(resolvedGridNum);
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
    strategy: context.strategy || null,
    canonicalHref,
    canonicalGridId,
    pathGridId,
    piniaKeyGridId,
    displayGridId,
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
    strategy: candidate.strategy || null,
    source: candidate.source,
    extractedGridId: candidate.extractedGridId,
    gridNum: candidate.gridNum,
    displayName: candidate.displayName,
    canonicalGridId: candidate.canonicalGridId || null,
    pathGridId: candidate.pathGridId || null,
    piniaKeyGridId: candidate.piniaKeyGridId || null,
    rows: candidate.rows,
    cols: candidate.cols,
  });

const collectNuxtCandidates = (
  node,
  requestedGridId,
  candidates,
  path = [],
  nuxtArray = [],
  canonicalHref = null
) => {
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
        collectNuxtCandidates(
          JSON.parse(trimmed),
          requestedGridId,
          candidates,
          path,
          nuxtArray,
          canonicalHref
        );
      } catch {
        return;
      }
    }
    return;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      collectNuxtCandidates(
        node[i],
        requestedGridId,
        candidates,
        path.concat(String(i)),
        nuxtArray,
        canonicalHref
      );
    }
    return;
  }

  if (typeof node !== "object") return;

  const record = node;
  const candidate = buildCandidateFromRecord(record, requestedGridId, {
    strategy: "nuxt-pinia",
    source:
      Array.isArray(record.verticalItems) || Array.isArray(record.horizontalItems)
        ? GRID_SOURCES.NUXT_PINIA
        : GRID_SOURCES.OLD_ROWS_COLS,
    path: path.join("."),
    nuxtArray,
    canonicalHref,
  });
  if (candidate) candidates.push(candidate);

  if (record.pinia && typeof record.pinia === "object" && !Array.isArray(record.pinia)) {
    const pinia = record.pinia;
    const piniaKey = `${PINIA_PREFIX}${requestedGridId}`;
    if (Object.prototype.hasOwnProperty.call(pinia, piniaKey)) {
      const pinned = resolveNuxtValue(pinia[piniaKey], nuxtArray);
      const pinnedCandidate = buildCandidateFromRecord(pinned, requestedGridId, {
        strategy: "nuxt-pinia",
        source: GRID_SOURCES.NUXT_PINIA,
        piniaKey,
        path: path.concat("pinia", piniaKey).join("."),
        nuxtArray,
        canonicalHref,
      });
      if (pinnedCandidate) candidates.push(pinnedCandidate);
    }
  }

  const directKey = `${PINIA_PREFIX}${requestedGridId}`;
  if (Object.prototype.hasOwnProperty.call(record, directKey)) {
    const pinnedCandidate = buildCandidateFromRecord(
      resolveNuxtValue(record[directKey], nuxtArray),
      requestedGridId,
      {
        strategy: "nuxt-pinia",
        source: GRID_SOURCES.NUXT_PINIA,
        piniaKey: directKey,
        path: path.concat(directKey).join("."),
        nuxtArray,
        canonicalHref,
      }
    );
    if (pinnedCandidate) candidates.push(pinnedCandidate);
  }

  for (const [key, value] of Object.entries(record)) {
    collectNuxtCandidates(
      value,
      requestedGridId,
      candidates,
      path.concat(key),
      nuxtArray,
      canonicalHref
    );
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

const getCandidateIdentitySignals = (candidate) => {
  const signals = [];
  const push = (source, value) => {
    if (!value) return;
    signals.push({ source, value: String(value) });
  };

  push("extractedGridId", candidate.extractedGridId);
  push("gridNum", Number.isFinite(candidate.gridNum) ? candidate.gridNum : null);
  push("canonicalGridId", candidate.canonicalGridId);
  push("pathGridId", candidate.pathGridId);
  push("piniaKeyGridId", candidate.piniaKeyGridId);
  push("displayGridId", candidate.displayGridId);

  return uniqueOrdered(
    signals.map((signal) => `${signal.source}:${signal.value}`)
  ).map((entry) => {
    const [source, value] = entry.split(":");
    return { source, value };
  });
};

const validateCandidateIdentity = (candidate, requestedGridId) => {
  const signals = getCandidateIdentitySignals(candidate);
  const mismatched = signals.find((signal) => signal.value !== requestedGridId);
  if (mismatched) {
    throw gridExtractionError(
      "STALE_GRID_RESPONSE",
      `Stale grid payload for requested ${requestedGridId}: ${mismatched.source}=${mismatched.value}.`
    );
  }

  if (!signals.length) {
    throw gridExtractionError(
      "STALE_GRID_RESPONSE",
      `Unable to determine a stable grid identity for requested ${requestedGridId}.`
    );
  }

  return signals;
};

const validateCandidateLabels = (candidate, requestedGridId) => {
  if (candidate.rows.length !== 3 || candidate.cols.length !== 3) {
    throw gridExtractionError(
      "GRID_LABELS_INCOMPLETE",
      `Grid labels incomplete for ${requestedGridId} (rows=${candidate.rows.length}, cols=${candidate.cols.length}).`
    );
  }

  if (
    candidate.rows.some((label) => !label) ||
    candidate.cols.some((label) => !label)
  ) {
    throw gridExtractionError(
      "GRID_LABELS_INCOMPLETE",
      `Grid ${requestedGridId} contains empty labels.`
    );
  }

  return candidate;
};

const validateExactCandidate = (candidate, requestedGridId) => {
  const warnings = [];
  validateCandidateIdentity(candidate, requestedGridId);
  validateCandidateLabels(candidate, requestedGridId);

  if (candidate.source === GRID_SOURCES.RENDERED_HTML) {
    warnings.push("rendered-html fallback used");
  }

  return {
    ...candidate,
    validationWarnings: warnings,
  };
};

const buildDomCandidate = ({
  requestedGridId,
  displayName,
  canonicalHref,
  rows,
  cols,
  strategy,
}) => {
  const extractedGridId = extractGridIdFromDisplayName(displayName);
  if (!displayName || extractedGridId !== requestedGridId) return null;
  if (!Array.isArray(rows) || !Array.isArray(cols)) return null;
  if (rows.length !== 3 || cols.length !== 3) return null;
  if (rows.some((label) => !label) || cols.some((label) => !label)) return null;

  return {
    requestedGridId,
    extractedGridId,
    gridNum: Number(requestedGridId),
    displayName,
    strategy,
    canonicalHref,
    canonicalGridId: extractGridIdFromUrlLike(canonicalHref),
    pathGridId: null,
    piniaKeyGridId: null,
    displayGridId: extractedGridId,
    rows,
    cols,
    source: GRID_SOURCES.RENDERED_HTML,
    piniaKey: null,
    path: null,
    validationWarnings: [strategy === "grid-cell-aria" ? "grid-cell aria fallback used" : "rendered-html fallback used"],
  };
};

const extractRenderedAsideCandidate = ($, requestedGridId) => {
  const displayName = extractDisplayName($);
  const canonicalHref = extractCanonicalHref($);
  const labels = extractRenderedLabels($);
  return buildDomCandidate({
    requestedGridId,
    displayName,
    canonicalHref,
    rows: labels.rows,
    cols: labels.cols,
    strategy: "rendered-aside",
  });
};

const extractGridCellAriaCandidate = ($, requestedGridId) => {
  const displayName = extractDisplayName($);
  const canonicalHref = extractCanonicalHref($);
  const labels = extractGridCellAriaLabels($);
  return buildDomCandidate({
    requestedGridId,
    displayName,
    canonicalHref,
    rows: labels.rows,
    cols: labels.cols,
    strategy: "grid-cell-aria",
  });
};

const summarizeCandidateForDebug = (candidate) => ({
  strategy: candidate.strategy || candidate.source,
  source: candidate.source,
  extractedGridId: candidate.extractedGridId || null,
  gridNum: Number.isFinite(candidate.gridNum) ? candidate.gridNum : null,
  canonicalGridId: candidate.canonicalGridId || null,
  pathGridId: candidate.pathGridId || null,
  piniaKeyGridId: candidate.piniaKeyGridId || null,
  displayGridId: candidate.displayGridId || null,
  rowsCount: Array.isArray(candidate.rows) ? candidate.rows.length : 0,
  colsCount: Array.isArray(candidate.cols) ? candidate.cols.length : 0,
});

const summarizeFailureForDebug = (candidate, error) => ({
  candidate: summarizeCandidateForDebug(candidate),
  code: error && error.code ? error.code : "UNKNOWN",
});

const collectStrategyCandidates = ($, requestedGridId, nuxtArray, canonicalHref) => {
  const candidates = [];

  if (nuxtArray) {
    collectNuxtCandidates(
      nuxtArray,
      requestedGridId,
      candidates,
      [],
      nuxtArray,
      canonicalHref
    );
  }

  const renderedAsideCandidate = extractRenderedAsideCandidate($, requestedGridId);
  if (renderedAsideCandidate) candidates.push(renderedAsideCandidate);

  const gridCellAriaCandidate = extractGridCellAriaCandidate($, requestedGridId);
  if (gridCellAriaCandidate) candidates.push(gridCellAriaCandidate);

  const strategyPriority = {
    "nuxt-pinia": 0,
    "rendered-aside": 1,
    "grid-cell-aria": 2,
  };

  return dedupeCandidates(
    candidates.sort((a, b) => {
      const aPriority = strategyPriority[a.strategy] ?? 9;
      const bPriority = strategyPriority[b.strategy] ?? 9;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return compareCandidates(a, b);
    })
  );
};

export function extractGridIngestionFromHtml(html, requestedGridId) {
  if (!requestedGridId || !/^\d+$/.test(String(requestedGridId))) {
    throw new Error("A numeric requestedGridId is required.");
  }
  const normalizedRequestedGridId = String(requestedGridId);
  const $ = cheerio.load(html);
  const canonicalHref = extractCanonicalHref($);

  let nuxtArray = null;
  try {
    const parsed = parseNuxtArray($);
    if (Array.isArray(parsed)) nuxtArray = parsed;
  } catch {
    throw new Error("Failed to parse __NUXT_DATA__ JSON payload.");
  }

  const candidates = collectStrategyCandidates(
    $,
    normalizedRequestedGridId,
    nuxtArray,
    canonicalHref
  );
  const failures = [];

  for (const candidate of candidates) {
    try {
      const selected = validateExactCandidate(candidate, normalizedRequestedGridId);
      return {
        requestedGridId: normalizedRequestedGridId,
        extractedGridId: selected.extractedGridId,
        gridNum: selected.gridNum,
        displayName: selected.displayName,
        canonicalHref: selected.canonicalHref || canonicalHref || undefined,
        rows: selected.rows,
        cols: selected.cols,
        source: selected.source,
        strategy: selected.strategy || undefined,
        piniaKey: selected.piniaKey || undefined,
        path: selected.path || undefined,
        validationWarnings: uniqueOrdered(selected.validationWarnings),
        date: null,
      };
    } catch (error) {
      if (
        error &&
        (error.code === "STALE_GRID_RESPONSE" ||
          error.code === "GRID_LABELS_INCOMPLETE")
      ) {
        failures.push(summarizeFailureForDebug(candidate, error));
        continue;
      }
      throw error;
    }
  }

  throw gridExtractionErrorWithSummary(
    "GRID_EXTRACTION_FAILED",
    `Unable to extract a stable grid payload for requested ${normalizedRequestedGridId}.`,
    {
      requestedGridId: normalizedRequestedGridId,
      canonicalGridId: extractGridIdFromUrlLike(canonicalHref),
      candidateCount: candidates.length,
      failures,
    }
  );
}
