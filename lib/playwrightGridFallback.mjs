import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const GRID_TITLE_RE = /^Grid #(\d+)$/i;
const DEBUG_RESPONSE_RE = /(?:api|grid|payload|nuxt|json)/i;
const SENSITIVE_QUERY_RE =
  /(?:auth|authorization|code|credential|jwt|key|password|secret|session|signature|token)/i;

const pageHasVisibleGridTitle = async (page, requestedGridId) => {
  const titleRe = new RegExp(`\\bGrid\\s*#${requestedGridId}\\b`, "i");
  return page
    .locator("body")
    .evaluate(
      (body, pattern) =>
        Boolean(
          body &&
            body.innerText &&
            new RegExp(pattern, "i").test(body.innerText)
        ),
      titleRe.source
    );
};

const extractLabelsFromPage = async (page) => {
  const rows = await page
    .locator('aside[aria-label="Grid Row Categories"] dfn')
    .allTextContents();
  const cols = await page
    .locator('aside[aria-label="Grid Column Categories"] dfn')
    .allTextContents();

  const normalizedRows = rows.map((value) => value.trim()).filter(Boolean);
  const normalizedCols = cols.map((value) => value.trim()).filter(Boolean);
  if (normalizedRows.length === 3 && normalizedCols.length === 3) {
    return {
      rows: normalizedRows,
      cols: normalizedCols,
      strategy: "rendered-aside",
    };
  }

  const cells = await page
    .locator("table[role='grid'], [role='grid']")
    .first()
    .locator("tr")
    .evaluateAll((rowsEls) => {
      const rowEls = rowsEls.map((row) => {
        const cells = Array.from(
          row.querySelectorAll("th, td, [role='gridcell'], [role='columnheader'], [role='rowheader']")
        );
        return cells.map((cell) => ({
          text: cell.textContent || "",
          aria: cell.getAttribute("aria-label") || "",
        }));
      });
      return rowEls;
    });

  if (cells.length >= 4) {
    const headerRow = cells[0];
    const columnLabels = headerRow.slice(1, 4).map((cell) => (cell.aria || cell.text || "").trim()).filter(Boolean);
    const rowLabels = cells.slice(1, 4).map((row) => (row[0]?.aria || row[0]?.text || "").trim()).filter(Boolean);
    if (rowLabels.length === 3 && columnLabels.length === 3) {
      return {
        rows: rowLabels,
        cols: columnLabels,
        strategy: "grid-cell-aria",
      };
    }
  }

  return null;
};

const sanitizeUrl = (value) => {
  try {
    const parsed = new URL(value);
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_RE.test(key)) {
        parsed.searchParams.set(key, "[redacted]");
      }
    }
    return parsed.toString();
  } catch {
    return String(value).replace(
      /([?&][^=]*(?:auth|authorization|code|credential|jwt|key|password|secret|session|signature|token)[^=]*=)[^&]*/gi,
      "$1[redacted]"
    );
  }
};

const getAsideCounts = async (page) => ({
  rows: await page.locator('aside[aria-label="Grid Row Categories"] dfn').count(),
  cols: await page.locator('aside[aria-label="Grid Column Categories"] dfn').count(),
});

const getCellAriaLabelCount = async (page) =>
  page
    .locator(
      "th[aria-label], td[aria-label], [role='gridcell'][aria-label], [role='columnheader'][aria-label], [role='rowheader'][aria-label]"
    )
    .evaluateAll(
      (elements) =>
        elements.filter((element) => {
          const value = element.getAttribute("aria-label") || "";
          return value.trim() && /cell|row|column|grid/i.test(value);
        }).length
    )
    .catch(() => 0);

