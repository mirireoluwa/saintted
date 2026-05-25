import { verifyAdminCookie } from "../../lib-js/adminAuth.js";
import { getRedis, SUBSCRIBERS_KEY } from "../../lib-js/redis.js";
import type { Subscriber } from "../../lib/types.js";

type Req = {
  method?: string;
  headers?: { cookie?: string };
  body?: { subject?: string; html?: string; text?: string };
};

export default async function handler(
  req: Req,
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

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const subject = req.body?.subject?.trim() ?? "";
  const html = req.body?.html?.trim() ?? "";
  const text = req.body?.text?.trim() ?? "";

  if (!subject) return res.status(400).json({ ok: false, message: "subject is required" });
  if (!html) return res.status(400).json({ ok: false, message: "html is required" });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ ok: false, message: "RESEND_API_KEY is not configured" });
  }

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured" });

  try {
    const raw = await redis.get<string>(SUBSCRIBERS_KEY);
    const subscribers = raw
      ? ((typeof raw === "string" ? JSON.parse(raw) : raw) as Subscriber[])
      : [];

    if (subscribers.length === 0) {
      return res.status(200).json({ sent: 0, message: "No subscribers found." });
    }

    const from = process.env.DEFAULT_FROM_EMAIL?.trim() || "saintted <noreply@saintted.com>";
    const BATCH_SIZE = 100;
    let totalSent = 0;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const messages = batch.map((s) => ({
        from,
        to: [s.email],
        subject,
        html,
        ...(text ? { text } : {}),
      }));

      const resp = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
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
