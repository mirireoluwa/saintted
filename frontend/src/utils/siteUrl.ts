/**
 * Canonical site origin for SEO / Open Graph (no trailing slash).
 * Set VITE_SITE_URL in production builds (see vite.config).
 */
export function getSiteUrl(): string {
  const raw = import.meta.env.VITE_SITE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "https://saintted.com";
}

export function absoluteUrl(pathOrUrl: string): string {
  const p = (pathOrUrl || "").trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const base = getSiteUrl();
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
}
