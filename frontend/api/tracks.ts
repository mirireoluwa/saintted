import { getRedis, TRACKS_KEY } from "./_lib-js/redis.js";
import type { Track } from "./_lib/types.js";

type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

export default async function handler(
  req: { method?: string; query?: Record<string, string | string[]> },
  res: Res
) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const slugParam = req.query?.slug;
  const slug = typeof slugParam === "string" ? slugParam.trim() : "";

  // ── Single track by slug ───────────────────────────────────────────────────
  if (slug) {
    res.setHeader("Cache-Control", "no-cache, no-store");
    try {
      const redis = getRedis();
      if (!redis) return res.status(404).json({ ok: false, message: "Track not found" });

      const raw = await redis.get<string>(TRACKS_KEY);
      if (!raw) return res.status(404).json({ ok: false, message: "Track not found" });

      const tracks = (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
      const track = tracks.find((t) => t.slug === slug);
      if (!track) return res.status(404).json({ ok: false, message: "Track not found" });

      const visible = tracks
        .filter((t) => t.is_published !== false)
        .sort((a, b) => a.order - b.order || a.id - b.id);

      let previous_slug: string | null = null;
      let next_slug: string | null = null;

      if (track.is_unreleased) {
        const released = visible.filter((t) => !t.is_unreleased);
        previous_slug = released.slice(-1)[0]?.slug ?? null;
        next_slug = released[0]?.slug ?? null;
      } else {
        const idx = visible.findIndex((t) => t.slug === slug);
        previous_slug = visible[idx - 1]?.slug ?? null;
        next_slug = visible[idx + 1]?.slug ?? null;
      }

      return res.status(200).json({ ...track, previous_slug, next_slug });
    } catch (e) {
      console.error("GET /api/tracks?slug= error:", e);
      return res.status(500).json({ ok: false, message: "Failed to fetch track" });
    }
  }

  // ── Track list ─────────────────────────────────────────────────────────────
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  try {
    const redis = getRedis();
    if (!redis) return res.status(200).json([]);

    const raw = await redis.get<string>(TRACKS_KEY);
    if (!raw) return res.status(200).json([]);

    const tracks = (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
    const now = Date.now();
    let dirty = false;

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
