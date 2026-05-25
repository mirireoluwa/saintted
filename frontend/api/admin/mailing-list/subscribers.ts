import { verifyAdminCookie } from "../../lib-js/adminAuth.js";
import { getRedis, SUBSCRIBERS_KEY } from "../../lib-js/redis.js";
import type { Subscriber } from "../../lib/types";

export default async function handler(
  req: { method?: string; headers?: { cookie?: string } },
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

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  try {
    const raw = await redis.get<string>(SUBSCRIBERS_KEY);
    const subscribers = raw
      ? ((typeof raw === "string" ? JSON.parse(raw) : raw) as Subscriber[])
      : [];

    const sorted = subscribers.sort(
      (a, b) => new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime()
    );

    return res.status(200).json({ count: sorted.length, subscribers: sorted });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Failed to fetch subscribers" });
  }
}
