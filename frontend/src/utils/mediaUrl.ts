/**
 * All uploaded media is now stored in Vercel Blob (absolute https:// URLs).
 * This helper is kept for backwards-compatibility in case any relative URLs
 * remain (e.g. legacy data migrated from Django).
 */
export function resolvePublicMediaUrl(url: string | null | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw;
}
