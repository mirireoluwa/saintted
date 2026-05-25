import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, GALLERY_KEY } from "../lib-js/redis.js";
import type { GalleryImage } from "../lib/types.js";

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

function parse(raw: unknown): GalleryImage[] {
  if (!raw) return [];
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as GalleryImage[];
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
      const images = parse(await redis.get<string>(GALLERY_KEY));
      return res.status(200).json(images.sort((a, b) => a.order - b.order || a.id - b.id));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch gallery" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
      if (!imageUrl) return res.status(400).json({ ok: false, message: "image_url is required" });

      const images = parse(await redis.get<string>(GALLERY_KEY));
      const image: GalleryImage = {
        id: Date.now(),
        image: imageUrl,
        image_url: imageUrl,
        caption: typeof body.caption === "string" ? body.caption.trim() : "",
        order: typeof body.order === "number" ? body.order : 0,
        created_at: new Date().toISOString(),
      };
      images.push(image);
      await redis.set(GALLERY_KEY, JSON.stringify(images));
      return res.status(201).json(image);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to create gallery image" });
    }
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id query param required" });
    try {
      const images = parse(await redis.get<string>(GALLERY_KEY));
      const idx = images.findIndex((img) => img.id === id);
      if (idx === -1) return res.status(404).json({ ok: false, message: "Image not found" });

      const body = req.body ?? {};
      const updated: GalleryImage = {
        ...images[idx],
        ...(typeof body.image_url === "string" ? { image: body.image_url, image_url: body.image_url } : {}),
        ...(body.caption !== undefined ? { caption: body.caption as string } : {}),
        ...(body.order !== undefined ? { order: body.order as number } : {}),
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
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id query param required" });
    try {
      const images = parse(await redis.get<string>(GALLERY_KEY));
      const filtered = images.filter((img) => img.id !== id);
      if (filtered.length === images.length) return res.status(404).json({ ok: false, message: "Image not found" });
      await redis.set(GALLERY_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete image" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
