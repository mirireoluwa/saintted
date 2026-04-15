import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { compactCountdownFromMs, pad2, remainingPartsFromMs } from "../utils/countdownParts";
import { staggerChildren, sectionTransition } from "../utils/motion";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import { getTrackArtUrl } from "../utils/trackArt";

interface MusicSectionProps {
  tracks: Track[];
  loading?: boolean;
}

function upcomingStatusAria(parts: ReturnType<typeof remainingPartsFromMs>) {
  return `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds remaining`;
}

function releaseMs(track: Track): number | null {
  const iso = (track.release_at || "").trim();
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function MusicSection({ tracks, loading }: MusicSectionProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [nowTick, setNowTick] = useState(() => Date.now());

  const upcoming = useMemo(
    () =>
      tracks.filter((t) => {
        if (!t.is_unreleased) return false;
        const ms = releaseMs(t);
        if (ms == null) return true;
        return ms > nowTick;
      }),
    [tracks, nowTick]
  );
  const highlightedTracks = useMemo(
    () =>
      tracks.filter((t) => {
        const ms = releaseMs(t);
        const autoHighlighted = !!t.is_unreleased && ms != null && ms <= nowTick;
        return !!t.is_highlighted || autoHighlighted;
      }),
    [tracks, nowTick]
  );
  const regularTracks = useMemo(
    () =>
      tracks.filter((t) => {
        const ms = releaseMs(t);
        const autoHighlighted = !!t.is_unreleased && ms != null && ms <= nowTick;
        const highlighted = !!t.is_highlighted || autoHighlighted;
        if (highlighted) return false;
        if (!t.is_unreleased) return true;
        return ms != null && ms <= nowTick;
      }),
    [tracks, nowTick]
  );

  useEffect(() => {
    if (upcoming.length === 0) return;
    const hasFuture = upcoming.some((t) => {
      if (!t.release_at) return false;
      const target = new Date(t.release_at).getTime();
      return !Number.isNaN(target) && Date.now() < target;
    });
    if (!hasFuture) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [upcoming]);

  return (
    <section className="music-section" id="music-section">
      {!loading && upcoming.length > 0 ? (
        <div className="music-unreleased">
          <div className="music-unreleased__label">
            <span className="music-unreleased__label-text">.upcoming</span>
            <span className="music-unreleased__label-line" aria-hidden />
          </div>
          <motion.div
            className="music-unreleased__list"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: staggerChildren(reduceMotion, 0.08) },
              },
            }}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
          >
            {upcoming.map((track) => {
              const artUrl = getTrackArtUrl(track);
              const releaseIso = track.release_at || "";
              const targetMs = releaseIso ? new Date(releaseIso).getTime() : NaN;
              const validTarget = Number.isFinite(targetMs);
              const isLive = validTarget && nowTick >= targetMs;
              const remainingMs = validTarget ? Math.max(0, targetMs - nowTick) : 0;
              const parts = remainingPartsFromMs(remainingMs);
              const timeLine = !validTarget
                ? "coming soon"
                : isLive
                  ? "out now"
                  : compactCountdownFromMs(remainingMs);
              const presave = (track.presave_url || "").trim();

              const timerMobileOverlay =
                !validTarget ? (
                  <div className="music-upcoming-row__timer-overlay music-upcoming-row__timer--mobile-only">
                    <div className="music-upcoming-row__timer-overlay__inner">
                      <p className="music-upcoming-row__timer-overlay__text">coming soon</p>
                    </div>
                  </div>
                ) : isLive ? (
                  <div
                    className="music-upcoming-row__timer-overlay music-upcoming-row__timer--mobile-only music-upcoming-row__timer--live"
                    role="status"
                  >
                    <div className="music-upcoming-row__timer-overlay__inner">
                      <p className="music-upcoming-row__timer-overlay__text">out now</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="music-upcoming-row__timer-overlay music-upcoming-row__timer--mobile-only"
                    role="timer"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={upcomingStatusAria(parts)}
                  >
                    <div className="music-upcoming-row__timer-overlay__inner">
                      <p className="music-upcoming-row__timer-overlay__text">{timeLine}</p>
                    </div>
                  </div>
                );

              const timerDesktop =
                !validTarget ? (
                  <p className="music-upcoming-row__status music-upcoming-row__status--desktop-only">coming soon</p>
                ) : isLive ? (
                  <p className="music-upcoming-row__status music-upcoming-row__status--desktop-only music-upcoming-row__timer--live">
                    out now
                  </p>
                ) : (
                  <div
                    className="music-upcoming-row__segments music-upcoming-row__segments--desktop-only"
                    role="timer"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={upcomingStatusAria(parts)}
                  >
                    {parts.days > 0 ? (
                      <div className="music-upcoming-row__segment">
                        <span className="music-upcoming-row__segment-val">{parts.days}</span>
                        <span className="music-upcoming-row__segment-lbl">days</span>
                      </div>
                    ) : null}
                    <div className="music-upcoming-row__segment">
                      <span className="music-upcoming-row__segment-val">{pad2(parts.hours)}</span>
                      <span className="music-upcoming-row__segment-lbl">hrs</span>
                    </div>
                    <div className="music-upcoming-row__segment">
                      <span className="music-upcoming-row__segment-val">{pad2(parts.minutes)}</span>
                      <span className="music-upcoming-row__segment-lbl">min</span>
                    </div>
                    <div className="music-upcoming-row__segment">
                      <span className="music-upcoming-row__segment-val">{pad2(parts.seconds)}</span>
                      <span className="music-upcoming-row__segment-lbl">sec</span>
                    </div>
                  </div>
                );

              const ctaLabel = isLive ? "Listen / save" : "Pre-save";
              const ctaInTitle = presave ? (
                <a
                  href={presave}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="music-upcoming-row__cta music-upcoming-row__cta--in-title music-upcoming-row__cta--mobile-only"
                >
                  {ctaLabel}
                </a>
              ) : null;
              const ctaDesktop = presave ? (
                <a
                  href={presave}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="music-upcoming-row__cta music-upcoming-row__cta--desktop-only"
                >
                  {ctaLabel}
                </a>
              ) : null;

              const detailPath = `/music/${track.slug}`;

              return (
                <motion.div
                  key={track.id}
                  className="music-upcoming-row"
                  variants={{
                    hidden: reduceMotion ? {} : { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={sectionTransition(reduceMotion)}
                >
                  <div className="music-upcoming-unified">
                    <article className="music-upcoming__card-cell">
                      <div className="music-upcoming-card__stack">
                        <Link
                          to={detailPath}
                          className="music-upcoming-card__art-link track-card-link track-card-link--unreleased"
                        >
                          <div className="track-card__art-frame">
                            <div className="track-art track-art--unreleased">
                              <span className="track-card__unreleased-badge">unreleased</span>
                              {timerMobileOverlay}
                              {artUrl ? (
                                <motion.img
                                  src={artUrl}
                                  alt={`${track.title} cover art`}
                                  className="track-art__img track-art__img--unreleased"
                                  loading="lazy"
                                  decoding="async"
                                  initial={reduceMotion ? false : { opacity: 0, scale: 1.03 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{
                                    duration: reduceMotion ? 0 : 0.35,
                                    ease: [0.22, 1, 0.36, 1],
                                  }}
                                />
                              ) : (
                                <TrackCoverPlaceholder variant="card" />
                              )}
                            </div>
                          </div>
                        </Link>
                        <div className="track-card__body track-card__body--unreleased">
                          <div className="music-upcoming-card__title-row">
                            <Link to={detailPath} className="music-upcoming-card__title-link">
                              <h3 className="track-name">{track.title}</h3>
                            </Link>
                            {ctaInTitle}
                          </div>
                          <Link to={detailPath} className="music-upcoming-card__meta-link">
                            <p className="track-meta track-meta--unreleased">
                              <span>single</span>
                              <span className="track-meta__dot" aria-hidden>
                                {" "}
                                ·{" "}
                              </span>
                              <span className="track-meta__soon">not out yet</span>
                            </p>
                          </Link>
                        </div>
                      </div>
                    </article>
                    <aside className="music-upcoming-row__aside">
                      {timerDesktop}
                      {ctaDesktop}
                    </aside>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ) : null}

      {!loading && highlightedTracks.length > 0 ? (
        <div className="music-highlighted">
          <div className="music-highlighted__label">
            <span className="music-highlighted__label-text">.new release</span>
            <span className="music-highlighted__label-line" aria-hidden />
          </div>
          <motion.div
            className="music-highlighted__list"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: staggerChildren(reduceMotion, 0.08) },
              },
            }}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
          >
            {highlightedTracks.map((track) => {
              const artUrl = getTrackArtUrl(track);
              return (
                <motion.article
                  key={track.id}
                  className="track-card track-card--highlighted"
                  variants={{
                    hidden: reduceMotion ? {} : { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={sectionTransition(reduceMotion)}
                >
                  <Link to={`/music/${track.slug}`} className="track-card-link track-card-link--highlighted">
                    <div className="track-card__art-frame">
                      <div className="track-art">
                        {artUrl ? (
                          <motion.img
                            src={artUrl}
                            alt={`${track.title} cover art`}
                            className="track-art__img"
                            loading="lazy"
                            decoding="async"
                            initial={reduceMotion ? false : { opacity: 0, scale: 1.03 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                          />
                        ) : (
                          <TrackCoverPlaceholder variant="card" />
                        )}
                      </div>
                    </div>
                    <div className="track-card__body">
                      <div className="track-card__title-row">
                        <h3 className="track-name">{track.title}</h3>
                        <span className="track-card__new-pill">NEW</span>
                      </div>
                      <p className="track-meta">{track.meta}</p>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      ) : null}

      <div className="section-label music-section__label-released">
        <span className="section-label__text">.my music</span>
        <span className="section-label__line" aria-hidden />
      </div>
      {loading ? (
        <div className="music-grid">
          {Array.from({ length: 5 }).map((_, idx) => (
            <article key={idx} className="track-card track-card--skeleton">
              <div className="track-card-link track-card-link--skeleton" aria-hidden>
                <div className="track-card__art-frame">
                  <div className="track-art track-art--skeleton" />
                </div>
                <div className="track-card__body">
                  <div className="track-line track-line--primary" />
                  <div className="track-line track-line--secondary" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <motion.div
          className="music-grid"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: staggerChildren(reduceMotion, 0.055) },
            },
          }}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          {regularTracks.map((track) => {
              const artUrl = getTrackArtUrl(track);
              return (
                <motion.article
                  key={track.id}
                  className="track-card"
                  variants={{
                    hidden: reduceMotion ? {} : { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={sectionTransition(reduceMotion)}
                >
                  <Link to={`/music/${track.slug}`} className="track-card-link">
                    <div className="track-card__art-frame">
                      <div className="track-art">
                        {artUrl ? (
                          <motion.img
                            src={artUrl}
                            alt={`${track.title} cover art`}
                            className="track-art__img"
                            loading="lazy"
                            decoding="async"
                            initial={reduceMotion ? false : { opacity: 0, scale: 1.03 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                          />
                        ) : (
                          <TrackCoverPlaceholder variant="card" />
                        )}
                      </div>
                    </div>
                    <div className="track-card__body">
                      <h3 className="track-name">{track.title}</h3>
                      <p className="track-meta">{track.meta}</p>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
        </motion.div>
      )}
    </section>
  );
}
