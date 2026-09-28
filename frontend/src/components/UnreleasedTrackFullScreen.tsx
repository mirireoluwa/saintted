import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Track } from "../types/track";
import { getTrackArtUrl } from "../utils/trackArt";
import { trackEvent } from "../utils/analytics";
import { accentVars } from "../utils/accent";
import { pad2, remainingPartsFromMs } from "../utils/countdownParts";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import "./UnreleasedTrackFullScreen.css";

type Props = {
  track: Track;
};

/**
 * A track that hasn't dropped: the countdown is the page. Huge numerals fill the width,
 * the title sits above them, and a slim footer carries the cover, date and pre-save.
 */
export function UnreleasedTrackFullScreen({ track }: Props) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const reduceMotion = useReducedMotion() ?? false;
  const targetMs = track.release_at ? new Date(track.release_at).getTime() : NaN;
  const validTarget = Number.isFinite(targetMs);
  const isLive = validTarget && nowTick >= targetMs;
  const parts = remainingPartsFromMs(validTarget ? Math.max(0, targetMs - nowTick) : 0);
  const presave = (track.presave_url || "").trim();
  const coverUrl = getTrackArtUrl(track);

  useEffect(() => {
    if (!validTarget || Date.now() >= targetMs) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [validTarget, targetMs]);

  const units = [
    ...(parts.days > 0 ? [{ key: "days", value: String(parts.days), label: "days" }] : []),
    { key: "hrs", value: pad2(parts.hours), label: "hours" },
    { key: "min", value: pad2(parts.minutes), label: "minutes" },
    { key: "sec", value: pad2(parts.seconds), label: "seconds", live: true },
  ];

  const dateLabel = validTarget
    ? new Date(targetMs).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toLowerCase()
    : null;

  const ease = [0.22, 1, 0.36, 1] as const;
  const ariaRemaining = `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds until release`;

  return (
    <div className="wrap uf" style={accentVars(track.accent_color)}>
      <div className="uf__top">
        <Link to="/music" className="back-link">
          <span className="arrow" aria-hidden>←</span> music
        </Link>
        <p className="uf__state">
          <span className="uf__pulse" aria-hidden />
          {isLive ? "out now" : "arriving soon"}
        </p>
      </div>

      <div className="uf__main">
        <h1 className="uf__title rise">{track.title}</h1>

        {validTarget && !isLive ? (
          <div className="uf__units rise" style={{ "--i": 2 } as React.CSSProperties} role="timer" aria-label={ariaRemaining}>
            {units.map((u) => (
              <div className="uf__unit" key={u.key}>
                <span className={`uf__value${u.live ? " uf__value--live" : ""}`}>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={u.value}
                      className="uf__digit"
                      initial={reduceMotion ? false : { y: "35%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { y: "-35%", opacity: 0 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      {u.value}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="uf__label">{u.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="uf__status rise" style={{ "--i": 2 } as React.CSSProperties}>
            {isLive ? "out now" : "coming soon"}
          </p>
        )}
      </div>

      <footer className="uf__foot rise" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="uf__release">
          <span className="uf__thumb">
            {coverUrl ? <img src={coverUrl} alt={`${track.title} cover art`} /> : <TrackCoverPlaceholder variant="card" />}
          </span>
          <span className="uf__release-text">
            <strong>{track.title}</strong>
            <small>{[(track.meta || "single").toLowerCase(), dateLabel].filter(Boolean).join(" · ")}</small>
          </span>
        </div>
        {presave ? (
          <a href={presave} target="_blank" rel="noopener noreferrer" className="btn btn--primary" onClick={() => trackEvent("presave", { slug: track.slug })}>
            {isLive ? "listen / save" : "pre-save"} <span className="arrow" aria-hidden>↗</span>
          </a>
        ) : null}
      </footer>
    </div>
  );
}