const writePlaywrightDebugFile = async ({
  page,
  requestedGridId,
  responses,
  debugDir,
  fallbackUrl,
}) => {
  const title = page ? await page.title().catch(() => "") : "";
  const finalUrl = page ? page.url() : fallbackUrl;
  const visibleBodyText = page
    ? await page.locator("body").innerText().catch(() => "")
    : "";
  const detectedGridValues = [...visibleBodyText.matchAll(/Grid\s*#(\d+)/gi)]
    .map((match) => match[1])
    .filter(Boolean);
  const asideCounts = page ? await getAsideCounts(page) : { rows: 0, cols: 0 };
  const cellAriaLabelCount = page ? await getCellAriaLabelCount(page) : 0;
  const debugPayload = {
    requestedGridId: String(requestedGridId),
    finalPageUrl: sanitizeUrl(finalUrl),
    pageTitle: title,
    visibleBodyTextFirst2000: visibleBodyText.slice(0, 2000),
    requestedGridTextAppears: new RegExp(
      `\\bGrid\\s*#${requestedGridId}\\b`,
      "i"
    ).test(visibleBodyText),
    detectedGridValues: [...new Set(detectedGridValues)],
    rowAsideCount: asideCounts.rows,
    columnAsideCount: asideCounts.cols,
    cellAriaLabelCount,
    responses: responses
      .filter((response) => DEBUG_RESPONSE_RE.test(response.url))
      .map((response) => ({
        url: sanitizeUrl(response.url),
        status: response.status,
      })),
  };

  await fs.mkdir(debugDir, { recursive: true });
  const filePath = path.join(
    debugDir,
    `grid-${requestedGridId}-playwright-debug.json`
  );
  await fs.writeFile(filePath, `${JSON.stringify(debugPayload, null, 2)}\n`, "utf8");
  return filePath;
};

export async function extractGridIngestionWithPlaywright({
  requestedGridId,
  url,
  debugDir = path.join(process.cwd(), "tmp", "grid-debug"),
}) {
  let browser = null;
  let page = null;
  const responses = [];

  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({
      viewport: { width: 1280, height: 1440 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    });
    page.on("response", (response) => {
      const responseUrl = response.url();
      if (!DEBUG_RESPONSE_RE.test(responseUrl)) return;
      responses.push({
        url: responseUrl,
        status: response.status(),
      });
    });

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    const title = await page.title();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (
      /just a moment/i.test(title) ||
      /performing security verification/i.test(bodyText) ||
      /cloudflare/i.test(bodyText)
    ) {
      const error = new Error(
        `Playwright encountered a Cloudflare verification page for grid ${requestedGridId}.`
      );
      error.code = "PLAYWRIGHT_CHALLENGE_BLOCKED";
      throw error;
    }

    const visible = await pageHasVisibleGridTitle(page, requestedGridId);
    if (!visible) {
      const error = new Error(
        `Visible title Grid #${requestedGridId} did not appear.`
      );
      error.code = "PLAYWRIGHT_GRID_TITLE_MISSING";
      throw error;
    }

    await page.waitForFunction(
      (gridId) =>
        Boolean(
          document.body &&
            new RegExp(`\\bGrid\\s*#${gridId}\\b`, "i").test(document.body.innerText)
        ),
      String(requestedGridId)
    );

    const labels = await extractLabelsFromPage(page);
    if (!labels) {
      throw new Error(`Playwright could not validate labels for ${requestedGridId}.`);
    }

    const html = await page.content();
    const displayName = `Grid #${requestedGridId}`;
    if (!GRID_TITLE_RE.test(displayName)) {
      throw new Error(`Invalid displayName from Playwright fallback: ${displayName}`);
    }

    return {
      requestedGridId: String(requestedGridId),
      extractedGridId: String(requestedGridId),
      gridNum: Number(requestedGridId),
      displayName,
      rows: labels.rows,
      cols: labels.cols,
      html,
      source: "playwright",
      strategy: labels.strategy,
      validationWarnings: ["playwright fallback used"],
      date: null,
    };
  } catch (error) {
    try {
      error.debugFile = await writePlaywrightDebugFile({
        page,
        requestedGridId,
        responses,
        debugDir,
        fallbackUrl: url,
      });
    } catch (debugError) {
      error.debugFileError = debugError.message;
    }
    throw error;
  } finally {
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
  }
}
