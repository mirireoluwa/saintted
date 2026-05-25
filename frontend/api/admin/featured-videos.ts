import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, VIDEOS_KEY } from "../lib-js/redis.js";
import type { FeaturedVideo } from "../lib/types.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  query?: Record<string, string | string[]>;
  body?: Record<string, unknown>;
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

function parse(raw: unknown): FeaturedVideo[] {
  if (!raw) return [];
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as FeaturedVideo[];
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const idStr = typeof req.query?.id === "string" ? req.query.id : "";
  const id = idStr ? parseInt(idStr, 10) : NaN;

  if (req.method === "GET") {
    try {
      const videos = parse(await redis.get<string>(VIDEOS_KEY));
      return res.status(200).json(videos.sort((a, b) => a.order - b.order || a.id - b.id));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch videos" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      const youtubeId = typeof body.youtube_id === "string" ? body.youtube_id.trim() : "";
      if (!youtubeId) return res.status(400).json({ ok: false, message: "youtube_id is required" });

      const videos = parse(await redis.get<string>(VIDEOS_KEY));
      const video: FeaturedVideo = {
        id: Date.now(),
        title: typeof body.title === "string" ? body.title.trim() : "",
        youtube_id: youtubeId,
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

  if (req.method === "PATCH" || req.method === "PUT") {
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id query param required" });
    try {
      const videos = parse(await redis.get<string>(VIDEOS_KEY));
      const idx = videos.findIndex((v) => v.id === id);
      if (idx === -1) return res.status(404).json({ ok: false, message: "Video not found" });
      videos[idx] = { ...videos[idx], ...(req.body as Partial<FeaturedVideo>), id };
      await redis.set(VIDEOS_KEY, JSON.stringify(videos));
      return res.status(200).json(videos[idx]);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to update video" });
    }
  }

  if (req.method === "DELETE") {
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id query param required" });
    try {
      const videos = parse(await redis.get<string>(VIDEOS_KEY));
      const filtered = videos.filter((v) => v.id !== id);
      if (filtered.length === videos.length) return res.status(404).json({ ok: false, message: "Video not found" });
      await redis.set(VIDEOS_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete video" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
