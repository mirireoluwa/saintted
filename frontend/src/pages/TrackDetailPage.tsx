import { useEffect, useMemo, useState } from "react";
import type { Track } from "../types/track";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { TrackCoverPlaceholder } from "../components/TrackCoverPlaceholder";
import { SeoHead } from "../components/SeoHead";
import { fetchTrackBySlug, fetchTracks } from "../api/client";
import { getTrackArtUrl } from "../utils/trackArt";
import { SocialLinks } from "../components/SocialLinks";
import { UnreleasedTrackFullScreen } from "../components/UnreleasedTrackFullScreen";
import {
  appleMusicSearchUrl,
  spotifySearchUrl,
  youtubeSearchUrl,
} from "../utils/streamingLinks";
import { absoluteUrl, getSiteUrl } from "../utils/siteUrl";
import "./TrackDetailPage.css";

function pickUrl(stored: string | undefined | null, fallback: string): string {
  const t = (stored ?? "").trim();
  return t || fallback;
}

function neighborSlugsFromList(list: Track[], order: number) {
  const prev = list.find((x) => x.order === order - 1)?.slug;
  const next = list.find((x) => x.order === order + 1)?.slug;
  return { prev, next };
}

function TrackDetailSkeletonBlocks() {
  return (
    <>
      <div className="track-detail__skeleton-nav" />
      <div className="track-detail__skeleton-title" />
      <div className="track-detail__main track-detail__main--skeleton">
        <div className="track-detail__skeleton-cover" />
        <div className="track-detail__skeleton-about">
          <div className="track-detail__skeleton-line track-detail__skeleton-line--short" />
          <div className="track-detail__skeleton-line" />
          <div className="track-detail__skeleton-line" />
          <div className="track-detail__skeleton-line track-detail__skeleton-line--med" />
        </div>
      </div>
      <div className="track-detail__skeleton-meta" />
    </>
  );
}

function TrackDetailSkeleton() {
  return (
    <div className="track-detail">
      <div className="track-detail__inner track-detail__inner--skeleton">
        <TrackDetailSkeletonBlocks />
      </div>
    </div>
  );
}

