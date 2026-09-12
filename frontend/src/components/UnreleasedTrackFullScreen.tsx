import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { Track } from "../types/track";
import { getTrackArtUrl } from "../utils/trackArt";
import { pad2, remainingPartsFromMs } from "../utils/countdownParts";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import "../pages/TrackDetailPage.css";
import "./UnreleasedTrackFullScreen.css";

type Props = {
  track: Track;
};

export function UnreleasedTrackFullScreen({ track }: Props) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const reduceMotion = useReducedMotion() ?? false;
  const releaseIso = track.release_at || "";
  const targetMs = releaseIso ? new Date(releaseIso).getTime() : NaN;
  const validTarget = Number.isFinite(targetMs);
  const isLive = validTarget && nowTick >= targetMs;
  const remainingMs = validTarget ? Math.max(0, targetMs - nowTick) : 0;
  const parts = remainingPartsFromMs(remainingMs);
  const presave = (track.presave_url || "").trim();
  const coverUrl = getTrackArtUrl(track);

  useEffect(() => {
    if (!validTarget || Date.now() >= targetMs) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [validTarget, targetMs]);

  const ariaRemaining = `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds`;

  const units: { value: string; label: string }[] = [
    ...(parts.days > 0 ? [{ value: String(parts.days), label: "days" }] : []),
    { value: pad2(parts.hours), label: "hrs" },
    { value: pad2(parts.minutes), label: "min" },
    { value: pad2(parts.seconds), label: "sec" },
  ];

  const stagger = (i: number) =>
    reduceMotion
      ? { duration: 0 }
      : { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay: 0.08 * i };

  return (
    <div className="unreleased-fs">
      <div
        className="unreleased-fs__bg"
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        aria-hidden
      />
      <div className="unreleased-fs__scrim" aria-hidden />

      <div className="unreleased-fs__content">
        <nav className="unreleased-fs__nav-bar" aria-label="Site">
          <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--home">
            <svg className="track-detail__nav-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            home
          </Link>
        </nav>

        {coverUrl ? (
          <motion.div
            className="unreleased-fs__cover"
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={stagger(0)}
          >
            <img src={coverUrl} alt={`${track.title} cover art`} className="unreleased-fs__cover-img" />
          </motion.div>
        ) : (
          <motion.div
            className="unreleased-fs__cover unreleased-fs__cover--placeholder"
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={stagger(0)}
            aria-hidden
          >
            <TrackCoverPlaceholder variant="detail" />
          </motion.div>
        )}

        <motion.div
          className="unreleased-fs__badge"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(1)}
        >
          <span className="unreleased-fs__badge-dot" aria-hidden />
          {isLive ? "just released" : "arriving soon"}
        </motion.div>

        <motion.h1
          className="unreleased-fs__title"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(2)}
        >
          {track.title}
        </motion.h1>
        {track.meta ? (
          <motion.p
            className="unreleased-fs__meta"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(3)}
          >
            {track.meta}
          </motion.p>
        ) : null}

        {validTarget ? (
          !isLive ? (
            <motion.div
              className="unreleased-fs__timer"
              role="timer"
              aria-live="polite"
              aria-atomic="true"
              aria-label={ariaRemaining}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(4)}
            >
              {units.map((u, i) => (
                <div key={u.label} className="unreleased-fs__unit">
                  <span className="unreleased-fs__value">{u.value}</span>
                  <span className="unreleased-fs__label">{u.label}</span>
                  {i < units.length - 1 ? <span className="unreleased-fs__sep" aria-hidden /> : null}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.p
              className="unreleased-fs__live"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(4)}
            >
              out now
            </motion.p>
          )
        ) : (
          <motion.p
            className="unreleased-fs__soon"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(4)}
          >
            coming soon
          </motion.p>
        )}

        {presave ? (
          <motion.a
            href={presave}
            target="_blank"
            rel="noopener noreferrer"
            className="unreleased-fs__cta"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(5)}
          >
            {isLive ? "listen / save" : "pre-save"}
            <span className="unreleased-fs__cta-arrow" aria-hidden>↗</span>
          </motion.a>
        ) : null}
      </div>
    </div>
  );
}
