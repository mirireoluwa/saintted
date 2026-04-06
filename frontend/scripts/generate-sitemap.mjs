/**
 * Writes public/sitemap.xml with home + published track URLs.
 * Uses VITE_SITE_URL and VITE_API_URL from frontend/.env (or env vars).
 * Run: node scripts/generate-sitemap.mjs (optional: npm run build includes prebuild).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadDotEnv() {
  const out = {};
  try {
    const raw = readFileSync(join(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {
    /* no .env */
  }
  return out;
}

const env = { ...loadDotEnv(), ...process.env };
const siteUrl = (env.VITE_SITE_URL || "https://saintted.com").replace(/\/+$/, "");
const apiBase = (env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const staticUrls = [`${siteUrl}/`];

async function main() {
  const urls = [...staticUrls];
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/tracks/`);
      if (res.ok) {
        const tracks = await res.json();
        if (Array.isArray(tracks)) {
          for (const t of tracks) {
            const slug = typeof t?.slug === "string" ? t.slug.trim() : "";
            if (slug && t?.is_published !== false) {
              urls.push(`${siteUrl}/music/${encodeURIComponent(slug)}`);
            }
          }
        }
      }
    } catch {
      /* offline / wrong API — keep static URLs only */
    }
  }

  const lastmod = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  writeFileSync(join(root, "public", "sitemap.xml"), body, "utf8");
  console.log(`sitemap: ${urls.length} URL(s) → public/sitemap.xml`);
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((e) => {
  console.warn("sitemap generation skipped:", e?.message || e);
  process.exit(0);
});
