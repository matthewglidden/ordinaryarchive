"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import gridsData from "@/data/grids.json";
import teamAliases from "@/data/team-aliases.json";

type Grid = {
  gridNumber?: number;
  id: string;
  url: string;
  rows: string[];
  cols: string[];
  all: string[];
  hints?: string[];
  searchTerms?: string[];
};

const grids = gridsData as Grid[];
const teamAliasMap = teamAliases as Record<string, string[]>;
const TEAM_ALIAS_LABELS = new Set(
  Object.values(teamAliasMap).flat().map((label) => label.toLowerCase())
);

export default function HomeClient() {
  const [query, setQuery] = useState("");
  const [exactOnly, setExactOnly] = useState(false);
  const [scope, setScope] = useState<"all" | "rows" | "cols">("all");
  const [intersectOnly, setIntersectOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedBorn, setSelectedBorn] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const didInitFromUrl = useRef(false);
  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabel = `${monthNames[today.getMonth()]} ${today.getDate()}`;

  useEffect(() => {
    if (didInitFromUrl.current) return;
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    didInitFromUrl.current = true;
  }, [searchParams]);

  const sortedGrids = useMemo(() => {
    const next = [...grids].sort((a, b) => b.id.localeCompare(a.id));
    return sortOrder === "oldest" ? next.reverse() : next;
  }, [sortOrder]);

  const normalizedQuery = query.trim().toLowerCase();
  const baseTokens = useMemo(
    () => (normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : []),
    [normalizedQuery]
  );
  const isTodayFilterActive = useMemo(
    () => baseTokens.includes(`date:${monthDay}`),
    [baseTokens, monthDay]
  );
  const isSpecialFilterActive = useMemo(
    () => baseTokens.includes("has:hint"),
    [baseTokens]
  );
  const toggleFilterToken = (token: string) => {
    if (!baseTokens.length) {
      setQuery(token);
      return;
    }
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    if (tokens.includes(token)) {
      const next = tokens.filter((value) => value !== token).join(" ");
      setQuery(next);
      return;
    }
    setQuery([...tokens, token].join(" "));
  };
  const tokenGroups = useMemo(() => {
    if (!normalizedQuery) return [];
    const groups: string[][] = [];
    const aliasMap: Record<string, string[]> = {
      ...(teamAliases as Record<string, string[]>),
      can: ["canada"],
      boston: ["red sox"],
      canada: ["can"],
      cub: ["cuba"],
      cuba: ["cub"],
      dom: ["dominican", "dominican republic", "dr"],
      dr: ["dominican", "dominican republic", "dom"],
      dominican: ["dominican republic", "dr", "dom"],
      jpn: ["japan"],
      japan: ["jpn"],
      mex: ["mexico"],
      mexico: ["mex"],
      pri: ["puerto", "puerto rico", "pr"],
      pr: ["puerto rico", "puerto"],
      puerto: ["puerto rico", "pr", "pri"],
      "puerto rico": ["pr", "pri", "puerto"],
      usa: ["us", "united states", "u.s."],
      us: ["usa", "united states", "u.s."],
      "u.s.": ["usa", "united states", "us"],
      "united states": ["usa", "us", "u.s."],
      ven: ["venezuela"],
      venezuela: ["ven"],
      ngl: ["negro leagues", "negro league", "nlb"],
      nlb: ["negro leagues", "negro league", "ngl"],
      "played ngl": ["ngl"],
      negro: ["negro leagues", "negro league", "ngl"],
      "negro league": ["negro leagues", "ngl"],
      "negro leagues": ["negro league", "ngl"],
      "outside usa": ["non-us", "foreign", "international", "intl"],
      "non-us": ["outside usa", "foreign", "international", "intl"],
      foreign: ["outside usa", "international", "intl"],
      international: ["outside usa", "foreign", "intl"],
      intl: ["outside usa", "foreign", "international"],
      ny: ["yankees", "mets"],
      nyc: ["yankees", "mets"],
      sf: ["giants"],
      tb: ["rays"],
      dc: ["nationals", "nats"],
      wash: ["nationals", "nats"],
      chi: ["cubs", "white sox", "sox"],
      stl: ["cardinals", "cards"],
      az: ["diamondbacks", "dbacks"],
      diamondbacks: ["d'backs", "dbacks"],
      diamond: ["diamondbacks", "d'backs", "dbacks"],
      "d'backs": ["diamondbacks", "dbacks"],
      dbacks: ["diamondbacks", "d'backs"],
      co: ["rockies"],
      tx: ["rangers"],
      fl: ["marlins"],
      wi: ["brewers"],
      pa: ["phillies", "pirates"],
      poop: ["phillies", "pirates"],
      p00p: ["phillies", "pirates"],
      sox: ["red sox", "white sox"],
      barves: ["braves"],
      yanks: ["yankees"],
      jankees: ["yankees"],
      mets: ["mets"],
      cards: ["cardinals"],
      jays: ["blue jays"],
      as: ["athletics", "a's"],
      "a's": ["athletics", "as"],
      athletics: ["athletics", "as"],
      nats: ["nationals"],
      giants: ["giants"],
      bucs: ["pirates"],
      halo: ["angels"],
      halos: ["angels"],
      "hall of fame": ["hof"],
      hof: ["hall of fame"],
      "rookie of the year": ["roy", "roty"],
      roty: ["roy", "rookie of the year"],
      roy: ["rookie of the year", "roty"],
      "cy young": ["cy", "cya"],
      cya: ["cy", "cy young"],
      "home runs": ["hr", "homers"],
      homers: ["hr", "home runs"],
      hr: ["home runs", "homers"],
      "stolen bases": ["sb", "steals"],
      steals: ["sb", "stolen bases"],
      stolen: ["30+ sb"],
      sb: ["stolen bases", "steals"],
      strikeouts: ["k", "so"],
      so: ["k", "strikeouts"],
      k: ["so", "strikeouts"],
      saves: ["sv"],
      sv: ["saves"],
      save: ["30+ sv"],
      doubles: ["2b"],
      "batting avg": [".300", "avg", "batting average"],
      "batting average": [".300", "avg", "batting avg"],
      avg: [".300", "batting avg", "batting average"],
      ".300": ["avg", "batting avg"],
      "no hitter": ["no-hitter", "nohit", "no hit"],
      "no-hitter": ["no hitter", "nohit", "no hit"],
      "no hit": ["no hitter", "no-hitter", "nohit"],
      nohit: ["no hitter", "no-hitter", "no hit"],
      christmas: ["date:12-25"],
      xmas: ["date:12-25"],
      catcher: ["c"],
      backstop: ["c"],
      shortstop: ["ss"],
      short: ["ss"],
      ss: ["silver slugger"],
      "first base": ["1b"],
      first: ["1b"],
      "second base": ["2b"],
      second: ["2b"],
      "third base": ["3b"],
      third: ["3b"],
      "center field": ["cf"],
      center: ["cf"],
      "left field": ["lf"],
      left: ["lf"],
      "right field": ["rf"],
      right: ["rf"],
      outfield: ["of"],
      outfielder: ["of"],
      pitcher: ["p"],
      pitched: ["p"],
      "designated hitter": ["dh"],
      gold: ["gold glove", "gg"],
      slugger: ["silver slugger", "ss"],
      hall: ["hof"],
      rookie: ["roy", "roty"],
      "all star": ["all-star", "asg", "as"],
      "all-star": ["all star", "asg", "as"],
      asg: ["all star", "all-star", "as"],
      major: ["mlb", "major league", "major leagues"],
      "major league": ["mlb", "major leagues"],
      "major leagues": ["mlb", "major league"],
      "played mlb": ["mlb"],
      wins: ["w"],
      strikeout: ["k", "so", "strikeouts"],
      ks: ["k", "so"],
      "k's": ["k", "so"],
      "k’s": ["k", "so"],
      homer: ["hr", "home runs"],
      only: ["one team"],
      hits: ["h"],
      runs: ["r"],
      rbis: ["rbi"],
      "no-no": ["no-hitter", "no hitter", "nohit"],
      "30-30": ["30/30"],
      ws: ["world series", "world", "champ"],
      "world series": ["ws", "world", "champ"],
      world: ["world series", "ws", "champ"],
      champ: ["world series", "ws", "world"],
      "<": ["≤3 era season", "≤3 era career"],
      "<=": ["≤3 era season", "≤3 era career"],
      "<=3": ["≤3 era season", "≤3 era career"],
      "<3": ["≤3 era season", "≤3 era career"],
    };

    const skipTokens = new Set<string>();
    const phraseAliases = Object.entries(teamAliasMap).filter(([key]) =>
      key.includes(" ")
    );
    for (const [phrase, aliases] of phraseAliases) {
      if (!normalizedQuery.includes(phrase)) continue;
      groups.push([...aliases]);
      for (const token of phrase.split(/\s+/)) {
        if (token) skipTokens.add(token);
      }
    }
    if (normalizedQuery.includes("poop") || normalizedQuery.includes("p00p")) {
      groups.push(["phillies"]);
      groups.push(["pirates"]);
      skipTokens.add("poop");
      skipTokens.add("p00p");
    }

    if (normalizedQuery.includes("played mlb")) {
      groups.push(["mlb"]);
      skipTokens.add("played");
      skipTokens.add("mlb");
    }
    if (normalizedQuery.includes("played ngl")) {
      groups.push(["ngl"]);
      skipTokens.add("played");
      skipTokens.add("ngl");
    }
    if (normalizedQuery.includes("april fools day")) {
      groups.push(["date:04-01"]);
      skipTokens.add("april");
      skipTokens.add("fools");
      skipTokens.add("day");
    } else if (normalizedQuery.includes("april fools")) {
      groups.push(["date:04-01"]);
      skipTokens.add("april");
      skipTokens.add("fools");
    }

    for (const token of baseTokens) {
      if (skipTokens.has(token)) continue;
      const expanded = new Set<string>();
      const lowered = token.toLowerCase();
      const teamAliasesFor = teamAliasMap[lowered];
      if (teamAliasesFor) {
        for (const alias of teamAliasesFor) {
          expanded.add(alias);
        }
        groups.push(Array.from(expanded));
        continue;
      }
      expanded.add(token);
      const noCommas = lowered.replace(/,/g, "");
      if (noCommas !== lowered) {
        expanded.add(noCommas);
      }
      if (lowered === "april") {
        expanded.add("date:04-01");
      }
      if (lowered.includes("2000")) expanded.add(lowered.replace(/2000/g, "2k"));
      if (lowered.includes("3000")) expanded.add(lowered.replace(/3000/g, "3k"));
      if (lowered.includes("2k")) expanded.add(lowered.replace(/2k/g, "2000"));
      if (lowered.includes("3k")) expanded.add(lowered.replace(/3k/g, "3000"));
      if (noCommas.includes("2000")) expanded.add(noCommas.replace(/2000/g, "2k"));
      if (noCommas.includes("3000")) expanded.add(noCommas.replace(/3000/g, "3k"));
      if (noCommas.includes("2k")) expanded.add(noCommas.replace(/2k/g, "2000"));
      if (noCommas.includes("3k")) expanded.add(noCommas.replace(/3k/g, "3000"));

      const aliases = aliasMap[lowered] || aliasMap[noCommas];
      if (aliases) {
        for (const alias of aliases) {
          expanded.add(alias);
        }
      }
      groups.push(Array.from(expanded));
    }
    return groups;
  }, [normalizedQuery, baseTokens]);

  const positionTokens = useMemo(
    () => selectedPositions.map((pos) => pos.toLowerCase()),
    [selectedPositions]
  );

  const bornTokens = useMemo(
    () => selectedBorn.map((token) => token.toLowerCase()),
    [selectedBorn]
  );

  const allTokenGroups = useMemo(
    () => [
      ...tokenGroups,
      ...positionTokens.map((pos) => [pos.toLowerCase()]),
      ...bornTokens.map((token) => [token]),
    ],
    [tokenGroups, positionTokens, bornTokens]
  );

  const prefersYankees = useMemo(() => {
    if (!normalizedQuery) return false;
    return baseTokens.some((token) => {
      const lowered = token.toLowerCase();
      return lowered === "ny" || lowered === "nyc";
    });
  }, [baseTokens, normalizedQuery]);

  const fuzzyMatch = (haystack: string, needle: string) => {
    if (!needle) return true;
    if (haystack.includes(needle)) return true;
    let h = 0;
    let n = 0;
    while (h < haystack.length && n < needle.length) {
      if (haystack[h] === needle[n]) n += 1;
      h += 1;
    }
    return n === needle.length;
  };

  const isExactOnlyTerm = (needle: string) =>
    [
      "ellis",
      "valentine",
      "xmas",
      "turkey",
      "thanks",
      "christmas",
      "thanksgiving",
    ].includes(needle);

  const filteredGrids = useMemo(() => {
    const buildMatches = (forceExact: boolean) => {
      if (!allTokenGroups.length) return sortedGrids;
      const effectiveExactOnly = exactOnly || forceExact;
      const scored = sortedGrids
        .map((grid) => {
        const isDateToken = (value: string) => value.startsWith("date:");
        const isMetaToken = (value: string) =>
          value.startsWith("date:") || value === "has:hint";
          const rowTexts = grid.rows.map((label) => label.toLowerCase());
          const colTexts = grid.cols.map((label) => label.toLowerCase());
          const hintTexts = (grid.hints ?? []).map((hint) => hint.toLowerCase());
          const searchTexts = (grid.searchTerms ?? []).map((term) =>
            term.toLowerCase()
          );
          const labelTexts =
            scope === "rows"
              ? rowTexts
              : scope === "cols"
              ? colTexts
              : [
                  ...grid.all.map((label) => label.toLowerCase()),
                  ...searchTexts,
                ];
          const exactTexts = [...labelTexts, ...hintTexts];
          const allText = [...labelTexts, ...hintTexts].join(" ");
          const hintText = hintTexts.join(" ");
          const exactText = exactTexts.join(" ");
          const isWinLabel = (label: string) =>
            /\b\d+\+\s*w\b/.test(label.trim());
          const aliasLabelsFor = (needle: string) => teamAliasMap[needle];
          const matchesToken = (needle: string, labels: string[]) => {
            if (!needle) return false;
          if (isDateToken(needle)) {
            return grid.id.slice(5) === needle.slice(5);
          }
          if (needle === "has:hint") {
            return (grid.hints?.length ?? 0) > 0;
          }
            if (needle === "sux" || needle === "suck" || needle === "sucks") {
              return false;
            }
            const aliasLabels = aliasLabelsFor(needle);
            if (aliasLabels) {
              return labels.some((label) =>
                aliasLabels.some((alias) => label.trim() === alias)
              );
            }
            if (TEAM_ALIAS_LABELS.has(needle)) {
              return labels.some((label) => label.trim() === needle);
            }
            const exactOverride = [
              "p",
              "c",
              "ss",
              "1b",
              "2b",
              "3b",
              "lf",
              "cf",
              "rf",
              "of",
              "dh",
            ].includes(needle);
            const exactOnlyTerm = isExactOnlyTerm(needle);
            if (effectiveExactOnly || exactOverride) {
              return labels.some((label) => label.trim() === needle);
            }
            if (needle === "win" || needle === "wins" || needle === "w") {
              return labels.some((label) => isWinLabel(label));
            }
            const isShortToken =
              /^[a-z]{2,3}$/.test(needle) || /^[0-9]$/.test(needle);
            if (isShortToken) {
              const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
              return labels.some((label) => {
                const normalizedLabel = label.replace(/[^a-z0-9]/g, "");
                const normalizedLabelNoSpace = normalizedLabel.replace(/\s+/g, "");
                if (normalizedNeedle === "ngl") {
                  return (
                    label.trim() === "ngl" ||
                    label.includes("negro league")
                  );
                }
                if (
                  normalizedNeedle === "as" &&
                  (label.includes("all-star") || label.includes("all star"))
                ) {
                  return true;
                }
                if (
                  normalizedNeedle === "ss" &&
                  (label.includes("silver slugger") || label === "ss")
                ) {
                  return true;
                }
                if (
                  normalizedNeedle === "gg" &&
                  (label.includes("gold glove") || label === "gg")
                ) {
                  return true;
                }
                if (normalizedNeedle === "gg") {
                  return false;
                }
                if (
                  (normalizedNeedle === "one" || needle === "1") &&
                  label.includes("one team")
                ) {
                  return true;
                }
                if (normalizedNeedle === "w") {
                  return isWinLabel(label);
                }
                if (normalizedNeedle === "2b") {
                  if (label === "2b" || label.includes("second base")) {
                    return true;
                  }
                  if (
                    label.includes("doubles") ||
                    normalizedLabelNoSpace.includes("40+2b")
                  ) {
                    return true;
                  }
                }
                return exactOnlyTerm
                  ? normalizedLabel.includes(normalizedNeedle)
                  : normalizedLabel.includes(normalizedNeedle) ||
                      fuzzyMatch(normalizedLabel, normalizedNeedle);
              });
            }
            return (
              labels.join(" ").includes(needle) ||
              (!exactOnlyTerm && fuzzyMatch(labels.join(" "), needle))
            );
          };
          const matchTerm = (needle: string) => {
            if (!needle) return { matched: false, score: 0 };
          if (isDateToken(needle)) {
            const hit = grid.id.slice(5) === needle.slice(5);
            return hit
              ? { matched: true, score: 3 }
              : { matched: false, score: 0 };
          }
          if (needle === "has:hint") {
            const hit = (grid.hints?.length ?? 0) > 0;
            return hit ? { matched: true, score: 3 } : { matched: false, score: 0 };
          }
            if (needle === "sux" || needle === "suck" || needle === "sucks") {
              return { matched: false, score: 0 };
            }
            const aliasLabels = aliasLabelsFor(needle);
            if (aliasLabels) {
              const hit = labelTexts.some((label) =>
                aliasLabels.some((alias) => label.trim() === alias)
              );
              return hit
                ? { matched: true, score: 3 }
                : { matched: false, score: 0 };
            }
            if (TEAM_ALIAS_LABELS.has(needle)) {
              const hit = labelTexts.some((label) => label.trim() === needle);
              return hit
                ? { matched: true, score: 3 }
                : { matched: false, score: 0 };
            }
            const exactOverride = [
              "p",
              "c",
              "ss",
              "1b",
              "2b",
              "3b",
              "lf",
              "cf",
              "rf",
              "of",
              "dh",
            ].includes(needle);
            const exactOnlyTerm = isExactOnlyTerm(needle);
            if (effectiveExactOnly || exactOverride) {
              if (hintText && hintText.includes(needle)) {
                return { matched: true, score: 3 };
              }
              const exactHit = labelTexts.some(
                (label) => label.trim() === needle
              );
              return exactHit
                ? { matched: true, score: 3 }
                : { matched: false, score: 0 };
            }
            if (needle === "win" || needle === "wins" || needle === "w") {
              const winLabel = labelTexts.some((label) => isWinLabel(label));
              return winLabel
                ? { matched: true, score: 3 }
                : { matched: false, score: 0 };
            }
            const isShortToken =
              /^[a-z]{2,3}$/.test(needle) || /^[0-9]$/.test(needle);
            if (isShortToken) {
              const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
              const labelHit = labelTexts.some((label) => {
                const normalizedLabel = label.replace(/[^a-z0-9]/g, "");
                const normalizedLabelNoSpace = normalizedLabel.replace(/\s+/g, "");
                if (normalizedNeedle === "ngl") {
                  return (
                    label.trim() === "ngl" ||
                    label.includes("negro league")
                  );
                }
                if (
                  normalizedNeedle === "as" &&
                  (label.includes("all-star") || label.includes("all star"))
                ) {
                  return true;
                }
                if (
                  normalizedNeedle === "ss" &&
                  (label.includes("silver slugger") || label === "ss")
                ) {
                  return true;
                }
                if (
                  normalizedNeedle === "gg" &&
                  (label.includes("gold glove") || label === "gg")
                ) {
                  return true;
                }
                if (normalizedNeedle === "gg") {
                  return false;
                }
                if (
                  (normalizedNeedle === "one" || needle === "1") &&
                  label.includes("one team")
                ) {
                  return true;
                }
                if (normalizedNeedle === "w") {
                  return isWinLabel(label);
                }
                if (normalizedNeedle === "2b") {
                  if (label === "2b" || label.includes("second base")) {
                    return true;
                  }
                  if (
                    label.includes("doubles") ||
                    normalizedLabelNoSpace.includes("40+2b")
                  ) {
                    return true;
                  }
                }
                return exactOnlyTerm
                  ? normalizedLabel.includes(normalizedNeedle)
                  : normalizedLabel.includes(normalizedNeedle) ||
                      fuzzyMatch(normalizedLabel, normalizedNeedle);
              });
              if (!labelHit) return { matched: false, score: 0 };
              if (
                normalizedNeedle === "as" &&
                labelTexts.some(
                  (label) =>
                    label.includes("all-star") || label.includes("all star")
                )
              ) {
                return { matched: true, score: 3 };
              }
              if (
                normalizedNeedle === "ss" &&
                labelTexts.some(
                  (label) => label.includes("silver slugger") || label === "ss"
                )
              ) {
                return { matched: true, score: 3 };
              }
              if (
                normalizedNeedle === "gg" &&
                labelTexts.some(
                  (label) => label.includes("gold glove") || label === "gg"
                )
              ) {
                return { matched: true, score: 3 };
              }
              if (
                (normalizedNeedle === "one" || needle === "1") &&
                labelTexts.some((label) => label.includes("one team"))
              ) {
                return { matched: true, score: 3 };
              }
              if (normalizedNeedle === "2b") {
                const hasSecondBase = labelTexts.some(
                  (label) => label === "2b" || label.includes("second base")
                );
                const hasDoubles = labelTexts.some(
                  (label) =>
                    label.includes("doubles") || label.includes("40+ 2b")
                );
                if (hasSecondBase) {
                  return { matched: true, score: 3 };
                }
                if (hasDoubles) {
                  return { matched: true, score: 2 };
                }
              }
              return { matched: true, score: 2 };
            }
            if (exactText.includes(needle)) {
              return { matched: true, score: 2 };
            }
            if (!exactOnlyTerm && fuzzyMatch(allText, needle)) {
              return { matched: true, score: 1 };
            }
            return { matched: false, score: 0 };
          };
          let score = 0;
          let matchedAll = true;
          let matchedRow = false;
          let matchedCol = false;
          for (const group of allTokenGroups) {
            let groupMatched = false;
            let bestScore = 0;
            for (const token of group) {
              const needle = token.toLowerCase();
              if (!needle) continue;
              const result = matchTerm(needle);
              if (result.matched) {
                groupMatched = true;
                if (result.score > bestScore) bestScore = result.score;
              }
            }
            if (!groupMatched) {
              matchedAll = false;
              break;
            }
            score += bestScore;
          }
          if (matchedAll && intersectOnly) {
          const intersectGroups = allTokenGroups.filter(
            (group) => !group.some((token) => isMetaToken(token.toLowerCase()))
          );
            if (intersectGroups.length >= 2) {
              matchedRow = intersectGroups.some((group) =>
                group.some((token) =>
                  matchesToken(token.toLowerCase(), rowTexts)
                )
              );
              matchedCol = intersectGroups.some((group) =>
                group.some((token) =>
                  matchesToken(token.toLowerCase(), colTexts)
                )
              );
              if (!matchedRow || !matchedCol) {
                return null;
              }
            }
          }
          if (
            matchedAll &&
            prefersYankees &&
            labelTexts.some((label) => label.includes("yankees"))
          ) {
            score += 1;
          }
          return matchedAll ? { grid, score } : null;
        })
        .filter(
          (value): value is { grid: Grid; score: number } => value !== null
        )
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return sortOrder === "oldest"
            ? a.grid.id.localeCompare(b.grid.id)
            : b.grid.id.localeCompare(a.grid.id);
        });

      return scored.map(({ grid }) => grid);
    };

    const matches = buildMatches(false);
    const exactMatches = buildMatches(true);
    if (!allTokenGroups.length || exactOnly) {
      return { exactMatches: matches, possibleMatches: [] };
    }
    const exactKeys = new Set(
      exactMatches.map((grid) => grid.gridNumber ?? grid.id)
    );
    return {
      exactMatches,
      possibleMatches: matches.filter(
        (grid) => !exactKeys.has(grid.gridNumber ?? grid.id)
      ),
    };
  }, [
    sortedGrids,
    allTokenGroups,
    exactOnly,
    scope,
    intersectOnly,
    prefersYankees,
  ]);

  const hasQuery = allTokenGroups.length > 0;
  const combinedGrids = useMemo(
    () =>
      hasQuery
        ? [...filteredGrids.exactMatches, ...filteredGrids.possibleMatches]
        : sortedGrids,
    [filteredGrids, hasQuery, sortedGrids]
  );

  const visibleGrids = useMemo(
    () => combinedGrids.slice(0, visibleCount),
    [combinedGrids, visibleCount]
  );

  const exactKeys = useMemo(() => {
    if (!hasQuery) return new Set();
    return new Set(
      filteredGrids.exactMatches.map((grid) => grid.gridNumber ?? grid.id)
    );
  }, [filteredGrids, hasQuery]);

  const visibleExactGrids = useMemo(
    () => (hasQuery ? visibleGrids.filter((grid) => exactKeys.has(grid.gridNumber ?? grid.id)) : visibleGrids),
    [exactKeys, hasQuery, visibleGrids]
  );

  const visiblePossibleGrids = useMemo(
    () => (hasQuery ? visibleGrids.filter((grid) => !exactKeys.has(grid.gridNumber ?? grid.id)) : []),
    [exactKeys, hasQuery, visibleGrids]
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      if (typeof window !== "undefined") {
        const current = window.location.pathname + window.location.search;
        if (current === nextUrl) return;
      }
      router.replace(nextUrl, { scroll: false });
    }, 350);

    return () => clearTimeout(handle);
  }, [query, pathname, router]);

  useEffect(() => {
    setVisibleCount(50);
  }, [
    query,
    intersectOnly,
    selectedPositions,
    selectedBorn,
    sortOrder,
    scope,
    exactOnly,
  ]);


  const positions = [
    "P",
    "C",
    "1B",
    "2B",
    "3B",
    "SS",
    "LF",
    "CF",
    "RF",
    "OF",
    "DH",
  ];

  const bornLocations = [
    { label: "🇺🇸 USA", token: "Born 🇺🇸 (USA)" },
    { label: "🇨🇦 CAN", token: "Born 🇨🇦 (CAN)" },
    { label: "🇨🇺 CUB", token: "Born 🇨🇺 (CUB)" },
    { label: "🇩🇴 DOM", token: "Born 🇩🇴 (DOM)" },
    { label: "🇯🇵 JPN", token: "Born 🇯🇵 (JPN)" },
    { label: "🇲🇽 MEX", token: "Born 🇲🇽 (MEX)" },
    { label: "🇵🇷 PRI", token: "Born 🇵🇷 (PRI)" },
    { label: "🇻🇪 VEN", token: "Born 🇻🇪 (VEN)" },
    { label: "🌍 Non-USA", token: "Born 🌍 (Non-USA)" },
  ];

  const togglePosition = (pos: string) => {
    setSelectedPositions((prev) =>
      prev.includes(pos) ? prev.filter((item) => item !== pos) : [...prev, pos]
    );
  };

  const toggleBorn = (token: string) => {
    setSelectedBorn((prev) =>
      prev.includes(token)
        ? prev.filter((item) => item !== token)
        : [...prev, token]
    );
  };

  const handleReset = () => {
    setQuery("");
    setSelectedPositions([]);
    setSelectedBorn([]);
    setIntersectOnly(false);
  };

  const handleRandomPick = () => {
    if (!combinedGrids.length) return;
    const index = Math.floor(Math.random() * combinedGrids.length);
    const selected = combinedGrids[index];
    if (!selected) return;
    if (typeof window !== "undefined") {
      window.location.href = selected.url;
    }
  };

  const getMatchSet = (grid: Grid) => {
    if (!allTokenGroups.length) return new Set<string>();
    const baseLabels =
      scope === "rows" ? grid.rows : scope === "cols" ? grid.cols : grid.all;
    const labelTexts = baseLabels.map((label) => label.toLowerCase());
    const matched = new Set<string>();
    for (const group of allTokenGroups) {
      for (const token of group) {
        const needle = token.toLowerCase();
        if (!needle) continue;
        if (needle.startsWith("date:")) continue;
        const aliasLabels = teamAliasMap[needle];
        if (aliasLabels) {
          for (let i = 0; i < labelTexts.length; i += 1) {
            const label = labelTexts[i];
            if (aliasLabels.some((alias) => label.trim() === alias)) {
              matched.add(baseLabels[i]);
            }
          }
          continue;
        }
        if (TEAM_ALIAS_LABELS.has(needle)) {
          for (let i = 0; i < labelTexts.length; i += 1) {
            const label = labelTexts[i];
            if (label.trim() === needle) {
              matched.add(baseLabels[i]);
            }
          }
          continue;
        }
        for (let i = 0; i < labelTexts.length; i += 1) {
          const label = labelTexts[i];
          const normalizedLabel = label.replace(/[^a-z0-9]/g, "");
          const normalizedNeedle = needle.replace(/[^a-z0-9]/g, "");
          const exactOverride = [
            "p",
            "c",
            "ss",
            "1b",
            "2b",
            "3b",
            "lf",
            "cf",
            "rf",
            "of",
            "dh",
          ].includes(needle);
          const exactHit = label.trim() === needle;
          const fuzzyHit =
            normalizedLabel.includes(normalizedNeedle) ||
            fuzzyMatch(normalizedLabel, normalizedNeedle);
          const goldGloveOnly =
            normalizedNeedle === "gg" &&
            !(label.includes("gold glove") || label === "gg");
          if (goldGloveOnly) continue;
          if (exactOnly || exactOverride ? exactHit : fuzzyHit) {
            matched.add(baseLabels[i]);
          }
        }
      }
    }
    return matched;
  };

  const renderGridCards = (list: Grid[]) =>
    list.map((grid) => {
      const matched = getMatchSet(grid);
      return (
        <article
          key={grid.gridNumber ? `grid-${grid.gridNumber}` : grid.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <a
            href={grid.url}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs uppercase tracking-[0.22em] text-blue-700 underline-offset-4 transition hover:text-blue-900 hover:underline"
          >
            #{grid.gridNumber ?? "—"} ({grid.id})
          </a>
          {grid.hints?.length ? (
            <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
              {grid.hints.join(" · ")}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] font-semibold text-slate-700">
            <div className="rounded-md bg-slate-50 px-2 py-1" />
            {grid.cols.map((col, index) => (
              <div
                key={`${grid.gridNumber ?? grid.id}-col-${index}-${col}`}
                className={`rounded-md px-2 py-1 text-center ${
                  matched.has(col)
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100"
                }`}
              >
                {col}
              </div>
            ))}
            {grid.rows.map((row, index) => (
              <Fragment
                key={`${grid.gridNumber ?? grid.id}-row-${index}-${row}`}
              >
                <div
                  className={`rounded-md px-2 py-1 text-center ${
                    matched.has(row)
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100"
                  }`}
                >
                  {row}
                </div>
                {[0, 1, 2].map((cell) => (
                  <div
                    key={`${grid.gridNumber ?? grid.id}-cell-${index}-${cell}`}
                    className="rounded-md bg-slate-50 px-2 py-1"
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </article>
      );
    });

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16">
        <header className="relative flex flex-col items-center gap-5 text-center">
          <div className="absolute left-0 top-0 hidden sm:block" />
          <div className="absolute right-0 top-0 hidden flex-col items-end gap-2 sm:flex" />
          <div className="absolute right-0 top-0 hidden sm:block" />
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Ordinary Archive
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600">
            Find past grids with ordinary effort.
          </p>
        </header>

        <section className="flex flex-col items-center gap-6">
          <div className="w-full max-w-4xl">
            <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full flex-1">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search labels (Ex: Pirates WAR)"
                  autoFocus
                  className="w-full rounded-full border border-slate-200 bg-white px-6 py-4 pr-12 text-lg font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-blue-100 sm:pr-6"
                />
                {!!query && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:border-slate-300 hover:text-slate-900 sm:hidden"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="relative inline-flex min-w-[200px] items-center">
                <select
                  value={intersectOnly ? "intersect" : "any"}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "intersect") {
                      setIntersectOnly(true);
                    } else {
                      setIntersectOnly(false);
                    }
                    setExactOnly(false);
                  }}
                  className="w-full appearance-none rounded-full border border-slate-200 bg-white px-4 py-2 pr-7 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700"
                >
                  <option value="any">Any label</option>
                  <option value="intersect">Must intersect</option>
                </select>
                <span className="pointer-events-none absolute right-3 text-[10px] text-slate-400">
                  ▾
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="hidden rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900 sm:inline-flex"
              >
                Reset
              </button>
            </div>
            <details className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:hidden">
              <summary className="relative cursor-pointer list-none text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Filters &amp; shortcuts
                <span className="pointer-events-none absolute right-1 text-[10px] text-slate-400">
                  ▾
                </span>
              </summary>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Played 1+ Game at
                </span>
                {positions.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePosition(pos)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                      selectedPositions.includes(pos)
                        ? "border-blue-300 bg-blue-100 text-blue-800"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:flex-nowrap sm:gap-1 sm:overflow-x-hidden">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                  Born in
                </span>
                {bornLocations.map((born) => (
                  <button
                    key={born.token}
                    type="button"
                    onClick={() => toggleBorn(born.token)}
                    className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition sm:px-1.5 sm:text-[8px] sm:tracking-[0.12em] ${
                      selectedBorn.includes(born.token)
                        ? "border-blue-300 bg-blue-100 text-blue-800"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {born.label}
                  </button>
                ))}
              </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Short cuts
              </span>
              <button
                type="button"
                onClick={() => toggleFilterToken(`date:${monthDay}`)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  isTodayFilterActive
                    ? "border-blue-300 bg-blue-100 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                All {monthLabel} grids
              </button>
              <button
                type="button"
                onClick={() => toggleFilterToken("has:hint")}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  isSpecialFilterActive
                    ? "border-blue-300 bg-blue-100 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                Special day grids
              </button>
              <button
                type="button"
                onClick={handleRandomPick}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Random grid
              </button>
                <a
                  href="/about"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  About
                </a>
              </div>
            </details>
            <div className="mt-3 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:block">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:flex-nowrap sm:overflow-x-auto">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Played 1+ Game at
                </span>
                {positions.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePosition(pos)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                      selectedPositions.includes(pos)
                        ? "border-blue-300 bg-blue-100 text-blue-800"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Born in
                </span>
                {bornLocations.map((born) => (
                  <button
                    key={born.token}
                    type="button"
                    onClick={() => toggleBorn(born.token)}
                    className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                      selectedBorn.includes(born.token)
                        ? "border-blue-300 bg-blue-100 text-blue-800"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {born.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Short cuts
                </span>
                <button
                  type="button"
                  onClick={() => toggleFilterToken(`date:${monthDay}`)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    isTodayFilterActive
                      ? "border-blue-300 bg-blue-100 text-blue-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  All {monthLabel} grids
                </button>
                <button
                  type="button"
                  onClick={() => toggleFilterToken("has:hint")}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    isSpecialFilterActive
                      ? "border-blue-300 bg-blue-100 text-blue-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  Special day grids
                </button>
                <button
                  type="button"
                  onClick={handleRandomPick}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Random grid
                </button>
                <a
                  href="/about"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  About
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {hasQuery
                ? visibleExactGrids.length
                  ? "Matching Grids (Exact)"
                  : "Matching Grids (Possible)"
                : "Matching Grids"}
            </div>
            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
              }
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
            >
              {sortOrder === "newest" ? "Recent ↓" : "Early ↑"}
            </button>
          </div>
          {visibleGrids.length ? (
            hasQuery ? (
              <div className="flex flex-col gap-6">
                {visibleExactGrids.length ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {renderGridCards(visibleExactGrids)}
                    </div>
                  </div>
                ) : null}
                {visiblePossibleGrids.length ? (
                  <div className="flex flex-col gap-4">
                    {visibleExactGrids.length ? (
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Matching Grids (Possible)
                      </div>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {renderGridCards(visiblePossibleGrids)}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {renderGridCards(visibleGrids)}
              </div>
            )
          ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No grids found for that search.
              </div>
            )}
          {visibleGrids.length < combinedGrids.length && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + 50, combinedGrids.length)
                  )
                }
                className="rounded-full border border-slate-300 bg-white px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                Load more
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
