import fs from "node:fs";
import path from "node:path";
import { load } from "cheerio";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "data", "team-aliases.json");
const SOURCE_URL = "https://www.baseball-reference.com/about/team_IDs.shtml";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const shortTeamLabel = (fullName) => {
  const cleaned = normalizeWhitespace(fullName);
  const overrides = {
    "Arizona Diamondbacks": "D'backs",
  };
  if (overrides[cleaned]) return overrides[cleaned];
  if (cleaned.includes("Angels")) return "Angels";
  if (cleaned.includes("Athletics")) return "Athletics";
  if (
    cleaned.endsWith("Red Sox") ||
    cleaned.endsWith("White Sox") ||
    cleaned.endsWith("Blue Jays")
  ) {
    const parts = cleaned.split(" ");
    return parts.slice(-2).join(" ");
  }
  const parts = cleaned.split(" ");
  return parts[parts.length - 1] || cleaned;
};

const response = await fetch(SOURCE_URL, {
  headers: {
    "User-Agent": USER_AGENT,
    Accept: "text/html",
  },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error(`Failed to fetch team IDs (${response.status}).`);
}

const html = await response.text();
const $ = load(html);

const table = $("table")
  .filter((_, el) => {
    const headers = $(el)
      .find("tr")
      .first()
      .find("th, td")
      .map((_, cell) => normalizeWhitespace($(cell).text()).toLowerCase())
      .get();
    return headers.includes("franchise id") && headers.includes("team id");
  })
  .first();

if (!table.length) {
  throw new Error("Could not find the team ID table in the upstream HTML.");
}

const rows = table.find("tr").slice(1);
const records = [];
rows.each((_, row) => {
  const cells = $(row)
    .find("td")
    .map((_, td) => normalizeWhitespace($(td).text()))
    .get();
  if (cells.length < 5) return;
  const [franchiseId, teamId, fullName, firstYear, lastYear] = cells;
  if (!franchiseId || !teamId || !fullName) return;
  const last =
    lastYear.toLowerCase() === "present"
      ? 9999
      : Number.parseInt(lastYear, 10);
  records.push({
    franchiseId,
    teamId,
    fullName,
    lastYear: Number.isNaN(last) ? 0 : last,
    firstYear,
    lastYearRaw: lastYear,
  });
});

const franchiseLatest = new Map();
for (const record of records) {
  const current = franchiseLatest.get(record.franchiseId);
  if (!current || record.lastYear >= current.lastYear) {
    franchiseLatest.set(record.franchiseId, record);
  }
}

const aliasMap = {};
const aliasYear = {};
for (const record of records) {
  const latest = franchiseLatest.get(record.franchiseId) || record;
  const label = shortTeamLabel(latest.fullName);
  if (!label) continue;
  const teamId = record.teamId.toLowerCase();
  const currentYear = aliasYear[teamId] ?? -1;
  if (latest.lastYear >= currentYear) {
    aliasMap[teamId] = [label.toLowerCase()];
    aliasYear[teamId] = latest.lastYear;
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(aliasMap, null, 2));
console.log(`Wrote ${Object.keys(aliasMap).length} team aliases to ${OUTPUT}`);
