import { verifyAdminCookie } from "../../lib-js/adminAuth.js";
import { getRedis, TRACKS_KEY } from "../../lib-js/redis.js";
import type { Track } from "../../lib/types.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  query?: Record<string, string>;
  body?: Partial<Track>;
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

  const slug = req.query?.slug ?? "";
  if (!slug) return res.status(400).json({ ok: false, message: "slug required" });

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ ok: false, message: "Redis not configured" });
  }

  const getRaw = async () => {
    const raw = await redis.get<string>(TRACKS_KEY);
    if (!raw) return [];
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
  };

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      const tracks = await getRaw();
      const idx = tracks.findIndex((t) => t.slug === slug);
      if (idx === -1) return res.status(404).json({ ok: false, message: "Track not found" });

      const body = req.body ?? {};
      if (body.is_unreleased && !body.release_at && !tracks[idx].release_at) {
        return res.status(400).json({ ok: false, message: "release_at is required for unreleased tracks" });
      }

      const updated: Track = {
        ...tracks[idx],
        ...body,
        id: tracks[idx].id,
        slug: (body.slug?.trim() || tracks[idx].slug),
      };

      tracks[idx] = updated;
      await redis.set(TRACKS_KEY, JSON.stringify(tracks));
      return res.status(200).json(updated);
    } catch (e) {
      console.error("admin PATCH /api/admin/tracks/[slug] error:", e);
      return res.status(500).json({ ok: false, message: "Failed to update track" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const tracks = await getRaw();
      const filtered = tracks.filter((t) => t.slug !== slug);
      if (filtered.length === tracks.length) {
        return res.status(404).json({ ok: false, message: "Track not found" });
      }
      await redis.set(TRACKS_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error("admin DELETE /api/admin/tracks/[slug] error:", e);
      return res.status(500).json({ ok: false, message: "Failed to delete track" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
