import { verifyAdminCookie } from "../_lib-js/adminAuth.js";
import { getRedis, COUNTDOWN_KEY, SHOWS_KEY, ABOUT_KEY } from "../_lib-js/redis.js";
import type { LiveShow, ReleaseCountdown } from "../_lib/types.js";
import { DEFAULT_COUNTDOWN } from "../_lib/types.js";
import { aboutOrDefault, parseList, sortShows, validateAbout, validateShow } from "../_lib/siteContent.js";

/**
 * Admin site-settings endpoint. Handles the release countdown by default, and — to stay within
 * Vercel's 12-function Hobby limit — also Shows (CRUD) and About via `?resource=`.
 * vercel.json rewrites /api/admin/shows → ?resource=shows and /api/admin/about → ?resource=about.
 */
type Req = {
  method?: string;
  headers?: { cookie?: string };
  query?: Record<string, string | string[]>;
  body?: Partial<ReleaseCountdown> & Record<string, unknown>;
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  const resource = typeof req.query?.resource === "string" ? req.query.resource : "";

  // ── Shows ────────────────────────────────────────────────────────────────
  if (resource === "shows") {
    const idStr = typeof req.query?.id === "string" ? req.query.id : "";
    const id = idStr ? parseInt(idStr, 10) : NaN;
    try {
      const shows = parseList<LiveShow>(await redis.get<string>(SHOWS_KEY));

      if (req.method === "GET") return res.status(200).json(sortShows(shows));

      if (req.method === "POST") {
        const v = validateShow((req.body ?? {}) as Record<string, unknown>);
        if (!v.ok) return res.status(400).json({ ok: false, message: v.message });
        const show: LiveShow = { id: Date.now(), created_at: new Date().toISOString(), ...v.value };
        shows.push(show);
        await redis.set(SHOWS_KEY, JSON.stringify(shows));
        return res.status(201).json(show);
      }

      if (req.method === "PATCH" || req.method === "PUT") {
        if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id query param required" });
        const idx = shows.findIndex((s) => s.id === id);
        if (idx === -1) return res.status(404).json({ ok: false, message: "Show not found" });
        const v = validateShow((req.body ?? {}) as Record<string, unknown>, shows[idx]);
        if (!v.ok) return res.status(400).json({ ok: false, message: v.message });
        shows[idx] = { ...shows[idx], ...v.value, id };
        await redis.set(SHOWS_KEY, JSON.stringify(shows));
        return res.status(200).json(shows[idx]);
      }

      if (req.method === "DELETE") {
        if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id query param required" });
        const kept = shows.filter((s) => s.id !== id);
        if (kept.length === shows.length) return res.status(404).json({ ok: false, message: "Show not found" });
        await redis.set(SHOWS_KEY, JSON.stringify(kept));
        return res.status(204).json({});
      }

      return res.status(405).json({ ok: false, message: "Method not allowed" });
    } catch (e) {
      console.error("admin shows error:", e);
      return res.status(500).json({ ok: false, message: "Shows request failed" });
    }
  }

  // ── About ────────────────────────────────────────────────────────────────
  if (resource === "about") {
    try {
      const current = aboutOrDefault(await redis.get<string>(ABOUT_KEY));
      if (req.method === "GET") return res.status(200).json(current);

      if (req.method === "PATCH" || req.method === "PUT") {
        const v = validateAbout((req.body ?? {}) as Record<string, unknown>, current);
        if (!v.ok) return res.status(400).json({ ok: false, message: v.message });
        await redis.set(ABOUT_KEY, JSON.stringify(v.value));
        return res.status(200).json(v.value);
      }

      return res.status(405).json({ ok: false, message: "Method not allowed" });
    } catch (e) {
      console.error("admin about error:", e);
      return res.status(500).json({ ok: false, message: "About request failed" });
    }
  }

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
      const body = req.body ?? {};
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
