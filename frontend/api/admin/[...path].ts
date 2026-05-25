import {
  verifyAdminCookie,
  getExpectedAdminToken,
  setAdminCookieHeader,
  clearAdminCookieHeader,
} from "../lib-js/adminAuth.js";
import {
  getRedis,
  TRACKS_KEY,
  VIDEOS_KEY,
  GALLERY_KEY,
  COUNTDOWN_KEY,
  SUBSCRIBERS_KEY,
} from "../lib-js/redis.js";
import type { Track, FeaturedVideo, GalleryImage, ReleaseCountdown, Subscriber } from "../lib/types.js";
import { DEFAULT_COUNTDOWN } from "../lib/types.js";
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

function dataUrlToBuffer(dataUrl: string): { buf: Buffer; contentType: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  try {
    return { buf: Buffer.from(m[2], "base64"), contentType: m[1] };
  } catch {
    return null;
  }
}

function parseList<T>(raw: unknown): T[] {
  if (!raw) return [];
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as T[];
}

// --- Auth ---

async function handleAuth(action: string, req: Req, res: Res) {
  if (action === "login") {
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return res.status(503).json({ ok: false, message: "ADMIN_PASSWORD is not set" });
    const provided = typeof req.body?.password === "string" ? req.body.password : "";
    if (!provided || provided !== password) return res.status(401).json({ ok: false, message: "Invalid password" });
    const token = getExpectedAdminToken(password);
    res.setHeader("Set-Cookie", setAdminCookieHeader(token));
    return res.status(200).json({ ok: true });
  }
  if (action === "logout") {
    res.setHeader("Set-Cookie", clearAdminCookieHeader());
    return res.status(200).json({ ok: true });
  }
  if (action === "session") {
    if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
      return res.status(401).json({ ok: false });
    }
    return res.status(200).json({ ok: true });
  }
  return res.status(404).json({ ok: false, message: "Not found" });
}

// --- Tracks ---

