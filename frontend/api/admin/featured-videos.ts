import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, VIDEOS_KEY } from "../lib-js/redis.js";
import type { FeaturedVideo } from "../lib/types";

type Req = {
  method?: string;
  headers?: { cookie?: string };
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

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const getRaw = async () => {
    const raw = await redis.get<string>(VIDEOS_KEY);
    if (!raw) return [];
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as FeaturedVideo[];
  };

  if (req.method === "GET") {
    try {
      const videos = await getRaw();
      return res.status(200).json(videos.sort((a, b) => a.order - b.order || a.id - b.id));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch videos" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      if (!body.youtube_id?.trim()) {
        return res.status(400).json({ ok: false, message: "youtube_id is required" });
      }
      const videos = await getRaw();
      const video: FeaturedVideo = {
        id: Date.now(),
        title: body.title?.trim() ?? "",
        youtube_id: body.youtube_id.trim(),
        order: typeof body.order === "number" ? body.order : 0,
      };
      videos.push(video);
      await redis.set(VIDEOS_KEY, JSON.stringify(videos));
      return res.status(201).json(video);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to create video" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
