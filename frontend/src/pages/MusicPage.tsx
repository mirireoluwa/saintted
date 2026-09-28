import { useEffect, useMemo, useState } from "react";
import { fetchTracks } from "../api/client";
import { Helmet } from "react-helmet-async";
import { SeoHead } from "../components/SeoHead";
import { absoluteUrl } from "../utils/siteUrl";
import { TrackCard } from "../components/TrackCard";
import { UpcomingRelease } from "../components/UpcomingRelease";
import type { Track } from "../types/track";
import { useReleaseGroups } from "../utils/releaseGroups";
import { FALLBACK_TRACKS } from "./HomePage";

export function MusicPage() {
  const [tracks, setTracks] = useState<Track[]>(FALLBACK_TRACKS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number | "all">("all");
  const { upcoming, released, now } = useReleaseGroups(tracks);

  useEffect(() => {
    fetchTracks()
      .then(setTracks)
      .catch(() => setTracks(FALLBACK_TRACKS))
      .finally(() => setLoading(false));
  }, []);

  // one filter per release year, newest first, each with its count
  const years = useMemo(() => {
    const counts = new Map<number, number>();
    for (const { track } of released) {
      if (track.year) counts.set(track.year, (counts.get(track.year) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[0] - a[0]);
  }, [released]);

  const visible = released.filter(({ track }) => filter === "all" || track.year === filter);

  return (
    <>
      <SeoHead
        title="music · saintted"
        description="Every release from Saintted, a Nigerian artist and producer. Stream singles and see what's next."
        canonicalPath="/music"
      />

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Saintted releases",
            itemListElement: released.map(({ track }, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(`/music/${encodeURIComponent(track.slug)}`),
              name: track.title,
            })),
          }).replace(/</g, "\\u003c")}
        </script>
      </Helmet>

      <header className="wrap page-head">
        <p className="eyebrow rise">music</p>
        <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>everything so far</h1>
        <p className="page-head__sub rise" style={{ "--i": 2 } as React.CSSProperties}>
          singles, sounds and what's coming next.
        </p>
      </header>

      {!loading && upcoming.length > 0 ? (
        <section className="section section--tight">
          <div className="wrap">
            <div className="section-head">
              <h2>upcoming</h2>
            </div>
            <div className="upcoming-list">
              {upcoming.map((t) => (
                <UpcomingRelease key={t.id} track={t} now={now} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section--tight" aria-labelledby="releases-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="releases-title">releases</h2>
          </div>

          {years.length > 1 ? (
            <div className="filters" role="group" aria-label="Filter releases by year">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                all<sup>{released.length}</sup>
              </button>
              {years.map(([year, count]) => (
                <button key={year} type="button" aria-pressed={filter === year} onClick={() => setFilter(year)}>
                  {year}<sup>{count}</sup>
                </button>
              ))}
            </div>
          ) : null}

          {loading ? (
            <div className="card-grid card-grid--skeleton" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}><span className="card__art" /></div>
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="card-grid">
              {visible.map(({ track, highlighted }, i) => (
                <TrackCard key={track.id} track={track} index={i} isNew={highlighted} />
              ))}
            </div>
          ) : (
            <p className="empty">nothing released yet, check back soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
