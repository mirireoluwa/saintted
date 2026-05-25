import { verifyAdminCookie } from "../../lib-js/adminAuth.js";
import { getRedis, VIDEOS_KEY } from "../../lib-js/redis.js";
import type { FeaturedVideo } from "../../lib/types";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  query?: Record<string, string>;
  body?: Partial<FeaturedVideo>;
};

export default async function handler(
  req: Req,
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");

  const password = process.env.ADMIN_PASSWORD;
  if (!verifyAdminCookie(req.headers?.cookie, password)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const id = parseInt(req.query?.id ?? "", 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id required" });

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const getRaw = async () => {
    const raw = await redis.get<string>(VIDEOS_KEY);
    if (!raw) return [];
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as FeaturedVideo[];
  };

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      const videos = await getRaw();
      const idx = videos.findIndex((v) => v.id === id);
      if (idx === -1) return res.status(404).json({ ok: false, message: "Video not found" });
      videos[idx] = { ...videos[idx], ...req.body, id };
      await redis.set(VIDEOS_KEY, JSON.stringify(videos));
      return res.status(200).json(videos[idx]);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to update video" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const videos = await getRaw();
      const filtered = videos.filter((v) => v.id !== id);
      if (filtered.length === videos.length) {
        return res.status(404).json({ ok: false, message: "Video not found" });
      }
      await redis.set(VIDEOS_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete video" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
