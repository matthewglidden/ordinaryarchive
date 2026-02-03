import * as cheerio from "cheerio";

type GridLabel = { key: string; label: string };

export type GridMeta = {
  gridId: string;
  displayName?: string;
  date?: string;
  rows: GridLabel[];
  cols: GridLabel[];
};

const normalizeLabel = (value: string) =>
  value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();

const uniqueOrdered = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

const shortTeamLabel = (title?: string, subtitle?: string) => {
  const cleanTitle = title?.trim();
  const cleanSubtitle = subtitle?.trim();
  if (cleanSubtitle) return cleanSubtitle;
  return cleanTitle ?? "";
};

const CATEGORY_TITLE_MAP: Record<string, string> = {
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

const normalizeCategoryTitle = (title: string) => {
  const cleaned = title
    .replace(/\\u2264/g, "≤")
    .replace(/\\u2011|\\u2013|\\u2014/g, "-")
    .replace(/\\s+/g, " ")
    .trim();
  const upper = cleaned.toUpperCase();
  return CATEGORY_TITLE_MAP[upper] || cleaned;
};

const shortCategoryLabel = (title?: string, shortTitle?: string) => {
  const preferred = shortTitle?.trim() || title?.trim();
  if (!preferred) return "";
  const trimmed = preferred.replace(/\\s+Awards?$/i, "").replace(/\\s+Award$/i, "");
  return normalizeCategoryTitle(trimmed);
};

const TEAM_ABBREV_MAP: Record<string, string> = {
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

const CATEGORY_KEY_MAP: Record<string, string> = {
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

const fallbackCategoryLabel = (key: string) => {
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

  const numericMap: Array<[RegExp, string]> = [
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
const extractDomLabels = ($: cheerio.CheerioAPI) => {
  const root = $(
    "#immaculate-grid, .ig-grid, #immaculate-grid-baseball, .immaculate-grid"
  ).first();
  const scope = root.length ? root : $("body");

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

  const collect = (selectors: string[]) => {
    const values: string[] = [];
    for (const selector of selectors) {
      values.push(
        ...scope
          .find(selector)
          .map((_, el) => normalizeLabel($(el).text()))
          .get()
      );
    }
    return uniqueOrdered(values).slice(0, 3);
  };

  return { rows: collect(rowSelectors), cols: collect(colSelectors) };
};

const parseNuxtArray = ($: cheerio.CheerioAPI) => {
  const payload = $("#__NUXT_DATA__").first();
  if (!payload.length) return null;
  const raw = payload.text();
  if (!raw) return null;
  return JSON.parse(raw);
};

const hasBaseballReferenceLink = (value: unknown): boolean => {
  if (!value) return false;
  if (typeof value === "string") {
    return value.includes("baseball-reference.com");
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasBaseballReferenceLink(entry));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      hasBaseballReferenceLink(entry)
    );
  }
  return false;
};

const isBaseballGridObject = (gridObject: Record<string, unknown>) => {
  const key =
    typeof gridObject.localStorageKey === "string"
      ? gridObject.localStorageKey
      : "";
  if (key) {
    if (/(basketball|football|hockey|womens|mens)/i.test(key)) return false;
    if (/-sr(-\\d+)?$/.test(key)) return true;
  }
  if (
    gridObject.possibleAnswers &&
    hasBaseballReferenceLink(gridObject.possibleAnswers)
  ) {
    return true;
  }
  return false;
};

const findGridBlobs = (nuxtArray: unknown[], gridIdHint?: string) => {
  const stringNodes = nuxtArray.filter(
    (entry): entry is string => typeof entry === "string"
  );
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

const labelTeamKeys = (
  record: Record<string, unknown>,
  teamMap: Map<string, string>,
  label?: string
) => {
  const keys = [
    record.teamId,
    record.abbrev,
    record.abbreviation,
    record.code,
    record.shortName,
    record.slug,
  ].filter((value): value is string => typeof value === "string");

  if (!keys.length) return false;

  if (label) {
    for (const key of keys) {
      if (!teamMap.has(key)) teamMap.set(key, label);
    }
  }

  return true;
};

const buildLabelMaps = (nuxtArray: unknown[]) => {
  const teamMap = new Map<string, string>();
  const categoryMap = new Map<string, string>();

  for (const entry of nuxtArray) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

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

const mapKeysToLabels = (
  keys: string[],
  teamMap: Map<string, string>,
  categoryMap: Map<string, string>
): GridLabel[] =>
  keys.slice(0, 3).map((key) => {
    const teamLabel = teamMap.get(key) || TEAM_ABBREV_MAP[key];
    const categoryLabel = categoryMap.get(key) || fallbackCategoryLabel(key);
    const label = teamLabel || categoryLabel || key;
    return { key, label };
  });

export async function extractGridMetaFromHtml(
  html: string,
  gridIdHint?: string
): Promise<GridMeta> {
  const $ = cheerio.load(html);
  const domLabels = extractDomLabels($);

  if (domLabels.rows.length === 3 && domLabels.cols.length === 3) {
    const gridId = gridIdHint ?? "unknown";
    return {
      gridId,
      rows: domLabels.rows.map((label) => ({ key: label, label })),
      cols: domLabels.cols.map((label) => ({ key: label, label })),
    };
  }

  let nuxtArray: unknown[] | null = null;
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

  let gridObject: Record<string, unknown> | null = null;
  for (const blob of blobs) {
    try {
      const parsed = JSON.parse(blob) as Record<string, unknown>;
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
    throw new Error("Grid is not a baseball grid.");
  }

  const rows = Array.isArray(gridObject.rows)
    ? gridObject.rows.filter((value) => typeof value === "string")
    : [];
  const cols = Array.isArray(gridObject.cols)
    ? gridObject.cols.filter((value) => typeof value === "string")
    : [];

  const { teamMap, categoryMap } = buildLabelMaps(nuxtArray);
  const mappedRows = mapKeysToLabels(rows as string[], teamMap, categoryMap);
  const mappedCols = mapKeysToLabels(cols as string[], teamMap, categoryMap);

  if (mappedRows.length !== 3 || mappedCols.length !== 3) {
    throw new Error(
      `Grid labels incomplete (rows=${mappedRows.length}, cols=${mappedCols.length}).`
    );
  }

  const gridId =
    (typeof gridObject.gridId === "string" && gridObject.gridId) ||
    gridIdHint ||
    "unknown";

  const displayName =
    typeof gridObject.displayName === "string"
      ? gridObject.displayName
      : undefined;

  const date =
    typeof gridObject.date === "string" ? gridObject.date : undefined;

  return {
    gridId,
    displayName,
    date,
    rows: mappedRows,
    cols: mappedCols,
  };
}
