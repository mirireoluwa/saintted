import type { Track } from "../types/track";

/** Local cover art paths (from project public folder). */
const LOCAL_COVER_BY_SLUG: Record<string, string> = {
  "one-chance": "/one-chance-cover.png",
  shimmer: "/shimmer-cover.jpg",
  hyperphoria: "/hyperphoria-cover.jpg",
  runaway: "/runaway-cover.png",
};

/** Cover art URL for a track. Uses local asset when art_url is not set. */
export function getTrackArtUrl(track: Track): string {
  if (track.art_url) return track.art_url;
  return LOCAL_COVER_BY_SLUG[track.slug] ?? "";
}
