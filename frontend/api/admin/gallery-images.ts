import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, GALLERY_KEY } from "../lib-js/redis.js";
import type { GalleryImage } from "../lib/types.js";
import { put } from "@vercel/blob";

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

function dataUrlToBuffer(dataUrl: string): { buf: Buffer; contentType: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  try {
    return { buf: Buffer.from(m[2], "base64"), contentType: m[1] };
  } catch {
    return null;
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  // Upload action — no Redis needed
  if (req.method === "POST" && req.query?.action === "upload") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({ ok: false, message: "Vercel Blob not configured. Add BLOB_READ_WRITE_TOKEN." });
    }
    const body = req.body ?? {};
    const filename =
      typeof body.filename === "string" && body.filename.trim()
        ? body.filename.trim().replace(/[^a-zA-Z0-9._-]/g, "_")
        : "upload.bin";
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    if (!dataUrl) return res.status(400).json({ ok: false, message: "dataUrl is required" });

    const parsed = dataUrlToBuffer(dataUrl);
    if (!parsed) return res.status(400).json({ ok: false, message: "Invalid data URL" });

    const { buf, contentType } = parsed;
    if (buf.length === 0) return res.status(400).json({ ok: false, message: "Empty file" });
    if (buf.length > 4 * 1024 * 1024) {
      return res.status(413).json({ ok: false, message: "File too large (max 4 MB). For large videos use a URL instead." });
    }

    try {
      const blob = await put(`saintted/${Date.now()}-${filename}`, buf, {
        access: "public",
        addRandomSuffix: true,
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return res.status(200).json({ ok: true, url: blob.url });
    } catch (e) {
      console.error("blob upload error:", e);
      const raw = e instanceof Error ? e.message : String(e);
      const message = /token|unauthori|forbidden|401|403/i.test(raw)
        ? `Blob auth failed: ${raw.slice(0, 160)}. Check BLOB_READ_WRITE_TOKEN.`
        : raw.length < 180 ? raw : "Blob upload failed.";
      return res.status(500).json({ ok: false, message });
    }
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
