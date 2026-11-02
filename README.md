# Ordinary Archive

Ordinary Archive is a searchable archive of past Baseball Immaculate Grid puzzles. It is an unofficial fan project; each result links to the corresponding puzzle on Sports Reference.

## Run locally

Requirements: Node.js 20.19+, 22.13+, or 24+.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. The production build can be started with `npm run build` followed by `npm start`.

## Search and data

The search page loads `data/grids.json` and the team alias JSON files into the client. It supports label searches, team aliases, row/column filters, position and birthplace filters, date shortcuts, and “possible” fuzzy matches. The grid data contains each puzzle's date, source URL, row and column labels, and optional search hints.

`.github/workflows/rebuild-grids.yml` runs daily at 11:05 UTC and can also be started manually from GitHub Actions. It incrementally fetches new grids from Sports Reference, validates the extraction, checks for repeated labels, and commits dataset changes. The extraction code supports both the site's embedded data and rendered-page fallbacks; Playwright Chromium is needed only when the static extraction cannot identify a grid.

The team alias generator is `npm run build:team-aliases`. It downloads the official [Baseball Reference team-ID table](https://www.baseball-reference.com/about/team_IDs.shtml) and writes `data/team-aliases.json`. Hand-curated place and nickname aliases live in `data/team-aliases-extra.json` so regenerating the upstream aliases does not erase them. Run the generator when refreshing the source data, then review and commit the generated changes.

## Checks

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=high
```

Grid ingestion fixtures and numbering/date behavior are covered under `tests/`. GitHub Actions runs these checks and fails on high or critical dependency advisories for pushes and pull requests.

## Project layout

- `app/` — Next.js pages, metadata, and the grid-extraction API route.
- `lib/gridIngestion.js` — parsing and validating Sports Reference grid HTML.
- `lib/playwrightGridFallback.mjs` — browser-based extraction fallback and sanitized debug output.
- `scripts/build-grids.mjs` — incremental dataset builder.
- `scripts/check-suspicious-duplications.mjs` — detects repeated row or column labels.
- `data/` — checked-in grid and team-alias datasets.
