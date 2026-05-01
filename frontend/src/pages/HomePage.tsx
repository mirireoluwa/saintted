import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { AnimatedSection } from "../components/AnimatedSection";
import { Hero } from "../components/Hero";
import { ReleaseCountdownBar } from "../components/ReleaseCountdownBar";
import { fetchReleaseCountdown } from "../api/client";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import { writeHeroCache } from "../utils/heroCache";
import { MusicSection } from "../components/MusicSection";
import { Featured } from "../components/Featured";
import { ImageGallery } from "../components/ImageGallery";
import { MailingListSection } from "../components/MailingListSection";
import { Footer } from "../components/Footer";
import { SeoHead } from "../components/SeoHead";
import { fetchTracks } from "../api/client";
import type { Track } from "../types/track";
import { getSiteUrl } from "../utils/siteUrl";

const HOMEPAGE_DESCRIPTION =
  "A Nigerian artist and producer creating experimental alternative and afrobeats songs. Stream singles, watch official videos, and explore the latest releases.";

const FALLBACK_TRACKS: Track[] = [
  { id: 1, title: "one chance", slug: "one-chance", meta: "Single", art_url: "", link_url: "", order: 0 },
  { id: 2, title: "shimmer", slug: "shimmer", meta: "Single (Sound)", art_url: "", link_url: "", order: 1 },
  { id: 3, title: "hyperphoria", slug: "hyperphoria", meta: "Single", art_url: "", link_url: "", order: 2 },
  { id: 4, title: "runaway", slug: "runaway", meta: "Single", art_url: "", link_url: "", order: 3 },
  { id: 5, title: "home", slug: "home", meta: "Single", art_url: "", link_url: "", order: 4 },
];

function releaseBarVisible(c: ReleaseCountdown | null): c is ReleaseCountdown {
  if (!c?.enabled || !c.release_at) return false;
  return !Number.isNaN(new Date(c.release_at).getTime());
}

export function HomePage() {
  const location = useLocation();
  const [tracks, setTracks] = useState<Track[]>(FALLBACK_TRACKS);
  const [loading, setLoading] = useState(true);
  const [releaseConfig, setReleaseConfig] = useState<ReleaseCountdown | null>(null);
  const [releaseLoaded, setReleaseLoaded] = useState(false);

  const jsonLd = useMemo(() => {
    const site = getSiteUrl();
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      name: "Saintted",
      url: site,
      description: HOMEPAGE_DESCRIPTION,
      genre: ["Alternative", "Afrobeats"],
      sameAs: [
        "https://instagram.com/beingsaintted",
        "https://x.com/beingsaintted",
        "https://music.apple.com/ng/artist/saintted/1683622819",
        "https://open.spotify.com/artist/6y6qTKA4172ZvpCg8t6wE6",
        "https://www.youtube.com/@saintted",
        "https://linktr.ee/saintted",
      ],
    });
  }, []);

  useEffect(() => {
    fetchTracks()
      .then(setTracks)
      .catch(() => setTracks(FALLBACK_TRACKS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchReleaseCountdown();
        if (cancelled) return;
        setReleaseConfig(c);
        writeHeroCache(c, "")
      } catch {
        if (cancelled) return;
        setReleaseConfig(null);
      } finally {
        if (!cancelled) setReleaseLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.pathname, location.hash]);

  return (
    <>
      <SeoHead title="saintted" description={HOMEPAGE_DESCRIPTION} canonicalPath="/" />
      <Helmet>
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>
      <main
        id="main"
        className={`page${releaseBarVisible(releaseConfig) ? " page--release-countdown" : ""}`}
      >
        <div className="home-landing">
          <Hero
            releaseConfig={releaseConfig}
            releaseLoaded={releaseLoaded}
            summaryText={HOMEPAGE_DESCRIPTION}
          />
          {releaseBarVisible(releaseConfig) ? (
            <div className="home-landing__countdown">
              <ReleaseCountdownBar config={releaseConfig} />
            </div>
          ) : null}
        </div>
        <div className="site-main">
          <AnimatedSection>
            <MusicSection tracks={tracks} loading={loading} />
          </AnimatedSection>
          <AnimatedSection>
            <Featured />
          </AnimatedSection>
          <AnimatedSection>
            <ImageGallery />
          </AnimatedSection>
          <AnimatedSection>
            <MailingListSection />
          </AnimatedSection>
          <AnimatedSection>
            <Footer />
          </AnimatedSection>
        </div>
      </main>
    </>
  );
}
