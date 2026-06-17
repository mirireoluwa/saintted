import { getRedis, COUNTDOWN_KEY } from "./_lib-js/redis.js";
import type { ReleaseCountdown } from "./_lib/types.js";
import { DEFAULT_COUNTDOWN } from "./_lib/types.js";

export default async function handler(
  req: { method?: string },
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
