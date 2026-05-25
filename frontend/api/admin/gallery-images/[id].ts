import { verifyAdminCookie } from "../../lib-js/adminAuth.js";
import { getRedis, GALLERY_KEY } from "../../lib-js/redis.js";
import type { GalleryImage } from "../../lib/types";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  query?: Record<string, string>;
  body?: { image_url?: string; caption?: string; order?: number };
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
    const raw = await redis.get<string>(GALLERY_KEY);
    if (!raw) return [];
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as GalleryImage[];
  };

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      const images = await getRaw();
      const idx = images.findIndex((img) => img.id === id);
      if (idx === -1) return res.status(404).json({ ok: false, message: "Image not found" });

      const body = req.body ?? {};
      const updated: GalleryImage = {
        ...images[idx],
        ...(body.image_url ? { image: body.image_url, image_url: body.image_url } : {}),
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
        ...(body.order !== undefined ? { order: body.order } : {}),
        id,
      };
      images[idx] = updated;
      await redis.set(GALLERY_KEY, JSON.stringify(images));
      return res.status(200).json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to update image" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const images = await getRaw();
      const filtered = images.filter((img) => img.id !== id);
      if (filtered.length === images.length) {
        return res.status(404).json({ ok: false, message: "Image not found" });
      }
      await redis.set(GALLERY_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete image" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
