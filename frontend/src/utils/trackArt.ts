import type { Track } from "../types/track";
import { resolvePublicMediaUrl } from "./mediaUrl";

/** Local cover art paths (from project public folder). */
const LOCAL_COVER_BY_SLUG: Record<string, string> = {
  "one-chance": "/one-chance-cover.png",
  shimmer: "/shimmer-cover.jpg",
  hyperphoria: "/hyperphoria-cover.jpg",
  runaway: "/runaway-cover.png",
};

/**
 * Returns true if the URL is a Cloudinary delivery URL.
 */
function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com") || url.includes("cloudinary.com/");
}

/**
 * Given a Cloudinary URL, insert `w_<width>,c_fill,f_auto,q_auto` transforms.
 * Works with both `/image/upload/` and `/video/upload/` paths.
 */
function cloudinarySrc(url: string, width: number): string {
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const transform = `w_${width},c_fill,f_auto,q_auto`;
  return url.slice(0, idx + marker.length) + transform + "/" + url.slice(idx + marker.length);
}

/**
 * Cover art URL for a track.
 * Prefer `art_url` from the API (backend may fill it from iTunes / Spotify when you
 * haven’t uploaded art). Otherwise use bundled public images by slug.
 */
export function getTrackArtUrl(track: Track): string {
  if (track.art_url?.trim()) return resolvePublicMediaUrl(track.art_url.trim());
  return LOCAL_COVER_BY_SLUG[track.slug] ?? "";
}

/**
 * Returns a responsive `srcset` string for Cloudinary-hosted cover art,
 * or `undefined` for non-Cloudinary / local images (browser picks from src).
 */
export function getTrackArtSrcSet(track: Track): string | undefined {
  const url = track.art_url?.trim();
  if (!url || !isCloudinaryUrl(url)) return undefined;
  const resolved = resolvePublicMediaUrl(url);
  // 320w for small mobile cards, 480w for medium, 720w for large cards/detail
  return [320, 480, 720]
    .map((w) => `${cloudinarySrc(resolved, w)} ${w}w`)
    .join(", ");
}
