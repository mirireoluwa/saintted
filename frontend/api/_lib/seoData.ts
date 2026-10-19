/**
 * Single source of truth for the artist's search identity. Used by the build (vite.config.ts bakes it
 * into index.html) and by the SEO shell function, so the static HTML, the JSON-LD and the copy never drift.
 * Keep this file free of imports so both a Node build script and a Vercel function can load it.
 */

export const SITE_NAME = "SAINTTED";
export const HOME_TITLE = "SAINTTED | Nigerian Alternative & Afrobeats Artist";
export const HOME_DESC =
  "SAINTTED is a Nigerian artist and producer creating experimental alternative and afrobeats songs. Stream singles, watch official videos, and explore the latest releases.";
export const HOME_H1 = "SAINTTED, a Nigerian alternative artist and producer from Lagos";
export const HOME_BIO =
  "SAINTTED is a Nigerian alternative artist and producer from Lagos, communicating the human experience through his perspective in experimental alternative and afrobeats songs.";
export const OG_IMAGE_ALT = "SAINTTED black and white portrait with love, SAINTTED lettering";

export const SAME_AS = [
  "https://open.spotify.com/artist/6y6qTKA4172ZvpCg8t6wE6?si=KXSzB41kS0aKPaBL04PDVw&nd=1&dlsi=d339e76d844749d5",
  "https://music.apple.com/ng/artist/saintted/1683622819",
  "https://youtube.com/@saintted?si=2-Xk8UB-g7F4gLnL",
  "https://www.instagram.com/beingsaintted",
  "https://x.com/beingsaintted",
  "https://audiomack.com/beingsaintted",
  "https://share.google/kXcpspx3qHKuyARNb",
];

const LAGOS = {
  "@type": "Place",
  name: "Lagos, Nigeria",
  address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
};

/** The artist entity + WebSite, as two JSON-LD documents. */
export function homeJsonLd(siteUrl: string): unknown[] {
  const site = siteUrl.replace(/\/$/, "");
  return [
    {
      "@context": "https://schema.org",
      "@type": ["Person", "MusicGroup"],
      "@id": `${site}/#artist`,
      name: SITE_NAME,
      alternateName: ["Saintted", "Mirireoluwa Olukanni"],
      url: `${site}/`,
      image: `${site}/og-image.png`,
      description: HOME_DESC,
      genre: ["Alternative"],
      foundingLocation: LAGOS,
      homeLocation: LAGOS,
      sameAs: SAME_AS,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${site}/#website`,
      name: SITE_NAME,
      alternateName: "saintted",
      url: `${site}/`,
    },
  ];
}

export const jsonLdScript = (o: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

const NAV =
  '<nav><a href="/">home</a> <a href="/music">music</a> <a href="/media">media</a> <a href="/shows">shows</a> <a href="/about">about</a></nav>';

/** Plain-HTML copy of the home page, shipped inside #root until React mounts and replaces it. */
export function homeBodyHtml(extra = ""): string {
  return `<main><h1>${HOME_H1}</h1><p>${HOME_BIO}</p>${extra}${NAV}</main>`;
}
