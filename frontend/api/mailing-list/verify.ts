import { getRedis, SUBSCRIBERS_KEY, PENDING_SUBSCRIBERS_KEY } from "../lib-js/redis.js";
import type { Subscriber, PendingSubscriber } from "../lib/types.js";

type Req = {
  method?: string;
  query?: Record<string, string | string[]>;
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; send: (html: string) => void };
  redirect?: (url: string) => void;
};

async function sendWelcomeEmail(subscriber: Subscriber): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const from = process.env.DEFAULT_FROM_EMAIL?.trim() || "saintted <noreply@saintted.com>";
  const subject = process.env.MAILING_LIST_CONFIRMATION_SUBJECT?.trim() || "you're on the list.";
  const first = subscriber.first_name;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#000;font-family:'Space Mono',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#000;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">
        <tr><td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.3);">saintted's circle</p>
        </td></tr>
        <tr><td style="padding:44px 40px 36px;">
          <h1 style="margin:0 0 28px;font-size:38px;font-weight:400;color:#fff;line-height:1.15;">welcome to<br/>The Circle.</h1>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">hey ${first},</p>
          <p style="margin:0 0 16px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">you're now part of something i hold close — a small, intentional community of people who actually care about the music.</p>
          <p style="margin:0 0 36px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.8;">you'll hear from me when it matters: new music, honest updates, and things i only share in here. glad you're here.</p>
          <table cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 12px;">
            <tr><td><a href="https://saintted.com" style="display:block;padding:13px 30px;background:#fff;color:#000;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;text-align:center;">visit saintted.com</a></td></tr>
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

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [subscriber.email],
      subject,
      html,
      text: `hey ${first},\n\nwelcome to The Circle.\n\nyou'll hear from me when it matters.\n\njoin the whatsapp: https://chat.whatsapp.com/FXNIdq5z0r92PaMzEXQkkF\n\nlove, saintted\nsaintted.com`,
    }),
  });
}

export default async function handler(req: Req, res: Res) {
  const siteUrl = (process.env.VITE_SITE_URL?.trim() || "https://saintted.com").replace(/\/$/, "");
  const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";

  if (!token) {
    return res.status(400).json({ ok: false, message: "Missing verification token." });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ ok: false, message: "Redis not configured." });
  }

  try {
    const rawPending = await redis.get<string>(PENDING_SUBSCRIBERS_KEY);
    const pending = rawPending
      ? ((typeof rawPending === "string" ? JSON.parse(rawPending) : rawPending) as PendingSubscriber[])
      : [];

    const entry = pending.find((p) => p.token === token);
    if (!entry) {
      // Redirect to homepage with error
      if (res.redirect) return res.redirect(`${siteUrl}/?verified=invalid`);
      return res.status(404).json({ ok: false, message: "Verification link is invalid or has expired." });
    }

    // Check token age (24h)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    if (new Date(entry.created_at).getTime() < cutoff) {
      const refreshed = pending.filter((p) => p.token !== token);
      await redis.set(PENDING_SUBSCRIBERS_KEY, JSON.stringify(refreshed));
      if (res.redirect) return res.redirect(`${siteUrl}/?verified=expired`);
      return res.status(410).json({ ok: false, message: "Verification link has expired. Please sign up again." });
    }

    // Move from pending → confirmed subscribers
    const rawSubscribers = await redis.get<string>(SUBSCRIBERS_KEY);
    const subscribers = rawSubscribers
      ? ((typeof rawSubscribers === "string" ? JSON.parse(rawSubscribers) : rawSubscribers) as Subscriber[])
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

    // Remove from pending
    const refreshed = pending.filter((p) => p.token !== token);
    await redis.set(PENDING_SUBSCRIBERS_KEY, JSON.stringify(refreshed));

    if (res.redirect) return res.redirect(`${siteUrl}/?verified=ok`);
    return res.status(200).json({ ok: true, message: "Email confirmed! Welcome to The Circle." });
  } catch (e) {
    console.error("verify error:", e);
    return res.status(500).json({ ok: false, message: "Verification failed." });
  }
}
