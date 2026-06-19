import { useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "../types/track";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { TrackCoverPlaceholder } from "../components/TrackCoverPlaceholder";
import { SeoHead } from "../components/SeoHead";
import { fetchTrackBySlug, fetchTracks } from "../api/client";
import { getTrackArtUrl, getTrackArtSrcSet } from "../utils/trackArt";
import { SocialLinks } from "../components/SocialLinks";
import { UnreleasedTrackFullScreen } from "../components/UnreleasedTrackFullScreen";
import {
  appleMusicSearchUrl,
  spotifySearchUrl,
  youtubeSearchUrl,
} from "../utils/streamingLinks";
import { absoluteUrl, getSiteUrl } from "../utils/siteUrl";
import "./TrackDetailPage.css";

// Shared with HomePage — canonical fallback data shown before API responds.
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

function pickUrl(stored: string | undefined | null, fallback: string): string {
  const t = (stored ?? "").trim();
  return t || fallback;
}

/** Extract the Spotify track ID from a direct track URL, or null for search/artist links. */
function spotifyTrackId(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

function neighborSlugsFromList(list: Track[], currentSlug: string, isUnreleased: boolean) {
  const released = list.filter((t) => !t.is_unreleased);
  if (released.length === 0) return { prev: undefined, next: undefined };

  if (isUnreleased) {
    // Mirror homepage release flow: highlighted release(s) first, then the rest.
    const releasedInDisplayOrder = [
      ...released.filter((t) => t.is_highlighted),
      ...released.filter((t) => !t.is_highlighted),
    ];
    const next = releasedInDisplayOrder[0]?.slug;
    const prev = releasedInDisplayOrder[releasedInDisplayOrder.length - 1]?.slug;
    return { prev, next };
  }

  const idx = released.findIndex((t) => t.slug === currentSlug);
  if (idx < 0) return { prev: undefined, next: undefined };
  return {
    prev: idx > 0 ? released[idx - 1].slug : undefined,
    next: idx < released.length - 1 ? released[idx + 1].slug : undefined,
  };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const presaved = searchParams.get("presaved") === "1";
  const [track, setTrack] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>(FALLBACK_TRACKS);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [crumbOpen, setCrumbOpen] = useState(false);
  const crumbRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  // Songs available in the breadcrumb dropdown — released tracks in homepage order.
  const breadcrumbSongs = useMemo(() => {
    const released = tracks.filter((t) => !t.is_unreleased);
    return [
      ...released.filter((t) => t.is_highlighted),
      ...released.filter((t) => !t.is_highlighted),
    ];
  }, [tracks]);

  // Close the breadcrumb dropdown on outside click or Escape.
  useEffect(() => {
    if (!crumbOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (crumbRef.current && !crumbRef.current.contains(e.target as Node)) {
        setCrumbOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCrumbOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [crumbOpen]);

  // Collapse the dropdown whenever the route (slug) changes.
  useEffect(() => {
    setCrumbOpen(false);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    fetchTracks()
      .then((list) => {
        // Only replace fallback if the API returned actual tracks.
        if (!cancelled && list.length > 0) setTracks(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTracksLoaded(true);
      });
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

  // Dismiss presaved param from URL after 6 seconds (clean up history)
  useEffect(() => {
    if (!presaved) return;
    const timer = window.setTimeout(() => {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("presaved");
        return next;
      }, { replace: true });
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [presaved, setSearchParams]);

  const canonicalPath = `/music/${encodeURIComponent(slug)}`;
  const resolved = track && track.slug === slug;
  const pendingTransition = Boolean(loading && track && track.slug !== slug);
  const showSlowLoadingUi = pendingTransition && slowLoading;

  // Compute displayTrack first so the skeleton/not-found guards can use it.
  const displayTrack: Track | null =
    track?.slug === slug ? track : tracks.find((t) => t.slug === slug) ?? null;
  const showInterstitial = Boolean(slug && loading && !displayTrack && !error && track !== null);

  // Show skeleton when we have no displayable data yet.
  // Also keep skeleton if the slug fetch failed but the tracks list hasn't returned yet —
  // this prevents a split-second "Track not found" flash for transient slug-fetch failures
  // while fetchTracks() is still in-flight.
  const showSkeleton = (loading || (error && !tracksLoaded)) && !displayTrack;

  // Only show "not found" once both fetches are done and we still have nothing to show.
  const showNotFound = !loading && tracksLoaded && !displayTrack && (error || !track);

  const listNeighbors =
    displayTrack && tracks.length > 0
      ? neighborSlugsFromList(tracks, displayTrack.slug, !!displayTrack.is_unreleased)
      : { prev: undefined as string | undefined, next: undefined as string | undefined };
  // Prefer list-derived neighbors so detail navigation matches homepage ordering.
  const prevSlug = listNeighbors.prev || displayTrack?.previous_slug || null;
  const nextSlug = listNeighbors.next || displayTrack?.next_slug || null;

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
  const spotifyEmbedId = displayTrack != null ? spotifyTrackId(displayTrack.spotify_url) : null;
  const coverSrcSet = displayTrack != null ? getTrackArtSrcSet(displayTrack) : undefined;

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
          {presaved && (
            <div className="track-detail__presave-banner" role="status" aria-live="polite">
              <span className="track-detail__presave-banner__check">✓</span>
              <span>you're all set — you'll be the first to hear it. love, saintted.</span>
            </div>
          )}
          <nav className="track-detail__nav" aria-label="Track navigation">
            <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--home">
              <svg className="track-detail__nav-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              home
            </Link>
            <span className="track-detail__breadcrumb">
              <Link to="/#music-section" className="track-detail__breadcrumb-link">my music</Link>
              <span className="track-detail__breadcrumb-sep" aria-hidden>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="track-detail__crumb-wrap" ref={crumbRef}>
                <button
                  type="button"
                  className="track-detail__breadcrumb-current"
                  aria-haspopup="listbox"
                  aria-expanded={crumbOpen}
                  disabled={breadcrumbSongs.length <= 1}
                  onClick={() => setCrumbOpen((o) => !o)}
                >
                  <span className="track-detail__breadcrumb-current-text">{displayTrack!.title}</span>
                  {breadcrumbSongs.length > 1 ? (
                    <svg
                      className={`track-detail__crumb-caret${crumbOpen ? " track-detail__crumb-caret--open" : ""}`}
                      viewBox="0 0 24 24"
                      width="11"
                      height="11"
                      fill="none"
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>
                <AnimatePresence>
                  {crumbOpen ? (
                    <motion.ul
                      className="track-detail__crumb-menu"
                      role="listbox"
                      aria-label="Jump to a song"
                      initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {breadcrumbSongs.map((t, i) => {
                        const active = t.slug === displayTrack!.slug;
                        return (
                          <motion.li
                            key={t.slug}
                            role="option"
                            aria-selected={active}
                            initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: reduceMotion ? 0 : 0.22,
                              ease: [0.22, 1, 0.36, 1],
                              delay: reduceMotion ? 0 : 0.03 + i * 0.025,
                            }}
                          >
                            <Link
                              to={`/music/${t.slug}`}
                              className={`track-detail__crumb-option${active ? " track-detail__crumb-option--active" : ""}`}
                              onClick={() => setCrumbOpen(false)}
                            >
                              {t.title}
                              {active ? <span className="track-detail__crumb-dot" aria-hidden /> : null}
                            </Link>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  ) : null}
                </AnimatePresence>
              </span>
            </span>
            <div className="track-detail__nav-pair">
              {prevSlug ? (
                <Link
                  to={`/music/${prevSlug}`}
                  className="track-detail__nav-btn track-detail__nav-btn--prev"
                  aria-label="Previous track"
                >
                  <svg className="track-detail__nav-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
                    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="track-detail__nav-label">previous</span>
                </Link>
              ) : (
                <span
                  className="track-detail__nav-btn track-detail__nav-btn--prev track-detail__nav-btn--inactive"
                  aria-disabled="true"
                >
                  <svg className="track-detail__nav-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
                    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="track-detail__nav-label">previous</span>
                </span>
              )}
              {nextSlug ? (
                <Link
                  to={`/music/${nextSlug}`}
                  className="track-detail__nav-btn track-detail__nav-btn--next"
                  aria-label="Next track"
                >
                  <span className="track-detail__nav-label">next</span>
                  <svg className="track-detail__nav-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : (
                <span
                  className="track-detail__nav-btn track-detail__nav-btn--next track-detail__nav-btn--inactive"
                  aria-disabled="true"
                >
                  <span className="track-detail__nav-label">next</span>
                  <svg className="track-detail__nav-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>
          </nav>

          <div className="track-detail__title-row">
            <div className="track-detail__title-head">
              <span className="track-detail__eyebrow">
                {(displayTrack!.meta || "single").toLowerCase()}
                {displayTrack!.year ? ` · ${displayTrack!.year}` : ""}
              </span>
              <div className="track-detail__title-line">
                <h1 className="track-detail__title">{displayTrack!.title}</h1>
                {displayTrack!.is_highlighted ? <span className="track-card__new-pill">NEW</span> : null}
              </div>
            </div>
          </div>

          <div className="track-detail__main">
            <div className="track-detail__left">
              <div className="track-detail__cover">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    srcSet={coverSrcSet}
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
                {(displayTrack!.description || "").trim()
                  ? (displayTrack!.description || "").trim().split(/\n\n+/).map((para, i) => (
                      <p key={i} className="track-detail__about-text">{para}</p>
                    ))
                  : <p className="track-detail__about-text">—</p>}
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

          {spotifyEmbedId && (
            <div className="track-detail__spotify-embed">
              <iframe
                title={`Listen to ${displayTrack!.title} on Spotify`}
                src={`https://open.spotify.com/embed/track/${spotifyEmbedId}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          )}

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
