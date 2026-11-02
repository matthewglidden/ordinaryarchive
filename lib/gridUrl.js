const ALLOWED_HOSTS = new Set([
  "sports-reference.com",
  "www.sports-reference.com",
]);

const GRID_PATH_RE = /^\/immaculate-grid\/grid-(\d+)\/?$/;

export function validateGridUrl(value) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
    if (url.username || url.password || url.port) return null;
    if (!GRID_PATH_RE.test(url.pathname)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function gridIdFromPath(pathname) {
  return pathname.match(GRID_PATH_RE)?.[1];
}
