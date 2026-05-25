import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, TRACKS_KEY } from "../lib-js/redis.js";
import type { Track } from "../lib/types.js";

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

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "track"
  );
}

function uniqueSlug(base: string, existing: Track[]): string {
  if (!existing.some((t) => t.slug === base)) return base;
  let n = 2;
  while (existing.some((t) => t.slug === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function parse(raw: unknown): Track[] {
  if (!raw) return [];
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const slug = typeof req.query?.slug === "string" ? req.query.slug : "";

  if (req.method === "GET") {
    try {
      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      return res.status(200).json(tracks.sort((a, b) => a.order - b.order || a.id - b.id));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch tracks" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return res.status(400).json({ ok: false, message: "title is required" });

      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";
      const newSlug = rawSlug || uniqueSlug(slugify(title), tracks);

      if (tracks.some((t) => t.slug === newSlug)) {
        return res.status(400).json({ ok: false, message: `Slug "${newSlug}" already exists` });
      }

      const isUnreleased = body.is_unreleased === true;
      const releaseAt = typeof body.release_at === "string" ? body.release_at : null;
      if (isUnreleased && !releaseAt) {
        return res.status(400).json({ ok: false, message: "release_at is required for unreleased tracks" });
      }

      const track: Track = {
        id: Date.now(),
        title,
        slug: newSlug,
        meta: typeof body.meta === "string" ? body.meta.trim() : "",
        art_url: typeof body.art_url === "string" ? body.art_url.trim() : "",
        link_url: typeof body.link_url === "string" ? body.link_url.trim() : "",
        order: typeof body.order === "number" ? body.order : 0,
        description: typeof body.description === "string" ? body.description.trim() : "",
        year: typeof body.year === "number" ? body.year : null,
        youtube_url: typeof body.youtube_url === "string" ? body.youtube_url.trim() : "",
        apple_music_url: typeof body.apple_music_url === "string" ? body.apple_music_url.trim() : "",
        spotify_url: typeof body.spotify_url === "string" ? body.spotify_url.trim() : "",
        is_published: body.is_published !== false,
        is_highlighted: body.is_highlighted === true,
        is_unreleased: isUnreleased,
        release_at: releaseAt,
        presave_url: typeof body.presave_url === "string" ? body.presave_url.trim() : "",
      };

      tracks.push(track);
      await redis.set(TRACKS_KEY, JSON.stringify(tracks));
      return res.status(201).json(track);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to create track" });
    }
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    if (!slug) return res.status(400).json({ ok: false, message: "slug query param required" });
    try {
      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      const idx = tracks.findIndex((t) => t.slug === slug);
      if (idx === -1) return res.status(404).json({ ok: false, message: "Track not found" });

      const body = (req.body ?? {}) as Partial<Track>;
      if (body.is_unreleased && !body.release_at && !tracks[idx].release_at) {
        return res.status(400).json({ ok: false, message: "release_at is required for unreleased tracks" });
      }
      const updated: Track = {
        ...tracks[idx],
        ...body,
        id: tracks[idx].id,
        slug: (typeof body.slug === "string" && body.slug.trim()) ? body.slug.trim() : tracks[idx].slug,
      };
      tracks[idx] = updated;
      await redis.set(TRACKS_KEY, JSON.stringify(tracks));
      return res.status(200).json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to update track" });
    }
  }

  if (req.method === "DELETE") {
    if (!slug) return res.status(400).json({ ok: false, message: "slug query param required" });
    try {
      const tracks = parse(await redis.get<string>(TRACKS_KEY));
      const filtered = tracks.filter((t) => t.slug !== slug);
      if (filtered.length === tracks.length) return res.status(404).json({ ok: false, message: "Track not found" });
      await redis.set(TRACKS_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete track" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
