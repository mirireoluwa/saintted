import { getRedis, TRACKS_KEY } from "./lib-js/redis.js";
import type { Track } from "./lib/types.js";

export default async function handler(
  req: { method?: string },
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

  try {
    const redis = getRedis();
    if (!redis) return res.status(200).json([]);

    const raw = await redis.get<string>(TRACKS_KEY);
    if (!raw) return res.status(200).json([]);

    const tracks = (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
    const published = tracks
      .filter((t) => t.is_published !== false)
      .sort((a, b) => a.order - b.order || a.id - b.id);

    return res.status(200).json(published);
  } catch (e) {
    console.error("GET /api/tracks error:", e);
    return res.status(500).json({ ok: false, message: "Failed to fetch tracks" });
  }
}
