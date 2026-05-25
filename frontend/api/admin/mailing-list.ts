import { verifyAdminCookie } from "../lib-js/adminAuth.js";
import { getRedis, SUBSCRIBERS_KEY } from "../lib-js/redis.js";
import type { Subscriber } from "../lib/types.js";

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

function parse(raw: unknown): Subscriber[] {
  if (!raw) return [];
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as Subscriber[];
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");

  if (!verifyAdminCookie(req.headers?.cookie, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  if (req.method === "GET") {
    try {
      const subscribers = parse(await redis.get<string>(SUBSCRIBERS_KEY));
      const sorted = [...subscribers].sort(
        (a, b) => new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime()
      );
      return res.status(200).json({ count: sorted.length, subscribers: sorted });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to fetch subscribers" });
    }
  }

  if (req.method === "DELETE") {
    const idStr = typeof req.query?.id === "string" ? req.query.id : "";
    const id = parseInt(idStr, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "id query param required" });
    try {
      const subscribers = parse(await redis.get<string>(SUBSCRIBERS_KEY));
      const filtered = subscribers.filter((s) => s.id !== id);
      if (filtered.length === subscribers.length) return res.status(404).json({ ok: false, message: "Subscriber not found" });
      await redis.set(SUBSCRIBERS_KEY, JSON.stringify(filtered));
      return res.status(204).json({});
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: "Failed to delete subscriber" });
    }
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const html = typeof body.html === "string" ? body.html.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!subject) return res.status(400).json({ ok: false, message: "subject is required" });
    if (!html) return res.status(400).json({ ok: false, message: "html is required" });

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) return res.status(503).json({ ok: false, message: "RESEND_API_KEY is not configured" });

    try {
      const subscribers = parse(await redis.get<string>(SUBSCRIBERS_KEY));
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

  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
