import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { trackEvent } from "../utils/analytics";
import { getTrackArtSrcSet, getTrackArtUrl } from "../utils/trackArt";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import "./Releases.css";

type FeaturedReleaseProps = { track: Track; isNew?: boolean };

/** The newest release as one solid card: the cover fills its left half edge to edge, the story sits beside it. */
export function FeaturedRelease({ track, isNew = false }: FeaturedReleaseProps) {
  const art = getTrackArtUrl(track);
  const detail = `/music/${track.slug}`;
  const blurb = (track.description || "").trim().split(/\n\n+/)[0] || "";
  const meta = [track.year, (track.meta || "").toLowerCase()].filter(Boolean).join(" · ");
  const open = () => trackEvent("track_click", { slug: track.slug });

  return (
    <div className="wrap">
      <article className="feature">
        <Link to={detail} onClick={open} className="feature__cover" aria-label={`${track.title}, latest release`}>
          {art ? (
            <img src={art} srcSet={getTrackArtSrcSet(track)} sizes="(max-width: 900px) 92vw, 640px" alt={`${track.title} cover art`} decoding="async" />
          ) : (
            <TrackCoverPlaceholder variant="detail" />
          )}
          {isNew ? <span className="card__tag">new</span> : null}
        </Link>

        <div className="feature__body">
          <p className="eyebrow">latest release</p>
          <h3 className="feature__title">
            <Link to={detail} onClick={open}>{track.title}</Link>
          </h3>
          <p className="feature__meta">{meta}</p>
          {blurb ? <p className="feature__blurb">{blurb}</p> : null}
          <div className="btn-row">
            <Link to={detail} onClick={open} className="btn btn--primary">
              listen <span className="arrow" aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
