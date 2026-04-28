import { extractGridIngestionFromHtml } from "./gridIngestion.js";

type GridLabel = { key: string; label: string };

export type GridMeta = {
  gridId: string;
  displayName?: string;
  date?: string;
  rows: GridLabel[];
  cols: GridLabel[];
};

export async function extractGridMetaFromHtml(
  html: string,
  gridIdHint?: string
): Promise<GridMeta> {
  const meta = extractGridIngestionFromHtml(html, gridIdHint);
  const gridId = meta.extractedGridId || gridIdHint || "unknown";

  return {
    gridId,
    displayName: meta.displayName || undefined,
    date: meta.date || undefined,
    rows: meta.rows.map((label: string) => ({ key: label, label })),
    cols: meta.cols.map((label: string) => ({ key: label, label })),
  };
}

export { extractGridIngestionFromHtml };
