import { getRedis, TRACKS_KEY } from "./_lib-js/redis.js";
import type { Track } from "./_lib/types.js";

const SITE_URL = (process.env.VITE_SITE_URL?.trim() || "https://saintted.com").replace(/\/$/, "");

type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
  send?: (body: string) => void;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function handler(
  req: { method?: string },
  res: Res
) {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  const urls: { loc: string; lastmod?: string; priority?: string }[] = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
  ];

  try {
    const redis = getRedis();
    if (redis) {
      const raw = await redis.get<string>(TRACKS_KEY);
      if (raw) {
        const tracks = (typeof raw === "string" ? JSON.parse(raw) : raw) as Track[];
        const now = Date.now();

        tracks
          .filter((t) => {
            if (t.is_published === false) return false;
            // Auto-publish check
            if (!t.is_published && t.publish_at) {
              return new Date(t.publish_at).getTime() <= now;
            }
            return true;
          })
          .sort((a, b) => a.order - b.order || a.id - b.id)
          .forEach((t) => {
            urls.push({
              loc: `${SITE_URL}/music/${encodeURIComponent(t.slug)}`,
              lastmod: t.release_at
                ? new Date(t.release_at).toISOString().slice(0, 10)
                : undefined,
              priority: t.is_highlighted ? "0.9" : "0.7",
            });
          });
      }
    }
  } catch (e) {
    console.error("sitemap generation error:", e);
  }

  const urlsXml = urls
    .map((u) => {
      let xml = `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n`;
      if (u.lastmod) xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
      if (u.priority) xml += `    <priority>${u.priority}</priority>\n`;
      xml += `  </url>`;
      return xml;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>`;

  // Some Vercel adapter shapes expose res.send directly, others via res.status().send()
  if (typeof res.send === "function") {
    res.send(body);
  } else {
    res.status(200).send(body);
  }
}
