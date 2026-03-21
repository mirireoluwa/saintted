import type { Track } from "../types/track";

/** Local cover art paths (from project public folder). */
const LOCAL_COVER_BY_SLUG: Record<string, string> = {
  "one-chance": "/one-chance-cover.png",
  shimmer: "/shimmer-cover.jpg",
  hyperphoria: "/hyperphoria-cover.jpg",
  runaway: "/runaway-cover.png",
};

/**
 * Cover art URL for a track.
 * Prefer `art_url` from the API (backend may fill it from iTunes / Spotify when you
 * haven’t uploaded art). Otherwise use bundled public images by slug.
 */
export function getTrackArtUrl(track: Track): string {
  if (track.art_url?.trim()) return track.art_url.trim();
  return LOCAL_COVER_BY_SLUG[track.slug] ?? "";
}
