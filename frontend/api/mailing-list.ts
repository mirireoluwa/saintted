/**
 * Unified public mailing-list endpoint.
 *
 * POST /api/mailing-list              → subscribe
 * GET  /api/mailing-list?action=verify&token=<token>  → confirm email (double opt-in)
 */
import { getRedis, SUBSCRIBERS_KEY, PENDING_SUBSCRIBERS_KEY } from "./_lib-js/redis.js";
import type { Subscriber, PendingSubscriber } from "./_lib/types.js";
import type { IncomingMessage } from "http";

const RATE_LIMIT_WINDOW_SEC = 3600;
const RATE_LIMIT_MAX = 5;

type Req = IncomingMessage & {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
  redirect?: (url: string) => void;
};

async function readJsonBody(req: Req): Promise<Record<string, string>> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    if (typeof req.body === "object") return req.body as Record<string, string>;
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8"))); }
      catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendVerificationEmail(pending: PendingSubscriber, siteUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;
  const from = process.env.DEFAULT_FROM_EMAIL?.trim() || "saintted <noreply@saintted.com>";
  const verifyUrl = `${siteUrl}/api/mailing-list?action=verify&token=${pending.token}`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#000;font-family:'Space Mono',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#000;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">
        <tr><td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.3);">saintted's circle</p>
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <h1 style="margin:0 0 28px;font-size:32px;font-weight:400;color:#fff;line-height:1.15;">confirm your<br/>email.</h1>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">hey ${pending.first_name},</p>
          <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">click the button below to confirm your email and join The Circle.</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:13px 30px;background:#fff;color:#000;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;">Confirm email</a>
          <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">If you didn't sign up, ignore this. Link expires in 24 hours.</p>
        </td></tr>
        <tr><td style="padding:28px 40px;border-top:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0;font-size:10px;letter-spacing:0.1em;text-transform:lowercase;color:rgba(255,255,255,0.2);">© ${new Date().getFullYear()} saintted.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [pending.email],
      subject: "confirm your email — saintted's circle",
      html,
      text: `hey ${pending.first_name},\n\nconfirm your email:\n${verifyUrl}\n\nExpires in 24 hours.\n\nlove, saintted`,
    }),
  });
}

