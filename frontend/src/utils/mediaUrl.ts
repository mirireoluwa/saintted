import { getApiBase } from "./apiBase";

/**
 * Origin that serves uploaded media (`/media/...`) — same host as the API, without the `/api` suffix.
 * When the API returns root-relative media paths, the browser must not resolve them against the
 * marketing site (e.g. Vercel), which has no `/media` route.
 */
export function getApiMediaOrigin(): string {
  const base = getApiBase().trim().replace(/\/+$/, "");
  if (/\/api$/i.test(base)) {
    return base.slice(0, -4);
  }
  try {
    const u = new URL(base);
    let path = u.pathname.replace(/\/+$/, "") || "";
    if (path.toLowerCase().endsWith("/api")) {
      path = path.slice(0, -4) || "/";
      u.pathname = path === "/" ? "/" : path;
    }
    const origin = u.origin;
    const p = u.pathname.replace(/\/+$/, "");
    return p && p !== "/" ? `${origin}${p}` : origin;
  } catch {
    return "";
  }
}

/** Turn API root-relative media paths into absolute URLs on the API (or CDN) host. */
export function resolvePublicMediaUrl(url: string | null | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (!raw.startsWith("/")) return raw;
  const origin = getApiMediaOrigin();
  if (!origin) return raw;
  return `${origin.replace(/\/+$/, "")}${raw}`;
}
