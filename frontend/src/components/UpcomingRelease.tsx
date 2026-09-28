import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { trackEvent } from "../utils/analytics";
import { accentVars } from "../utils/accent";
import { pad2, remainingPartsFromMs } from "../utils/countdownParts";
import { releaseMs } from "../utils/releaseGroups";
import { getTrackArtUrl } from "../utils/trackArt";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import "./Releases.css";

type UpcomingReleaseProps = { track: Track; now: number };

/** An unreleased track: framed cover on the left, calm countdown and pre-save on the right. */
export function UpcomingRelease({ track, now }: UpcomingReleaseProps) {
  const art = getTrackArtUrl(track);
  const target = releaseMs(track);
  const live = target != null && now >= target;
  const parts = remainingPartsFromMs(target != null ? Math.max(0, target - now) : 0);
  const presave = (track.presave_url || "").trim();
  const dateLabel =
    target != null
      ? new Date(target).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toLowerCase()
      : "date to be announced";
  const detail = `/music/${track.slug}`;

  const cells: Array<[string, string]> = [];
  if (target != null && !live) {
    if (parts.days > 0) cells.push([String(parts.days), "days"]);
    cells.push([pad2(parts.hours), "hrs"], [pad2(parts.minutes), "min"], [pad2(parts.seconds), "sec"]);
  }

  return (
    <article className="upcoming" style={accentVars(track.accent_color)}>
      <Link to={detail} className="upcoming__frame" aria-label={`${track.title}, upcoming release`}>
        <span className="upcoming__art">
          {art ? <img src={art} alt={`${track.title} cover art`} loading="lazy" decoding="async" /> : <TrackCoverPlaceholder variant="card" />}
        </span>
      </Link>

      <div className="upcoming__body">
        <p className="eyebrow">upcoming · {dateLabel}</p>
        <h3 className="upcoming__title">
          <Link to={detail}>{track.title}</Link>
        </h3>

        {cells.length > 0 ? (
          <div
            className="upcoming__timer"
            role="timer"
            aria-live="off"
            aria-label={`${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds remaining`}
          >
            {cells.map(([value, label]) => (
              <div className="upcoming__cell" key={label}>
                <strong>{value}</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="upcoming__status">{live ? "out now" : "coming soon"}</p>
        )}

        <div className="btn-row">
          {presave ? (
            <a href={presave} target="_blank" rel="noopener noreferrer" className="btn btn--primary" onClick={() => trackEvent("presave", { slug: track.slug })}>
              {live ? "listen / save" : "pre-save"} <span className="arrow" aria-hidden>↗</span>
            </a>
          ) : null}
          <Link to={detail} className="btn" onClick={() => trackEvent("track_click", { slug: track.slug })}>details</Link>
        </div>
      </div>
    </article>
  );
}
