/**
 * Search-engine shell. The site is a single-page app, so crawlers that don't run JavaScript (many social
 * scrapers, some Bing/Yandex/Baidu passes) would only ever see the generic home-page <head>.
 * For each public URL we take the built index.html and swap in that page's own title, description,
 * canonical, Open Graph/Twitter tags, JSON-LD and a plain-HTML copy of the content inside #root
 * (React replaces it the moment the app loads). Unknown track URLs answer with a real 404.
 */
import type { AboutContent, LiveShow, Track } from "./types.js";

export interface ShellData {
  siteUrl: string;
  indexHtml: string;
  tracks: Track[];
  shows: LiveShow[];
  about: AboutContent | null;
}

const HOME_DESC =
  "A Nigerian artist and producer creating experimental alternative and afrobeats songs. Stream singles, watch official videos, and explore the latest releases.";

const PAGES: Record<string, { title: string; description: string }> = {
  "/": { title: "saintted", description: HOME_DESC },
  "/music": {
    title: "music · saintted",
    description: "Every release from Saintted, a Nigerian artist and producer. Stream singles and see what's next.",
  },
  "/media": {
    title: "media · saintted",
    description: "Videos, photos and visuals from Saintted, a Nigerian artist and producer.",
  },
  "/shows": { title: "shows · saintted", description: "Upcoming live shows and events from Saintted." },
  "/about": {
    title: "about · saintted",
    description:
      "About Saintted, a Nigerian artist and producer communicating the human experience through his perspective.",
  },
};

