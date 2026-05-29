import { getRedis, TRACKS_KEY } from "../lib-js/redis.js";
import type { Track } from "../lib/types.js";

export default async function handler(
  req: { method?: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");
  // Allow CDN caching for 30s, serve stale for up to 60s while revalidating
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const redis = getRedis();
    if (!redis) return res.status(200).json([]);

    const raw = await redis.get<string>(TRACKS_KEY);
    if (!raw) return res.status(200).json([]);

    const tracks = (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
    const now = Date.now();
    let dirty = false;

    // Auto-publish tracks whose publish_at has passed and are still unpublished
    // Auto-expire highlighted badge when highlighted_until has passed
    const processed = tracks.map((t) => {
      let updated = { ...t };

      if (!updated.is_published && updated.publish_at) {
        const publishMs = new Date(updated.publish_at).getTime();
        if (Number.isFinite(publishMs) && publishMs <= now) {
          updated = { ...updated, is_published: true };
          dirty = true;
        }
      }

      if (updated.is_highlighted && updated.highlighted_until) {
        const expireMs = new Date(updated.highlighted_until).getTime();
        if (Number.isFinite(expireMs) && expireMs <= now) {
          updated = { ...updated, is_highlighted: false };
          dirty = true;
        }
      }

      return updated;
    });

    // Persist mutations back to Redis (fire-and-forget; don't block the response)
    if (dirty) {
      redis.set(TRACKS_KEY, JSON.stringify(processed)).catch((e: unknown) =>
        console.error("tracks auto-update error:", e)
      );
    }

    const published = processed
      .filter((t) => t.is_published !== false)
      .sort((a, b) => a.order - b.order || a.id - b.id);

    return res.status(200).json(published);
  } catch (e) {
    console.error("GET /api/tracks error:", e);
    return res.status(500).json({ ok: false, message: "Failed to fetch tracks" });
  }
}
