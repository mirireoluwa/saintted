import { useEffect, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { Hero } from "../components/Hero";
import { ReleaseCountdownBanner } from "../components/ReleaseCountdownBanner";
import { MusicSection } from "../components/MusicSection";
import { Featured } from "../components/Featured";
import { Footer } from "../components/Footer";
import { fetchTracks } from "../api/client";
import type { Track } from "../types/track";

const FALLBACK_TRACKS: Track[] = [
  { id: 1, title: "one chance", slug: "one-chance", meta: "Single", art_url: "", link_url: "", order: 0 },
  { id: 2, title: "shimmer", slug: "shimmer", meta: "Single (Sound)", art_url: "", link_url: "", order: 1 },
  { id: 3, title: "hyperphoria", slug: "hyperphoria", meta: "Single", art_url: "", link_url: "", order: 2 },
  { id: 4, title: "runaway", slug: "runaway", meta: "Single", art_url: "", link_url: "", order: 3 },
  { id: 5, title: "home", slug: "home", meta: "Single", art_url: "", link_url: "", order: 4 },
];

export function HomePage() {
  const [tracks, setTracks] = useState<Track[]>(FALLBACK_TRACKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracks()
      .then(setTracks)
      .catch(() => setTracks(FALLBACK_TRACKS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main id="main" className="page">
      <SiteHeader />
      <Hero />
      <div className="site-main">
        <ReleaseCountdownBanner />
        <MusicSection tracks={tracks} loading={loading} />
        <Featured />
        <Footer />
      </div>
    </main>
  );
}
