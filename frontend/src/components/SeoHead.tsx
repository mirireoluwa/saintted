import { Helmet } from "react-helmet-async";
import { absoluteUrl, getSiteUrl } from "../utils/siteUrl";

type SeoHeadProps = {
  title: string;
  description?: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: "website" | "music.song";
  /** Keep this page out of search results (404s, admin). */
  noindex?: boolean;
};

export function SeoHead({
  title,
  description = "love, saintted",
  canonicalPath,
  ogImage,
  ogType = "website",
  noindex = false,
}: SeoHeadProps) {
  const site = getSiteUrl();
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const canonical = `${site}${path}`;
  const image = absoluteUrl(ogImage || "/og-image.png");

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noindex ? "noindex,follow" : "index,follow,max-snippet:220,max-image-preview:large"}
      />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content="saintted" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@beingsaintted" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
