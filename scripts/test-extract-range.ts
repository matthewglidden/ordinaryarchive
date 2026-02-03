import { extractGridMetaFromHtml } from "../lib/extractGridMeta";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const parseArgs = (argv: string[]) => {
  const args = {
    start: 1,
    end: 25,
    limit: null as number | null,
    delay: 350,
    jitter: 200,
    maxPerMinute: 60,
    backoffMs: 2000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--start") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--start expects a number");
      }
      args.start = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--end") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--end expects a number");
      }
      args.end = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--limit expects a number");
      }
      args.limit = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--delay") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--delay expects a number (ms)");
      }
      args.delay = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--jitter") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--jitter expects a number (ms)");
      }
      args.jitter = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--max-per-minute") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--max-per-minute expects a number");
      }
      args.maxPerMinute = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--backoff") {
      const next = argv[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error("--backoff expects a number (ms)");
      }
      args.backoffMs = Number(next);
      i += 1;
    }
  }

  if (args.end < args.start) {
    throw new Error("--end must be >= --start");
  }

  return args;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const computeDelay = (base: number, jitter: number) => {
  if (jitter <= 0) return base;
  const variance = Math.floor(Math.random() * jitter);
  return base + variance;
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const end = args.limit
    ? Math.min(args.end, args.start + args.limit - 1)
    : args.end;

  const total = end - args.start + 1;
  const startedAt = Date.now();
  let processed = 0;

  const minGap = Math.max(0, Math.floor(60000 / args.maxPerMinute));
  let lastFetchAt = 0;

  for (let index = args.start; index <= end; index += 1) {
    const url = `https://www.sports-reference.com/immaculate-grid/grid-${index}`;
    try {
      const now = Date.now();
      const sinceLast = now - lastFetchAt;
      const waitForRate = minGap > sinceLast ? minGap - sinceLast : 0;
      if (waitForRate > 0) {
        await sleep(waitForRate);
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
      });
      lastFetchAt = Date.now();

      if (!response.ok) {
        console.log(`#${index} failed (${response.status})`);
        await sleep(args.backoffMs);
        continue;
      }

      const html = await response.text();
      const meta = await extractGridMetaFromHtml(html, String(index));
      const rowLabels = meta.rows.map((row) => row.label).join(", ");
      const colLabels = meta.cols.map((col) => col.label).join(", ");
      console.log(`#${index} ${rowLabels} | ${colLabels}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.log(`#${index} error: ${message}`);
      await sleep(args.backoffMs);
    }

    processed += 1;
    const elapsedMs = Date.now() - startedAt;
    const avgMs = elapsedMs / Math.max(1, processed);
    const remaining = Math.max(0, total - processed);
    const etaMs = Math.round(avgMs * remaining);
    const etaMin = Math.floor(etaMs / 60000);
    const etaSec = Math.floor((etaMs % 60000) / 1000);
    if (processed % 10 === 0 || processed === total) {
      console.log(
        `Progress: ${processed}/${total} | ETA ${etaMin}m ${etaSec}s`
      );
    }

    await sleep(computeDelay(args.delay, args.jitter));
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
