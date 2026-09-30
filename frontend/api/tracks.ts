import { getRedis, TRACKS_KEY, SHOWS_KEY, ABOUT_KEY } from "./_lib-js/redis.js";
import type { Track } from "./_lib/types.js";
import { aboutOrDefault, parseList } from "./_lib/siteContent.js";
import { renderShell } from "./_lib/seoShell.js";
import type { LiveShow } from "./_lib/types.js";

type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; send: (body: string) => void };
};

const SITE_URL = (process.env.VITE_SITE_URL?.trim() || "https://saintted.com").replace(/\/$/, "");

/** Serve a public page as index.html with its own SEO metadata and content (see _lib/seoShell.ts). */
async function serveShell(
  req: { headers?: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]> },
  res: Res
) {
  const path = typeof req.query?.path === "string" ? req.query.path : "/";
  const hdr = (k: string) => {
    const v = req.headers?.[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const host = hdr("x-forwarded-host") || hdr("host") || "";
  const origin = process.env.SHELL_ORIGIN || (host ? `${hdr("x-forwarded-proto") || "https"}://${host}` : SITE_URL);

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const page = await fetch(`${origin}/index.html`, { signal: ctl.signal });
    clearTimeout(timer);
    const indexHtml = await page.text();

    let tracks: Track[] = [];
    let shows: LiveShow[] = [];
    let about = null;
    const redis = getRedis();
    if (redis) {
      const [t, sh, ab] = await Promise.all([
        redis.get<string>(TRACKS_KEY),
        redis.get<string>(SHOWS_KEY),
        redis.get<string>(ABOUT_KEY),
      ]);
      tracks = parseList<Track>(t);
      shows = parseList<LiveShow>(sh);
      about = aboutOrDefault(ab);
    }
    const out = renderShell(path, { siteUrl: SITE_URL, indexHtml, tracks, shows, about });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", out.status === 200 ? "public, s-maxage=300, stale-while-revalidate=86400" : "public, s-maxage=60");
    return res.status(out.status).send(out.html);
  } catch (e) {
    // never take the site down: fall back to the plain app shell
    console.error("shell error:", e);
    try {
      const fb = await fetch(`${origin}/index.html`);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(await fb.text());
    } catch {
      return res.status(500).send("Temporarily unavailable");
    }
  }
}

export default async function handler(
  req: { method?: string; headers?: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]> },
  res: Res
) {
  if (req.query?.resource === "shell" && (req.method === "GET" || req.method === "HEAD")) {
    return serveShell(req, res);
  }

  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const slugParam = req.query?.slug;
  const slug = typeof slugParam === "string" ? slugParam.trim() : "";

  // ── Single track by slug ───────────────────────────────────────────────────
  if (slug) {
    res.setHeader("Cache-Control", "no-cache, no-store");
    try {
      const redis = getRedis();
      if (!redis) return res.status(404).json({ ok: false, message: "Track not found" });

      const raw = await redis.get<string>(TRACKS_KEY);
      if (!raw) return res.status(404).json({ ok: false, message: "Track not found" });

      const tracks = (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
      const track = tracks.find((t) => t.slug === slug);
      if (!track) return res.status(404).json({ ok: false, message: "Track not found" });

      const visible = tracks
        .filter((t) => t.is_published !== false && !t.is_archived)
        .sort((a, b) => a.order - b.order || a.id - b.id);

      let previous_slug: string | null = null;
      let next_slug: string | null = null;

      if (track.is_unreleased) {
        const released = visible.filter((t) => !t.is_unreleased);
        previous_slug = released.slice(-1)[0]?.slug ?? null;
        next_slug = released[0]?.slug ?? null;
      } else {
        const idx = visible.findIndex((t) => t.slug === slug);
        previous_slug = visible[idx - 1]?.slug ?? null;
        next_slug = visible[idx + 1]?.slug ?? null;
      }

      return res.status(200).json({ ...track, previous_slug, next_slug });
    } catch (e) {
      console.error("GET /api/tracks?slug= error:", e);
      return res.status(500).json({ ok: false, message: "Failed to fetch track" });
    }
  }

  // ── Track list ─────────────────────────────────────────────────────────────
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  try {
    const redis = getRedis();
    if (!redis) return res.status(200).json([]);

    const raw = await redis.get<string>(TRACKS_KEY);
    if (!raw) return res.status(200).json([]);

    const tracks = (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
    const now = Date.now();
    let dirty = false;

    const processed = tracks.map((t) => {
      let updated = { ...t };

      if (!updated.is_published && updated.publish_at) {
        const publishMs = new Date(updated.publish_at).getTime();
        if (Number.isFinite(publishMs) && publishMs <= now) {
          updated = { ...updated, is_published: true };
          dirty = true;
        }
      }

      if (updated.is_highlighted && updated.highlighted_until) {
        const expireMs = new Date(updated.highlighted_until).getTime();
        if (Number.isFinite(expireMs) && expireMs <= now) {
          updated = { ...updated, is_highlighted: false };
          dirty = true;
        }
      }

      return updated;
    });

    if (dirty) {
      redis.set(TRACKS_KEY, JSON.stringify(processed)).catch((e: unknown) =>
        console.error("tracks auto-update error:", e)
      );
    }

    const published = processed
      .filter((t) => t.is_published !== false && !t.is_archived)
      .sort((a, b) => a.order - b.order || a.id - b.id);

    return res.status(200).json(published);
  } catch (e) {
    console.error("GET /api/tracks error:", e);
    return res.status(500).json({ ok: false, message: "Failed to fetch tracks" });
  }
}