export function TrackDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    let cancelled = false;
    fetchTracks()
      .then((list) => {
        if (!cancelled) setTracks(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    let slowTimer: number | undefined;
    setError(false);
    setLoading(true);
    setSlowLoading(false);
    slowTimer = window.setTimeout(() => {
      if (!cancelled) setSlowLoading(true);
    }, 600);

    fetchTrackBySlug(slug)
      .then((t) => {
        if (!cancelled) {
          setTrack(t);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setTrack(null);
        }
      })
      .finally(() => {
        if (slowTimer) window.clearTimeout(slowTimer);
        if (!cancelled) {
          setLoading(false);
          setSlowLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (slowTimer) window.clearTimeout(slowTimer);
    };
  }, [slug]);

  const canonicalPath = `/music/${encodeURIComponent(slug)}`;
  const resolved = track && track.slug === slug;
  const pendingTransition = Boolean(loading && track && track.slug !== slug);
  const showSlowLoadingUi = pendingTransition && slowLoading;
  const showSkeleton = loading && !track && !error;
  const showNotFound = !loading && (error || !track);

  const displayTrack: Track | null =
    track?.slug === slug ? track : tracks.find((t) => t.slug === slug) ?? null;
  const showInterstitial = Boolean(slug && loading && !displayTrack && !error && track !== null);

  const listNeighbors =
    displayTrack && tracks.length > 0
      ? neighborSlugsFromList(tracks, displayTrack.order)
      : { prev: undefined as string | undefined, next: undefined as string | undefined };
  const prevSlug = displayTrack?.previous_slug || listNeighbors.prev || null;
  const nextSlug = displayTrack?.next_slug || listNeighbors.next || null;

  const trackJsonLd = useMemo(() => {
    if (!track || !resolved || track.is_unreleased) return "";
    const site = getSiteUrl();
    const cover = getTrackArtUrl(track);
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      name: track.title,
      url: `${site}${canonicalPath}`,
      ...(cover ? { image: absoluteUrl(cover) } : {}),
      ...(track.year ? { datePublished: `${track.year}` } : {}),
      byArtist: { "@type": "MusicGroup", name: "Saintted", url: site },
    });
  }, [track, resolved, canonicalPath]);

  if (showSkeleton) {
    return (
      <>
        <SeoHead title={`${slug} · saintted`} description="love, saintted" canonicalPath={canonicalPath} />
        <TrackDetailSkeleton />
      </>
    );
  }

  if (showNotFound) {
    return (
      <>
        <SeoHead title="Track not found · saintted" description="love, saintted" canonicalPath={canonicalPath} />
        <div className="track-detail">
          <div className="track-detail__inner">
            <p className="track-detail__loading">Track not found.</p>
            <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--home">
              home
            </Link>
            <p className="track-detail__empty-hint">
              <Link to="/#music-section">Browse music</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!displayTrack && !showInterstitial) {
    return null;
  }

  const unreleasedTargetMs = track?.release_at ? new Date(track.release_at).getTime() : NaN;
  const showUnreleasedFullscreen =
    !showInterstitial &&
    resolved &&
    !!track?.is_unreleased &&
    Number.isFinite(unreleasedTargetMs) &&
    unreleasedTargetMs > Date.now();

  if (showUnreleasedFullscreen) {
    const ogU = getTrackArtUrl(track);
    return (
      <>
        <SeoHead
          title={`${track.title} · unreleased · saintted`}
          description={`${track.meta} · coming soon · love, saintted`}
          canonicalPath={canonicalPath}
          ogImage={ogU ? absoluteUrl(ogU) : undefined}
          ogType="music.song"
        />
        <div className="track-detail track-detail--unreleased">
          <UnreleasedTrackFullScreen track={track} />
        </div>
      </>
    );
  }

  const desc =
    displayTrack != null
      ? (displayTrack.description || "").trim().slice(0, 160) || `${displayTrack.meta} · love, saintted`
      : "love, saintted";
  const coverUrl = displayTrack != null ? getTrackArtUrl(displayTrack) : undefined;
  const ogImage = coverUrl ? absoluteUrl(coverUrl) : undefined;

  const yt =
    displayTrack != null ? pickUrl(displayTrack.youtube_url, youtubeSearchUrl(displayTrack.title)) : "#";
  const am =
    displayTrack != null
      ? pickUrl(displayTrack.apple_music_url, appleMusicSearchUrl(displayTrack.title))
      : "#";
  const sp =
    displayTrack != null
      ? pickUrl(displayTrack.spotify_url, spotifySearchUrl(displayTrack.title))
      : "#";

  const panelClassName = showInterstitial
    ? "track-detail__inner track-detail__inner--skeleton"
    : `track-detail__inner${showSlowLoadingUi ? " track-detail__inner--pending" : ""}`;

  return (
    <>
      <SeoHead
        title={
          showInterstitial ? `${slug} · saintted` : `${displayTrack!.title} · saintted`
        }
        description={desc}
        canonicalPath={canonicalPath}
        ogImage={ogImage}
        ogType="music.song"
      />
      {resolved && trackJsonLd ? (
        <Helmet>
          <script type="application/ld+json">{trackJsonLd}</script>
        </Helmet>
      ) : null}
      <div className="track-detail">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slug}
            className={panelClassName}
            initial={reduceMotion ? false : { opacity: 0, y: 44 }}
            animate={{
              opacity: showSlowLoadingUi ? 0.62 : 1,
              y: 0,
              transition: reduceMotion
                ? { duration: 0 }
                : { duration: 0.95, ease: [0.14, 1, 0.28, 1] as const },
            }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    opacity: 0,
                    y: -36,
                    transition: { duration: 0.68, ease: [0.5, 0, 0.55, 1] as const },
                  }
            }
            aria-busy={showSlowLoadingUi}
          >
          {showInterstitial ? (
            <TrackDetailSkeletonBlocks />
          ) : (
            <>
          <nav className="track-detail__nav" aria-label="Track navigation">
            <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--home">
              home
            </Link>
            <span className="track-detail__breadcrumb">
              <Link to="/#music-section">My Music</Link>
              <span className="track-detail__breadcrumb-sep">→</span>
              <span>{displayTrack!.title}</span>
            </span>
            <div className="track-detail__nav-pair">
              {prevSlug ? (
                <Link
                  to={`/music/${prevSlug}`}
                  className="track-detail__nav-btn track-detail__nav-btn--prev"
                >
                  previous
                </Link>
              ) : (
                <span
                  className="track-detail__nav-btn track-detail__nav-btn--prev track-detail__nav-btn--inactive"
                  aria-disabled="true"
                >
                  previous
                </span>
              )}
              {nextSlug ? (
                <Link
                  to={`/music/${nextSlug}`}
                  className="track-detail__nav-btn track-detail__nav-btn--next"
                >
                  next
                </Link>
              ) : (
                <span
                  className="track-detail__nav-btn track-detail__nav-btn--next track-detail__nav-btn--inactive"
                  aria-disabled="true"
                >
                  next
                </span>
              )}
            </div>
          </nav>

          <h1 className="track-detail__title">{displayTrack!.title}</h1>

          <div className="track-detail__main">
            <div className="track-detail__left">
              <div className="track-detail__cover">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={`${displayTrack!.title} cover art`}
                    className="track-detail__cover-img"
                    decoding="async"
                    fetchPriority="high"
                    sizes="(max-width: 900px) 100vw, 420px"
                  />
                ) : (
                  <TrackCoverPlaceholder variant="detail" />
                )}
              </div>
            </div>
            <div className="track-detail__right">
              <section className="track-detail__about">
                <h2 className="track-detail__about-title">About the song</h2>
                <p className="track-detail__about-text">
                  {(displayTrack!.description || "").trim() || "—"}
                </p>
              </section>
            </div>
          </div>

          <div className="track-detail__meta">
            <div className="track-detail__year-block">
              <span className="track-detail__year-label">YEAR</span>
              <span className="track-detail__year-value">{displayTrack!.year ?? "—"}</span>
            </div>
            <div className="track-detail__streaming">
              <a
                href={yt}
                target="_blank"
                rel="noopener noreferrer"
                className="track-detail__stream-link track-detail__stream-link--youtube"
              >
                YouTube
              </a>
              <a
                href={am}
                target="_blank"
                rel="noopener noreferrer"
                className="track-detail__stream-link track-detail__stream-link--apple"
              >
                Apple Music
              </a>
              <a
                href={sp}
                target="_blank"
                rel="noopener noreferrer"
                className="track-detail__stream-link track-detail__stream-link--spotify"
              >
                Spotify
              </a>
            </div>
          </div>

          <footer className="track-detail__footer">
            <div className="track-detail__footer-left">
              <img src="/love-saintted.png" alt="love, saintted" className="track-detail__love-image" />
            </div>
            <SocialLinks
              className="track-detail__footer-links"
              linkClassName="track-detail__footer-icon"
            />
            <div className="track-detail__footer-time">
              {new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </div>
          </footer>
            </>
          )}
          {showSlowLoadingUi ? (
            <div className="track-detail__pending-bar" aria-hidden>
              <span className="track-detail__pending-bar__fill" />
            </div>
          ) : null}
        </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
