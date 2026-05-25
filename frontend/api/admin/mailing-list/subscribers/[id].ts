import { verifyAdminCookie } from "../../../lib-js/adminAuth.js";
import { getRedis, SUBSCRIBERS_KEY } from "../../../lib-js/redis.js";
import type { Subscriber } from "../../../lib/types.js";

export default async function handler(
  req: { method?: string; headers?: { cookie?: string }; query?: Record<string, string> },
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

  if (req.method !== "DELETE") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const id = parseInt(req.query?.id ?? "", 10);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id required" });

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  try {
    const raw = await redis.get<string>(SUBSCRIBERS_KEY);
    const subscribers = raw
      ? ((typeof raw === "string" ? JSON.parse(raw) : raw) as Subscriber[])
      : [];

    const filtered = subscribers.filter((s) => s.id !== id);
    if (filtered.length === subscribers.length) {
      return res.status(404).json({ ok: false, message: "Subscriber not found" });
    }
    await redis.set(SUBSCRIBERS_KEY, JSON.stringify(filtered));
    return res.status(204).json({});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Failed to delete subscriber" });
  }
}
