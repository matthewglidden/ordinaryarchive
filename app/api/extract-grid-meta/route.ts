import { NextResponse } from "next/server";
import { extractGridIngestionFromHtml } from "@/lib/gridIngestion.js";
import { gridIdFromPath, validateGridUrl } from "@/lib/gridUrl.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const MAX_HTML_BYTES = 2 * 1024 * 1024;

const readHtml = async (response: Response) => {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Grid page exceeded the response size limit.");
    }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body?.url) {
      return NextResponse.json(
        { error: "Missing url in request body." },
        { status: 400 }
      );
    }

    const url = validateGridUrl(body.url);
    if (!url) {
      return NextResponse.json(
        { error: "URL must be a sports-reference.com immaculate-grid grid." },
        { status: 400 }
      );
    }

    const gridIdHint = gridIdFromPath(url.pathname);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch grid page (${response.status}).` },
        { status: 502 }
      );
    }

    if (
      !(response.headers.get("content-type") ?? "")
        .toLowerCase()
        .includes("text/html")
    ) {
      return NextResponse.json(
        { error: "Grid page did not return HTML." },
        { status: 502 }
      );
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
      return NextResponse.json(
        { error: "Grid page exceeded the response size limit." },
        { status: 502 }
      );
    }

    const html = await readHtml(response);
    const meta = extractGridIngestionFromHtml(html, gridIdHint);
    return NextResponse.json(meta);
  } catch (error) {
    console.error("Grid metadata extraction failed:", error);
    return NextResponse.json(
      { error: "Unable to fetch or parse the grid page." },
      { status: 502 }
    );
  }
}
