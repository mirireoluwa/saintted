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

const _q = (t: string) => encodeURIComponent(`Saintted ${t}`);
const FALLBACK_TRACKS: Track[] = [
  {
    id: 1, title: "one chance", slug: "one-chance", meta: "Single", art_url: "", link_url: "", order: 0,
    description: "the song talks about giving someone a chance to prove themselves after a mistake but realizing that sometimes apologies are not enough.\n\nthe lyrics express the struggle of holding onto special memories and feelings while trying to move on from a relationship that may not be working out, symbolized by the metaphor of giving one dance to prove wrong.",
    year: 2025,
    youtube_url: `https://www.youtube.com/results?search_query=${_q("one chance")}`,
    apple_music_url: `https://music.apple.com/us/search?term=${_q("one chance")}`,
    spotify_url: `https://open.spotify.com/search/${_q("one chance")}`,
  },
  {
    id: 2, title: "shimmer", slug: "shimmer", meta: "Single (Sound)", art_url: "", link_url: "", order: 1,
    description: "i decided to do something really unconventional. This one has no vocals and I'm sure you all might be wondering, \"why?\". The truth is, it's the best way I could express how i was feeling at the time: \"i've got no words to say\".\n\n\"shimmer\" tells a story of solitude and how i've come to enjoy finding some quiet time alone to think and process life. This song is supposed to help with that. It is designed to help go through those moments of solitude.",
    year: 2025,
    youtube_url: `https://www.youtube.com/results?search_query=${_q("shimmer")}`,
    apple_music_url: `https://music.apple.com/us/search?term=${_q("shimmer")}`,
    spotify_url: `https://open.spotify.com/search/${_q("shimmer")}`,
  },
  {
    id: 3, title: "hyperphoria", slug: "hyperphoria", meta: "Single", art_url: "", link_url: "", order: 2,
    description: "This song was actually written in the summer of 2023. I was at a point where I was just trying to figure out my life. It speaks about my aspirations to be a great person, the challenges I will face to get there, and leaving some pain from my past behind.",
    year: 2024,
    youtube_url: `https://www.youtube.com/results?search_query=${_q("hyperphoria")}`,
    apple_music_url: `https://music.apple.com/us/search?term=${_q("hyperphoria")}`,
    spotify_url: `https://open.spotify.com/search/${_q("hyperphoria")}`,
  },
  {
    id: 4, title: "runaway", slug: "runaway", meta: "Single", art_url: "", link_url: "", order: 3,
    description: "Runaway speaks about a transition period in my life. I wanted things to change so badly and I thought that the best way to express that was by essentially running away from the old to the new.",
    year: 2022,
    youtube_url: `https://www.youtube.com/results?search_query=${_q("runaway")}`,
    apple_music_url: `https://music.apple.com/us/search?term=${_q("runaway")}`,
    spotify_url: `https://open.spotify.com/search/${_q("runaway")}`,
  },
  {
    id: 5, title: "home", slug: "home", meta: "Single", art_url: "", link_url: "", order: 4,
    description: "this song stems from two perspectives.\n\nthe first, from a quote that says, \"sometimes home is a person\". The idea for this song was developed from this quote.\n\nthe second, a vision for a better world where love is everything we express.",
    year: 2022,
    youtube_url: `https://www.youtube.com/results?search_query=${_q("home")}`,
    apple_music_url: `https://music.apple.com/us/search?term=${_q("home")}`,
    spotify_url: `https://open.spotify.com/search/${_q("home")}`,
  },
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
