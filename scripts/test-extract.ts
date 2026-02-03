import { extractGridMetaFromHtml } from "../lib/extractGridMeta";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const url = "https://www.sports-reference.com/immaculate-grid/grid-18";

const run = async () => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  const html = await response.text();
  const meta = await extractGridMetaFromHtml(html, "18");
  console.log(JSON.stringify(meta, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