async function sendWelcomeEmail(subscriber: Subscriber): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;
  const from = process.env.DEFAULT_FROM_EMAIL?.trim() || "saintted <noreply@saintted.com>";
  const subject = process.env.MAILING_LIST_CONFIRMATION_SUBJECT?.trim() || "you're on the list.";
  const first = subscriber.first_name;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#000000;font-family:'Space Mono',ui-monospace,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#000000;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">
        <tr><td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.3);">saintted's circle</p>
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <h1 style="margin:0 0 28px;font-size:38px;font-weight:400;color:#ffffff;line-height:1.15;">welcome to<br/>The Circle.</h1>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">hey ${first},</p>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">you're now part of something i hold close — a small, intentional community of people who actually care about the music.</p>
          <p style="margin:0 0 36px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">you'll hear from me when it matters: new music, honest updates, and things i only share in here. glad you're here.</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 12px;">
            <tr><td><a href="https://saintted.com" style="display:block;padding:13px 30px;background:#ffffff;color:#000000;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;text-align:center;">visit saintted.com</a></td></tr>
            <tr><td><a href="https://chat.whatsapp.com/FXNIdq5z0r92PaMzEXQkkF" style="display:block;padding:13px 30px;background:transparent;color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;">join the whatsapp</a></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px;border-top:1px solid rgba(255,255,255,0.08);">
          <img src="https://saintted.com/love-saintted.png" alt="love, saintted" width="120" style="display:block;height:auto;margin-bottom:16px;opacity:0.8;"/>
          <p style="margin:0;font-size:10px;letter-spacing:0.1em;text-transform:lowercase;color:rgba(255,255,255,0.2);">© ${new Date().getFullYear()} saintted. all rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text = `hey ${first},\n\nwelcome to The Circle.\n\nyou're now part of something i hold close.\n\nyou'll hear from me when it matters.\n\njoin the whatsapp: https://chat.whatsapp.com/FXNIdq5z0r92PaMzEXQkkF\n\nlove, saintted\nsaintted.com`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [subscriber.email], subject, html, text }),
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Req, res: Res) {
  res.setHeader("Content-Type", "application/json");
  const siteUrl = (process.env.VITE_SITE_URL?.trim() || "https://saintted.com").replace(/\/$/, "");

  // ── GET: email verification ───────────────────────────────────────────────
  if (req.method === "GET") {
    const action = typeof req.query?.action === "string" ? req.query.action : "";
    if (action !== "verify") {
      return res.status(405).json({ ok: false, message: "Method not allowed" });
    }

    const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
    if (!token) return res.status(400).json({ ok: false, message: "Missing token." });

    const redis = getRedis();
    if (!redis) return res.status(503).json({ ok: false, message: "Redis not configured." });

    try {
      const rawPending = await redis.get<string>(PENDING_SUBSCRIBERS_KEY);
      const pending = rawPending
        ? ((typeof rawPending === "string" ? JSON.parse(rawPending) : rawPending) as PendingSubscriber[])
        : [];

      const entry = pending.find((p) => p.token === token);
      if (!entry) {
        if (res.redirect) return res.redirect(`${siteUrl}/?verified=invalid`);
        return res.status(404).json({ ok: false, message: "Link invalid or expired." });
      }

      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      if (new Date(entry.created_at).getTime() < cutoff) {
        await redis.set(PENDING_SUBSCRIBERS_KEY, JSON.stringify(pending.filter((p) => p.token !== token)));
        if (res.redirect) return res.redirect(`${siteUrl}/?verified=expired`);
        return res.status(410).json({ ok: false, message: "Link expired. Please sign up again." });
      }

      const rawSubs = await redis.get<string>(SUBSCRIBERS_KEY);
      const subscribers = rawSubs
        ? ((typeof rawSubs === "string" ? JSON.parse(rawSubs) : rawSubs) as Subscriber[])
        : [];

      if (!subscribers.some((s) => s.email === entry.email)) {
        const subscriber: Subscriber = {
          id: Date.now(),
          first_name: entry.first_name,
          last_name: entry.last_name,
          email: entry.email,
          subscribed_at: new Date().toISOString(),
        };
        subscribers.push(subscriber);
        await redis.set(SUBSCRIBERS_KEY, JSON.stringify(subscribers));
        sendWelcomeEmail(subscriber).catch((e) => console.error("Welcome email error:", e));
      }

      await redis.set(PENDING_SUBSCRIBERS_KEY, JSON.stringify(pending.filter((p) => p.token !== token)));

      if (res.redirect) return res.redirect(`${siteUrl}/?verified=ok`);
      return res.status(200).json({ ok: true, message: "Email confirmed! Welcome to The Circle." });
    } catch (e) {
      console.error("verify error:", e);
      return res.status(500).json({ ok: false, message: "Verification failed." });
    }
  }

  // ── POST: subscribe ───────────────────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const parsed = await readJsonBody(req);
  const first_name = (parsed.first_name ?? "").trim();
  const last_name = (parsed.last_name ?? "").trim();
  const email = (parsed.email ?? "").trim().toLowerCase();

  if (!first_name) return res.status(400).json({ first_name: ["This field is required."] });
  if (!last_name)  return res.status(400).json({ last_name:  ["This field is required."] });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ email: ["Enter a valid email address."] });

  const redis = getRedis();
  if (!redis) return res.status(503).json({ ok: false, message: "Service unavailable." });

  // Rate limit
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim()) || "unknown";
  const rlKey = `saintted:rate:subscribe:${ip}`;
  try {
    const count = await redis.incr(rlKey);
    if (count === 1) await redis.expire(rlKey, RATE_LIMIT_WINDOW_SEC);
    if (count > RATE_LIMIT_MAX)
      return res.status(429).json({ ok: false, message: "Too many requests. Try again later." });
  } catch { /* allow through on Redis error */ }

  const requireConfirmation = process.env.REQUIRE_EMAIL_CONFIRMATION === "true";

  try {
    const rawSubs = await redis.get<string>(SUBSCRIBERS_KEY);
    const subscribers = rawSubs
      ? ((typeof rawSubs === "string" ? JSON.parse(rawSubs) : rawSubs) as Subscriber[])
      : [];

    if (subscribers.some((s) => s.email === email))
      return res.status(200).json({ message: "You're already on the list!", already_subscribed: true });

    if (requireConfirmation) {
      const rawPending = await redis.get<string>(PENDING_SUBSCRIBERS_KEY);
      const pending = rawPending
        ? ((typeof rawPending === "string" ? JSON.parse(rawPending) : rawPending) as PendingSubscriber[])
        : [];

      const alreadyPending = pending.find((p) => p.email === email);
      if (alreadyPending) {
        sendVerificationEmail(alreadyPending, siteUrl).catch((e) => console.error("Re-send error:", e));
        return res.status(200).json({ message: "Check your email to confirm.", pending: true });
      }

      const token = generateToken();
      const entry: PendingSubscriber = { token, first_name, last_name, email, created_at: new Date().toISOString() };
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const fresh = pending.filter((p) => new Date(p.created_at).getTime() > cutoff);
      fresh.push(entry);
      await redis.set(PENDING_SUBSCRIBERS_KEY, JSON.stringify(fresh));
      sendVerificationEmail(entry, siteUrl).catch((e) => console.error("Verify email error:", e));
      return res.status(201).json({ message: "Check your email to confirm.", pending: true });
    }

    const subscriber: Subscriber = {
      id: Date.now(), first_name, last_name, email, subscribed_at: new Date().toISOString(),
    };
    subscribers.push(subscriber);
    await redis.set(SUBSCRIBERS_KEY, JSON.stringify(subscribers));
    sendWelcomeEmail(subscriber).catch((e) => console.error("Welcome email error:", e));

    return res.status(201).json({ message: "You're on the list!", already_subscribed: false });
  } catch (e) {
    console.error("subscribe error:", e);
    return res.status(500).json({ ok: false, message: "Failed to subscribe." });
  }
}
