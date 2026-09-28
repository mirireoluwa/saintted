import { useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "../types/track";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { fetchTrackBySlug, fetchTracks } from "../api/client";
import { getTrackArtUrl, getTrackArtSrcSet } from "../utils/trackArt";
import { FALLBACK_TRACKS } from "./HomePage";
import { trackEvent } from "../utils/analytics";
import { TrackCard } from "../components/TrackCard";
import { TrackCoverPlaceholder } from "../components/TrackCoverPlaceholder";
import { UnreleasedTrackFullScreen } from "../components/UnreleasedTrackFullScreen";
import {
  appleMusicSearchUrl,
  spotifySearchUrl,
  youtubeSearchUrl,
} from "../utils/streamingLinks";
import { absoluteUrl, getSiteUrl } from "../utils/siteUrl";
import spotifyIcon from "../assets/spotify.svg";
import appleMusicIcon from "../assets/apple-music.svg";
import youtubeIcon from "../assets/youtube.svg";
import "./TrackDetailPage.css";

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
    <div className="grid-12 track__grid" aria-hidden>
      <div className="track__media">
        <div className="track__skeleton" />
      </div>
      <div className="track__info">
        <div className="track__skeleton-line track__skeleton-line--short" />
        <div className="track__skeleton-line track__skeleton-line--title" />
        <div className="track__skeleton-line" />
        <div className="track__skeleton-line" />
        <div className="track__skeleton-line track__skeleton-line--med" />
      </div>
    </div>
  );
}

