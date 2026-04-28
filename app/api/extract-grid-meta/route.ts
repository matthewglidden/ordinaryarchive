import { NextResponse } from "next/server";
import { extractGridIngestionFromHtml } from "@/lib/gridIngestion.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("sports-reference.com")) return null;
    if (!url.pathname.includes("/immaculate-grid/")) return null;
    if (!url.pathname.includes("/grid-")) return null;
    return url;
  } catch {
    return null;
  }
};

const parseGridIdHint = (pathname: string) => {
  const match = pathname.match(/grid-(\d+)/);
  return match ? match[1] : undefined;
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

    const url = isValidUrl(body.url);
    if (!url) {
      return NextResponse.json(
        { error: "URL must be a sports-reference.com immaculate-grid grid." },
        { status: 400 }
      );
    }

    const gridIdHint = parseGridIdHint(url.pathname);

    const response = await fetch(url.toString(), {
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

    const html = await response.text();
    const meta = extractGridIngestionFromHtml(html, gridIdHint);
    return NextResponse.json(meta);
  } catch {
    const message = "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