const LOCAL_COVERS: Record<string, string> = {
  "one-chance": "/one-chance-cover.png",
  shimmer: "/shimmer-cover.jpg",
  hyperphoria: "/hyperphoria-cover.jpg",
  runaway: "/runaway-cover.png",
};

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const jsonLd = (o: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

const abs = (siteUrl: string, p: string) => (/^https?:\/\//i.test(p) ? p : `${siteUrl}${p.startsWith("/") ? p : `/${p}`}`);

function visibleTracks(tracks: Track[]): Track[] {
  return tracks.filter((t) => t.is_published !== false).sort((a, b) => a.order - b.order || a.id - b.id);
}

interface Built {
  status: number;
  title: string;
  description: string;
  canonicalPath: string;
  ogType: "website" | "music.song";
  image?: string;
  noindex?: boolean;
  ld: unknown[];
  body: string;
}

export function buildPage(path: string, d: ShellData): Built {
  const site = d.siteUrl;
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";
  const tracks = visibleTracks(d.tracks);
  const trackLinks = tracks.length
    ? `<ul>${tracks.map((t) => `<li><a href="/music/${esc(encodeURIComponent(t.slug))}">${esc(t.title)}</a> ${esc(String(t.year ?? ""))}</li>`).join("")}</ul>`
    : "";
  const nav = `<nav><a href="/">home</a> <a href="/music">music</a> <a href="/media">media</a> <a href="/shows">shows</a> <a href="/about">about</a></nav>`;

  const breadcrumb = (items: [string, string][]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(site, p) })),
  });

  // ── track page ──
  const m = clean.match(/^\/music\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const t = tracks.find((x) => x.slug === slug);
    if (!t) {
      return {
        status: 404,
        title: "Page not found · saintted",
        description: "This page doesn't exist.",
        canonicalPath: clean,
        ogType: "website",
        noindex: true,
        ld: [],
        body: `<main><h1>Page not found</h1><p>This page doesn't exist.</p>${nav}</main>`,
      };
    }
    const upcoming = Boolean(t.is_unreleased) && t.release_at && new Date(t.release_at).getTime() > Date.now();
    const desc = ((t.description || "").trim().replace(/\s+/g, " ").slice(0, 160)) || `${t.meta || "Single"} by Saintted`;
    const cover = t.art_url?.trim() || LOCAL_COVERS[t.slug] || "";
    const links = [
      t.spotify_url && `<a href="${esc(t.spotify_url)}">Spotify</a>`,
      t.apple_music_url && `<a href="${esc(t.apple_music_url)}">Apple Music</a>`,
      t.youtube_url && `<a href="${esc(t.youtube_url)}">YouTube</a>`,
    ].filter(Boolean);
    const ld: unknown[] = [
      breadcrumb([["home", "/"], ["music", "/music"], [t.title, `/music/${encodeURIComponent(t.slug)}`]]),
    ];
    if (!upcoming) {
      ld.push({
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: t.title,
        url: abs(site, `/music/${encodeURIComponent(t.slug)}`),
        ...(cover ? { image: abs(site, cover) } : {}),
        ...(t.year ? { datePublished: String(t.year) } : {}),
        byArtist: { "@type": "MusicGroup", name: "Saintted", url: site },
        ...(t.spotify_url || t.apple_music_url ? { sameAs: [t.spotify_url, t.apple_music_url].filter(Boolean) } : {}),
      });
    }
    return {
      status: 200,
      title: upcoming ? `${t.title} · unreleased · saintted` : `${t.title} · saintted`,
      description: upcoming ? `${t.meta || "Single"} · coming soon · love, saintted` : desc,
      canonicalPath: `/music/${encodeURIComponent(t.slug)}`,
      ogType: "music.song",
      image: cover ? abs(site, cover) : undefined,
      ld,
      body: `<main><h1>${esc(t.title)}</h1><p>${esc(t.meta || "Single")}${t.year ? ` · ${t.year}` : ""} by Saintted</p>${
        (t.description || "").trim() ? `<p>${esc((t.description || "").trim())}</p>` : ""
      }${links.length ? `<p>Listen on ${links.join(" · ")}</p>` : ""}${nav}</main>`,
    };
  }

  const page = PAGES[clean];
  if (!page) {
    return {
      status: 404,
      title: "Page not found · saintted",
      description: "This page doesn't exist.",
      canonicalPath: clean,
      ogType: "website",
      noindex: true,
      ld: [],
      body: `<main><h1>Page not found</h1>${nav}</main>`,
    };
  }

  const ld: unknown[] = [];
  let body = "";
  if (clean === "/") {
    ld.push(
      {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: "Saintted",
        url: site,
        description: HOME_DESC,
        genre: ["Alternative", "Afrobeats"],
        sameAs: [
          "https://instagram.com/beingsaintted",
          "https://x.com/beingsaintted",
          "https://music.apple.com/ng/artist/saintted/1683622819",
          "https://open.spotify.com/artist/6y6qTKA4172ZvpCg8t6wE6",
          "https://www.youtube.com/@saintted",
        ],
      },
      { "@context": "https://schema.org", "@type": "WebSite", name: "saintted", url: site }
    );
    body = `<main><h1>saintted</h1><p>a Nigerian artist + producer communicating the human experience through his perspective.</p>${trackLinks}${nav}</main>`;
  } else if (clean === "/music") {
    ld.push(
      breadcrumb([["home", "/"], ["music", "/music"]]),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Saintted releases",
        itemListElement: tracks.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: abs(site, `/music/${encodeURIComponent(t.slug)}`),
          name: t.title,
        })),
      }
    );
    body = `<main><h1>music</h1>${trackLinks}${nav}</main>`;
  } else if (clean === "/shows") {
    const upcoming = d.shows
      .filter((s) => new Date(s.starts_at).getTime() >= Date.now() - 86400000)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    ld.push(breadcrumb([["home", "/"], ["shows", "/shows"]]));
    upcoming.forEach((s) =>
      ld.push({
        "@context": "https://schema.org",
        "@type": "MusicEvent",
        name: s.title || `Saintted live at ${s.venue}`,
        startDate: s.starts_at,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: s.venue, address: s.city || s.venue },
        performer: { "@type": "MusicGroup", name: "Saintted" },
        ...(s.flyer_url ? { image: [abs(site, s.flyer_url)] } : {}),
        ...(s.ticket_url
          ? { offers: { "@type": "Offer", url: s.ticket_url, availability: s.is_sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock" } }
          : {}),
      })
    );
    body = `<main><h1>shows</h1>${
      upcoming.length
        ? `<ul>${upcoming.map((s) => `<li>${esc(s.title ? `${s.title}, ` : "")}${esc(s.venue)}${s.city ? `, ${esc(s.city)}` : ""}: ${esc(new Date(s.starts_at).toDateString())}</li>`).join("")}</ul>`
        : "<p>No shows announced yet.</p>"
    }${nav}</main>`;
  } else if (clean === "/about") {
    ld.push(breadcrumb([["home", "/"], ["about", "/about"]]));
    const paras = (d.about?.body || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    body = `<main><h1>${esc(d.about?.heading || "about")}</h1>${paras.map((p) => `<p>${esc(p)}</p>`).join("")}${nav}</main>`;
  } else {
    ld.push(breadcrumb([["home", "/"], [clean.slice(1), clean]]));
    body = `<main><h1>${esc(clean.slice(1))}</h1>${nav}</main>`;
  }

  return { status: 200, ...page, canonicalPath: clean, ogType: "website", ld, body };
}

/** Swap this page's metadata + content into the built index.html. */
export function renderShell(path: string, d: ShellData): { status: number; html: string } {
  const p = buildPage(path, d);
  const canonical = abs(d.siteUrl, p.canonicalPath === "/" ? "/" : p.canonicalPath);
  const image = p.image || abs(d.siteUrl, "/og-image.png");

  let html = d.indexHtml;
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]*name=["']description["'][^>]*>/gi, "")
    .replace(/<meta[^>]*name=["']robots["'][^>]*>/gi, "")
    .replace(/<link[^>]*rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<meta[^>]*property=["']og:(title|description|url|type|image|image:alt)["'][^>]*>/gi, "")
    .replace(/<meta[^>]*name=["']twitter:(title|description|image)["'][^>]*>/gi, "");

  const head = [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<meta name="robots" content="${p.noindex ? "noindex,follow" : "index,follow,max-snippet:220,max-image-preview:large"}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:type" content="${p.ogType}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    ...p.ld.map(jsonLd),
  ].join("\n    ");

  html = html.replace("</head>", `    ${head}\n  </head>`);
  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root"><div style="padding:2rem;font-family:system-ui,sans-serif;color:#ecebe6">${p.body}</div></div>`
  );
  return { status: p.status, html };
}
