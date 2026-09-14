import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Track } from "../types/track";
import { getTrackArtUrl } from "../utils/trackArt";
import { pad2, remainingPartsFromMs } from "../utils/countdownParts";
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

  const ariaRemaining = `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds until release`;

  const units = [
    ...(parts.days > 0 ? [{ key: "days", value: String(parts.days), label: "days" }] : []),
    { key: "hrs", value: pad2(parts.hours), label: "hours" },
    { key: "min", value: pad2(parts.minutes), label: "minutes" },
    { key: "sec", value: pad2(parts.seconds), label: "seconds" },
  ];

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div
      className="uf2"
      style={
        coverUrl
          ? ({ "--uf2-cover": `url("${coverUrl}")` } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className="uf2__bg"
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        aria-hidden
      />
      <div className="uf2__scrim" aria-hidden />
      <div className="uf2__aurora" aria-hidden>
        <span className="uf2__blob uf2__blob--a" />
        <span className="uf2__blob uf2__blob--b" />
        <span className="uf2__grain" />
      </div>

      <nav className="uf2__nav" aria-label="Site">
        <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--home">
          <svg className="track-detail__nav-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          home
        </Link>
      </nav>

      <div className="uf2__inner">
        <motion.header
          className="uf2__head"
          initial={reduceMotion ? false : { opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          {coverUrl ? (
            <span className="uf2__thumb">
              <img src={coverUrl} alt={`${track.title} cover art`} />
            </span>
          ) : null}
          <span className="uf2__head-text">
            <span className="uf2__badge">
              <span className="uf2__badge-dot" aria-hidden />
              {isLive ? "just released" : "arriving soon"}
            </span>
            <h1 className="uf2__title">{track.title}</h1>
            {track.meta ? <span className="uf2__meta">{track.meta}</span> : null}
          </span>
        </motion.header>

        {validTarget && !isLive ? (
          <motion.div
            className="uf2__countdown"
            role="timer"
            aria-label={ariaRemaining}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease, delay: 0.1 }}
          >
            <span className="uf2__rings" aria-hidden>
              <span className="uf2__ring" />
              <span className="uf2__ring" />
              <span className="uf2__ring" />
            </span>

            <div className="uf2__units">
              {units.map((u, i) => (
                <div className="uf2__unit" key={u.key}>
                  <span className="uf2__value">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={u.value}
                        className="uf2__digit"
                        initial={reduceMotion ? false : { y: "48%", opacity: 0, filter: "blur(6px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        exit={reduceMotion ? { opacity: 0 } : { y: "-48%", opacity: 0, filter: "blur(6px)" }}
                        transition={{ duration: 0.5, ease }}
                      >
                        {u.value}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="uf2__label">{u.label}</span>
                  {i < units.length - 1 ? <span className="uf2__colon" aria-hidden>:</span> : null}
                </div>
              ))}
            </div>
          </motion.div>
        ) : isLive ? (
          <motion.p
            className="uf2__live"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease }}
          >
            out now
          </motion.p>
        ) : (
          <motion.p
            className="uf2__soon"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease }}
          >
            coming soon
          </motion.p>
        )}

        {presave ? (
          <motion.a
            href={presave}
            target="_blank"
            rel="noopener noreferrer"
            className="uf2__cta"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.3 }}
          >
            {isLive ? "listen / save" : "pre-save"}
            <span className="uf2__cta-arrow" aria-hidden>↗</span>
          </motion.a>
        ) : null}
      </div>
    </div>
  );
}
