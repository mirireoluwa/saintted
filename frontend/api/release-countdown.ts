import { getRedis, COUNTDOWN_KEY, SHOWS_KEY, ABOUT_KEY, STORY_KEY } from "./_lib-js/redis.js";
import type { LiveShow, ReleaseCountdown } from "./_lib/types.js";
import { DEFAULT_ABOUT, DEFAULT_COUNTDOWN } from "./_lib/types.js";
import { aboutOrDefault, parseList, sortShows } from "./_lib/siteContent.js";
import { cleanStory } from "./_lib/siteContent.js";
import { dayKey, fieldsFor, parseEvent, visitorsKey } from "./_lib/analytics.js";

/**
 * Public site-settings endpoint. Serves the release countdown by default, and — to stay within
 * Vercel's 12-function Hobby limit — also the Shows and About content via `?resource=`.
 * vercel.json rewrites /api/shows → ?resource=shows and /api/about → ?resource=about.
 */
export default async function handler(
  req: { method?: string; query?: Record<string, string | string[]>; body?: unknown },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");

  const resource = typeof req.query?.resource === "string" ? req.query.resource : "";

  // Anonymous site analytics: POST /api/event → counters in Redis. Always answers 204-ish so the site never waits.
  if (resource === "event") {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });
    try {
      const ev = parseEvent(typeof req.body === "string" ? JSON.parse(req.body) : req.body);
      const redis = getRedis();
      if (ev && redis) {
        const fields = fieldsFor(ev);
        const now = new Date();
        const pipe = redis.pipeline();
        for (const f of fields) pipe.hincrby(dayKey(now), f, 1);
        if (ev.type === "pageview") pipe.sadd(visitorsKey(now), ev.visitor);
        if (fields.length || ev.type === "pageview") {
          pipe.expire(dayKey(now), 60 * 60 * 24 * 400);
          pipe.expire(visitorsKey(now), 60 * 60 * 24 * 400);
        }
        await pipe.exec();
      }
    } catch (e) {
      console.error("POST /api/event error:", e);
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  if (resource === "shows") {
    try {
      const redis = getRedis();
      if (!redis) return res.status(200).json([]);
      const shows = parseList<LiveShow>(await redis.get<string>(SHOWS_KEY));
      return res.status(200).json(sortShows(shows));
    } catch (e) {
      console.error("GET /api/shows error:", e);
      return res.status(200).json([]);
    }
  }

  if (resource === "story") {
    try {
      const redis = getRedis();
      const raw = redis ? await redis.get<string>(STORY_KEY) : null;
      const cfg = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
      return res.status(200).json(cleanStory(cfg));
    } catch (e) {
      console.error("GET /api/story error:", e);
      return res.status(200).json({ order: [], hidden: [] });
    }
  }

  if (resource === "about") {
    try {
      const redis = getRedis();
      if (!redis) return res.status(200).json(DEFAULT_ABOUT);
      return res.status(200).json(aboutOrDefault(await redis.get<string>(ABOUT_KEY)));
    } catch (e) {
      console.error("GET /api/about error:", e);
      return res.status(200).json(DEFAULT_ABOUT);
    }
  }

  try {
    const redis = getRedis();
    if (!redis) return res.status(200).json(DEFAULT_COUNTDOWN);

    const raw = await redis.get<string>(COUNTDOWN_KEY);
    if (!raw) return res.status(200).json(DEFAULT_COUNTDOWN);

    const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as ReleaseCountdown;
    return res.status(200).json(data);
  } catch (e) {
    console.error("GET /api/release-countdown error:", e);
    return res.status(200).json(DEFAULT_COUNTDOWN);
  }
}
