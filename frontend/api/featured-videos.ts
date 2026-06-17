import { getRedis, VIDEOS_KEY } from "./_lib-js/redis.js";
import type { FeaturedVideo } from "./_lib/types.js";

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

    const raw = await redis.get<string>(VIDEOS_KEY);
    if (!raw) return res.status(200).json([]);

    const videos = (typeof raw === "string" ? JSON.parse(raw) : raw) as FeaturedVideo[];
    return res.status(200).json(videos.sort((a, b) => a.order - b.order || a.id - b.id));
  } catch (e) {
    console.error("GET /api/featured-videos error:", e);
    return res.status(500).json({ ok: false, message: "Failed to fetch videos" });
  }
}
