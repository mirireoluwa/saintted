import { verifyAdminCookie } from "../_lib-js/adminAuth.js";
import { getRedis, COUNTDOWN_KEY } from "../_lib-js/redis.js";
import type { ReleaseCountdown } from "../_lib/types.js";
import { DEFAULT_COUNTDOWN } from "../_lib/types.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  body?: Partial<ReleaseCountdown>;
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
