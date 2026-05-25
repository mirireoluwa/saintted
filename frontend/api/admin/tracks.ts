import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, TRACKS_KEY } from "../lib-js/redis.js";
import type { Track } from "../lib/types";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  body?: Partial<Track> & { slug?: string; title?: string };
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "track";
}

function uniqueSlug(base: string, existing: Track[]): string {
  if (!existing.some((t) => t.slug === base)) return base;
  let n = 2;
  while (existing.some((t) => t.slug === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

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
  if (!redis) {
    return res.status(503).json({ ok: false, message: "Redis not configured" });
  }

  const getRaw = async () => {
    const raw = await redis.get<string>(TRACKS_KEY);
    if (!raw) return [];
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
  };

  if (req.method === "GET") {
    try {
      const tracks = await getRaw();
      return res.status(200).json(tracks.sort((a, b) => a.order - b.order || a.id - b.id));
    } catch (e) {
      console.error("admin GET /api/admin/tracks error:", e);
      return res.status(500).json({ ok: false, message: "Failed to fetch tracks" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      if (!body.title?.trim()) {
        return res.status(400).json({ ok: false, message: "title is required" });
      }

      const tracks = await getRaw();
      const rawSlug = body.slug?.trim() ?? "";
      const slug = rawSlug ? rawSlug : uniqueSlug(slugify(body.title), tracks);

      if (tracks.some((t) => t.slug === slug)) {
        return res.status(400).json({ ok: false, message: `Slug "${slug}" already exists` });
      }

      if (body.is_unreleased && !body.release_at) {
        return res.status(400).json({ ok: false, message: "release_at is required for unreleased tracks" });
      }

      const track: Track = {
        id: Date.now(),
        title: body.title.trim(),
        slug,
        meta: body.meta?.trim() ?? "",
        art_url: body.art_url?.trim() ?? "",
        link_url: body.link_url?.trim() ?? "",
        order: typeof body.order === "number" ? body.order : 0,
        description: body.description?.trim() ?? "",
        year: body.year ?? null,
        youtube_url: body.youtube_url?.trim() ?? "",
        apple_music_url: body.apple_music_url?.trim() ?? "",
        spotify_url: body.spotify_url?.trim() ?? "",
        is_published: body.is_published !== false,
        is_highlighted: body.is_highlighted === true,
        is_unreleased: body.is_unreleased === true,
        release_at: body.release_at ?? null,
        presave_url: body.presave_url?.trim() ?? "",
      };

      tracks.push(track);
      await redis.set(TRACKS_KEY, JSON.stringify(tracks));
      return res.status(201).json(track);
    } catch (e) {
      console.error("admin POST /api/admin/tracks error:", e);
      return res.status(500).json({ ok: false, message: "Failed to create track" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