function TrackDetailSkeleton() {
  return (
    <div className="wrap track">
      <TrackDetailSkeletonBlocks />
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
        <SeoHead title="Track not found · saintted" description="love, saintted" canonicalPath={canonicalPath} noindex />
        <header className="wrap page-head">
          <p className="eyebrow">404</p>
          <h1>track not found</h1>
          <div className="btn-row" style={{ flex: "1 1 100%", marginTop: "2rem" }}>
            <Link to="/music" className="btn btn--primary">browse music <span className="arrow" aria-hidden>→</span></Link>
            <Link to="/" className="btn">home</Link>
          </div>
        </header>
      </>
    );
  }

  if (!displayTrack && !showInterstitial) {
    return null;
  }

  // Decide from displayTrack (available immediately from the cached list) so an
  // unreleased track never briefly renders the normal detail layout while the
  // single-track fetch is still in flight.
  const unreleasedTargetMs = displayTrack?.release_at ? new Date(displayTrack.release_at).getTime() : NaN;
  const showUnreleasedFullscreen =
    !showInterstitial &&
    !!displayTrack?.is_unreleased &&
    Number.isFinite(unreleasedTargetMs) &&
    unreleasedTargetMs > Date.now();

  if (showUnreleasedFullscreen) {
    const uTrack = displayTrack!;
    const ogU = getTrackArtUrl(uTrack);
    return (
      <>
        <SeoHead
          title={`${uTrack.title} · unreleased · saintted`}
          description={`${uTrack.meta} · coming soon · love, saintted`}
          canonicalPath={canonicalPath}
          ogImage={ogU ? absoluteUrl(ogU) : undefined}
          ogType="music.song"
        />
        <UnreleasedTrackFullScreen track={uTrack} />
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

  const meta = (displayTrack?.meta || "single").toLowerCase();
  const moreSongs = breadcrumbSongs.filter((t) => t.slug !== slug).slice(0, 4);

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
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "home", item: getSiteUrl() + "/" },
                { "@type": "ListItem", position: 2, name: "music", item: getSiteUrl() + "/music" },
                { "@type": "ListItem", position: 3, name: track?.title ?? slug, item: getSiteUrl() + canonicalPath },
              ],
            })}
          </script>
        </Helmet>
      ) : null}
      <div className="track-page">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slug}
          className={`wrap track${showSlowLoadingUi ? " track--pending" : ""}`}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{
            opacity: showSlowLoadingUi ? 0.62 : 1,
            y: 0,
            transition: reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
          }}
          exit={
            reduceMotion
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, y: -12, transition: { duration: 0.3, ease: [0.5, 0, 0.55, 1] as const } }
          }
          aria-busy={showSlowLoadingUi}
        >
          {showInterstitial ? (
            <TrackDetailSkeletonBlocks />
          ) : (
            <>
              {presaved && (
                <div className="notice" role="status" aria-live="polite">
                  <span aria-hidden>✓</span>
                  <span>you're all set. you'll be the first to hear it. love, saintted.</span>
                </div>
              )}

              <nav className="track__nav" aria-label="Track navigation">
                <Link to="/music" className="back-link">
                  <span className="arrow" aria-hidden>←</span> music
                </Link>

                <span className="track__crumb-wrap" ref={crumbRef}>
                  <button
                    type="button"
                    className="track__crumb"
                    aria-haspopup="listbox"
                    aria-expanded={crumbOpen}
                    disabled={breadcrumbSongs.length <= 1}
                    onClick={() => setCrumbOpen((o) => !o)}
                  >
                    <span>{displayTrack!.title}</span>
                    {breadcrumbSongs.length > 1 ? (
                      <svg
                        className={`track__caret${crumbOpen ? " track__caret--open" : ""}`}
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
                        className="track__menu"
                        role="listbox"
                        aria-label="Jump to a song"
                        initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {breadcrumbSongs.map((t) => {
                          const active = t.slug === displayTrack!.slug;
                          return (
                            <li key={t.slug} role="option" aria-selected={active}>
                              <Link
                                to={`/music/${t.slug}`}
                                className={`track__option${active ? " track__option--active" : ""}`}
                                onClick={() => setCrumbOpen(false)}
                              >
                                {t.title}
                              </Link>
                            </li>
                          );
                        })}
                      </motion.ul>
                    ) : null}
                  </AnimatePresence>
                </span>

                <div className="track__pair">
                  {prevSlug ? (
                    <Link to={`/music/${prevSlug}`} className="textlink" aria-label="Previous track">
                      <span className="arrow" aria-hidden>←</span> previous
                    </Link>
                  ) : (
                    <span className="textlink textlink--off" aria-disabled="true">
                      <span className="arrow" aria-hidden>←</span> previous
                    </span>
                  )}
                  {nextSlug ? (
                    <Link to={`/music/${nextSlug}`} className="textlink" aria-label="Next track">
                      next <span className="arrow" aria-hidden>→</span>
                    </Link>
                  ) : (
                    <span className="textlink textlink--off" aria-disabled="true">
                      next <span className="arrow" aria-hidden>→</span>
                    </span>
                  )}
                </div>
              </nav>

              <div className="grid-12 track__grid">
                <div className="track__media">
                  <div className="track__frame">
                    <span className="track__art">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          srcSet={coverSrcSet}
                          alt={`${displayTrack!.title} cover art`}
                          decoding="async"
                          fetchPriority="high"
                          sizes="(max-width: 1000px) 92vw, 640px"
                        />
                      ) : (
                        <TrackCoverPlaceholder variant="detail" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="track__info">
                  <p className="eyebrow">{displayTrack!.is_highlighted ? "latest release" : "release"}</p>
                  <div className="track__title-line">
                    <h1 className="track__title">{displayTrack!.title}</h1>
                    {displayTrack!.is_highlighted ? <span className="tag">new</span> : null}
                  </div>

                  <p className="track__meta">
                    {[displayTrack!.year, meta].filter(Boolean).join(" · ")}
                  </p>

                  {(displayTrack!.description || "").trim() ? (
                    <div className="prose track__desc">
                      {(displayTrack!.description || "")
                        .trim()
                        .split(/\n\n+/)
                        .map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                    </div>
                  ) : null}

                  <p className="eyebrow track__listen-label">listen on</p>
                  <ul className="listen">
                    {[
                      { name: "Spotify", key: "spotify", href: sp, icon: spotifyIcon },
                      { name: "Apple Music", key: "apple", href: am, icon: appleMusicIcon },
                      { name: "YouTube", key: "youtube", href: yt, icon: youtubeIcon },
                    ].map((p) => (
                      <li key={p.name}>
                        <a href={p.href} target="_blank" rel="noopener noreferrer" aria-label={`Listen on ${p.name}`} className={`listen__${p.key}`} onClick={() => trackEvent("listen", { slug: displayTrack!.slug, platform: p.key })}>
                          <img src={p.icon} alt="" aria-hidden />
                          <span className="listen__name">{p.name}</span>
                          <span className="listen__go" aria-hidden>↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {spotifyEmbedId && (
                <div className="track__embed">
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
            </>
          )}
          {showSlowLoadingUi ? (
            <div className="track__pending-bar" aria-hidden>
              <span />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {!showInterstitial && moreSongs.length > 0 ? (
        <section className="section track-more" aria-labelledby="more-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="more-title">more releases</h2>
              <Link to="/music" className="textlink">
                all music <span className="arrow" aria-hidden>→</span>
              </Link>
            </div>
            <div className="card-grid card-grid--4">
              {moreSongs.map((t, i) => (
                <TrackCard key={t.slug} track={t} index={i} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
      </div>
    </>
  );
}
