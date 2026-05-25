import { getRedis, TRACKS_KEY } from "../lib-js/redis.js";
import type { Track } from "../lib/types.js";

export default async function handler(
  req: { method?: string; query?: Record<string, string> },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const slug = req.query?.slug ?? "";
  if (!slug) return res.status(400).json({ ok: false, message: "slug required" });

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
    console.error("GET /api/tracks/[slug] error:", e);
    return res.status(500).json({ ok: false, message: "Failed to fetch track" });
  }
}
