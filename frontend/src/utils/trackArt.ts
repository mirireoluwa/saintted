import type { Track } from "../types/track";
import { getApiBase } from "./apiBase";

/** Local cover art paths (from project public folder). */
const LOCAL_COVER_BY_SLUG: Record<string, string> = {
  "one-chance": "/one-chance-cover.png",
  shimmer: "/shimmer-cover.jpg",
  hyperphoria: "/hyperphoria-cover.jpg",
  runaway: "/runaway-cover.png",
};

const API_BASE = getApiBase();

function withApiOrigin(url: string): string {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  try {
    return new URL(path, API_BASE).toString();
  } catch {
    return raw;
  }
}

/**
 * Cover art URL for a track.
 * Prefer `art_url` from the API (backend may fill it from iTunes / Spotify when you
 * haven’t uploaded art). Otherwise use bundled public images by slug.
 */
export function getTrackArtUrl(track: Track): string {
  if (track.art_url?.trim()) return withApiOrigin(track.art_url);
  return LOCAL_COVER_BY_SLUG[track.slug] ?? "";
}