async function handleTracks(req: Req, res: Res) {
  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  if (req.method === "GET") {
    try {
      const tracks = parseList<Track>(await redis.get<string>(TRACKS_KEY));
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

      const tracks = parseList<Track>(await redis.get<string>(TRACKS_KEY));
      const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";
      const slug = rawSlug || uniqueSlug(slugify(title), tracks);

      if (tracks.some((t) => t.slug === slug)) {
        return res.status(400).json({ ok: false, message: `Slug "${slug}" already exists` });
      }

      const isUnreleased = body.is_unreleased === true;
      const releaseAt = typeof body.release_at === "string" ? body.release_at : null;
      if (isUnreleased && !releaseAt) {
        return res.status(400).json({ ok: false, message: "release_at is required for unreleased tracks" });
      }

      const track: Track = {
        id: Date.now(),
        title,
        slug,
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

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}

async function handleTrack(slug: string, req: Req, res: Res) {
  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      const tracks = parseList<Track>(await redis.get<string>(TRACKS_KEY));
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
    try {
      const tracks = parseList<Track>(await redis.get<string>(TRACKS_KEY));
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

// --- Featured Videos ---

async function handleVideos(req: Req, res: Res) {
  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  if (req.method === "GET") {
    try {
      const videos = parseList<FeaturedVideo>(await redis.get<string>(VIDEOS_KEY));
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

      const videos = parseList<FeaturedVideo>(await redis.get<string>(VIDEOS_KEY));
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

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}

async function handleVideo(idStr: string, req: Req, res: Res) {
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id required" });

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      const videos = parseList<FeaturedVideo>(await redis.get<string>(VIDEOS_KEY));
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
    try {
      const videos = parseList<FeaturedVideo>(await redis.get<string>(VIDEOS_KEY));
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

// --- Gallery Images ---

async function handleGalleryImages(req: Req, res: Res) {
  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  if (req.method === "GET") {
    try {
      const images = parseList<GalleryImage>(await redis.get<string>(GALLERY_KEY));
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

      const images = parseList<GalleryImage>(await redis.get<string>(GALLERY_KEY));
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

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}

async function handleGalleryImage(idStr: string, req: Req, res: Res) {
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id required" });

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      const images = parseList<GalleryImage>(await redis.get<string>(GALLERY_KEY));
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
    try {
      const images = parseList<GalleryImage>(await redis.get<string>(GALLERY_KEY));
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

// --- Release Countdown ---

async function handleCountdown(req: Req, res: Res) {
  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const get = async (): Promise<ReleaseCountdown> => {
    const raw = await redis.get<string>(COUNTDOWN_KEY);
    if (!raw) return { ...DEFAULT_COUNTDOWN };
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as ReleaseCountdown;
  };

  if (req.method === "GET") {
    try {
      return res.status(200).json(await get());
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch countdown" });
    }
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      const body = (req.body ?? {}) as Partial<ReleaseCountdown>;
      const current = await get();
      const enabled = "enabled" in body ? Boolean(body.enabled) : current.enabled;
      const release_at = "release_at" in body ? (body.release_at ?? null) : current.release_at;
      if (enabled && !release_at) {
        return res.status(400).json({ ok: false, message: "release_at is required when countdown is enabled" });
      }
      const updated: ReleaseCountdown = { ...current, ...body, id: 1, enabled, release_at };
      await redis.set(COUNTDOWN_KEY, JSON.stringify(updated));
      return res.status(200).json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to update countdown" });
    }
  }

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}

// --- Mailing List ---

async function handleMailingList(subPath: string[], req: Req, res: Res) {
  const [sub, idStr] = subPath;

  if (sub === "subscribers") {
    const redis = getRedis();
    if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

    if (!idStr) {
      if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });
      try {
        const subscribers = parseList<Subscriber>(await redis.get<string>(SUBSCRIBERS_KEY));
        const sorted = [...subscribers].sort(
          (a, b) => new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime()
        );
        return res.status(200).json({ count: sorted.length, subscribers: sorted });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, message: "Failed to fetch subscribers" });
      }
    }

    if (req.method !== "DELETE") return res.status(405).json({ ok: false, message: "Method not allowed" });
    const id = parseInt(idStr, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id required" });
    try {
      const subscribers = parseList<Subscriber>(await redis.get<string>(SUBSCRIBERS_KEY));
      const filtered = subscribers.filter((s) => s.id !== id);
      if (filtered.length === subscribers.length) return res.status(404).json({ ok: false, message: "Subscriber not found" });
      await redis.set(SUBSCRIBERS_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete subscriber" });
    }
  }

  if (sub === "broadcast") {
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

    const body = req.body ?? {};
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const html = typeof body.html === "string" ? body.html.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!subject) return res.status(400).json({ ok: false, message: "subject is required" });
    if (!html) return res.status(400).json({ ok: false, message: "html is required" });

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) return res.status(503).json({ ok: false, message: "RESEND_API_KEY is not configured" });

    const redis = getRedis();
    if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

    try {
      const subscribers = parseList<Subscriber>(await redis.get<string>(SUBSCRIBERS_KEY));
      if (subscribers.length === 0) return res.status(200).json({ sent: 0, message: "No subscribers found." });

      const from = process.env.DEFAULT_FROM_EMAIL?.trim() || "saintted <noreply@saintted.com>";
      let totalSent = 0;

      for (let i = 0; i < subscribers.length; i += 100) {
        const batch = subscribers.slice(i, i + 100);
        const messages = batch.map((s) => ({
          from,
          to: [s.email],
          subject,
          html,
          ...(text ? { text } : {}),
        }));
        const resp = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(messages),
        });
        if (!resp.ok) {
          const err = await resp.text().catch(() => resp.statusText);
          throw new Error(`Resend batch failed (${resp.status}): ${err}`);
        }
        totalSent += batch.length;
      }
      return res.status(200).json({ sent: totalSent });
    } catch (e) {
      console.error("broadcast error:", e);
      return res.status(500).json({ ok: false, message: String(e) });
    }
  }

  return res.status(404).json({ ok: false, message: "Not found" });
}

// --- Upload ---

async function handleUpload(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

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
      ? `Blob auth failed: ${raw.slice(0, 160)}. Check BLOB_READ_WRITE_TOKEN in Vercel.`
      : raw.length < 180 ? raw : "Blob upload failed.";
    return res.status(500).json({ ok: false, message });
  }
}

// --- Main router ---

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  const rawPath = req.query?.path;
  const pathParts: string[] = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : [];
  const [resource, ...rest] = pathParts;

  if (resource === "auth") return handleAuth(rest[0] ?? "", req, res);

  if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  switch (resource) {
    case "tracks":
      return rest[0] ? handleTrack(rest[0], req, res) : handleTracks(req, res);
    case "featured-videos":
      return rest[0] ? handleVideo(rest[0], req, res) : handleVideos(req, res);
    case "gallery-images":
      return rest[0] ? handleGalleryImage(rest[0], req, res) : handleGalleryImages(req, res);
    case "release-countdown":
      return handleCountdown(req, res);
    case "mailing-list":
      return handleMailingList(rest, req, res);
    case "upload":
      return handleUpload(req, res);
    default:
      return res.status(404).json({ ok: false, message: "Not found" });
  }
}
