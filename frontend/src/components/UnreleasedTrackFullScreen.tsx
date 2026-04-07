import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
            home
          </Link>
        </nav>

        <div className="unreleased-fs__badge">unreleased</div>

        <h1 className="unreleased-fs__title">{track.title}</h1>
        <p className="unreleased-fs__meta">{track.meta}</p>

        {validTarget ? (
          !isLive ? (
            <div
              className="unreleased-fs__timer"
              role="timer"
              aria-live="polite"
              aria-atomic="true"
              aria-label={ariaRemaining}
            >
              {parts.days > 0 ? (
                <div className="unreleased-fs__unit">
                  <span className="unreleased-fs__value">{parts.days}</span>
                  <span className="unreleased-fs__label">days</span>
                </div>
              ) : null}
              <div className="unreleased-fs__unit">
                <span className="unreleased-fs__value">{pad2(parts.hours)}</span>
                <span className="unreleased-fs__label">hours</span>
              </div>
              <span className="unreleased-fs__colon" aria-hidden>
                :
              </span>
              <div className="unreleased-fs__unit">
                <span className="unreleased-fs__value">{pad2(parts.minutes)}</span>
                <span className="unreleased-fs__label">min</span>
              </div>
              <span className="unreleased-fs__colon" aria-hidden>
                :
              </span>
              <div className="unreleased-fs__unit">
                <span className="unreleased-fs__value">{pad2(parts.seconds)}</span>
                <span className="unreleased-fs__label">sec</span>
              </div>
            </div>
          ) : (
            <p className="unreleased-fs__live">out now</p>
          )
        ) : (
          <p className="unreleased-fs__soon">coming soon</p>
        )}

        {presave ? (
          <a
            href={presave}
            target="_blank"
            rel="noopener noreferrer"
            className="unreleased-fs__cta"
          >
            {isLive ? "Listen / save" : "Pre-save"}
          </a>
        ) : null}

        {!coverUrl ? (
          <div className="unreleased-fs__placeholder-wrap" aria-hidden>
            <TrackCoverPlaceholder variant="detail" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
