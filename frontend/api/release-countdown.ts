import { getRedis, COUNTDOWN_KEY, SHOWS_KEY, ABOUT_KEY } from "./_lib-js/redis.js";
import type { LiveShow, ReleaseCountdown } from "./_lib/types.js";
import { DEFAULT_ABOUT, DEFAULT_COUNTDOWN } from "./_lib/types.js";
import { aboutOrDefault, parseList, sortShows } from "./_lib/siteContent.js";

/**
 * Public site-settings endpoint. Serves the release countdown by default, and — to stay within
 * Vercel's 12-function Hobby limit — also the Shows and About content via `?resource=`.
 * vercel.json rewrites /api/shows → ?resource=shows and /api/about → ?resource=about.
 */
export default async function handler(
  req: { method?: string; query?: Record<string, string | string[]> },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void };
  }
) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const resource = typeof req.query?.resource === "string" ? req.query.resource : "";

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
