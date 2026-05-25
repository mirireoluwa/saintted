import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, GALLERY_KEY } from "../lib-js/redis.js";
import type { GalleryImage } from "../lib/types.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
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

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const getRaw = async () => {
    const raw = await redis.get<string>(GALLERY_KEY);
    if (!raw) return [];
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as GalleryImage[];
  };

  if (req.method === "GET") {
    try {
      const images = await getRaw();
      return res.status(200).json(images.sort((a, b) => a.order - b.order || a.id - b.id));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch gallery" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      const imageUrl = body.image_url?.trim() ?? "";
      if (!imageUrl) {
        return res.status(400).json({ ok: false, message: "image_url is required (upload the file first via /api/admin/upload)" });
      }
      const images = await getRaw();
      const image: GalleryImage = {
        id: Date.now(),
        image: imageUrl,
        image_url: imageUrl,
        caption: body.caption?.trim() ?? "",
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

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
