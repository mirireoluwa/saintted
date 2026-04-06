import { Helmet } from "react-helmet-async";
import { absoluteUrl, getSiteUrl } from "../utils/siteUrl";

type SeoHeadProps = {
  title: string;
  description?: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: "website" | "music.song";
};

export function SeoHead({
  title,
  description = "love, saintted",
  canonicalPath,
  ogImage,
  ogType = "website",
}: SeoHeadProps) {
  const site = getSiteUrl();
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const canonical = `${site}${path}`;
  const image = absoluteUrl(ogImage || "/og-image.png");

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content="saintted" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
