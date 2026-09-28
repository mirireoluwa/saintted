import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { getTrackArtSrcSet, getTrackArtUrl } from "../utils/trackArt";
import { trackEvent } from "../utils/analytics";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import "./Releases.css";

type FeaturedReleaseProps = { track: Track; isNew?: boolean };

/** The newest release, given room: blurred-cover backdrop, framed cover, blurb and listen link. */
export function FeaturedRelease({ track, isNew = false }: FeaturedReleaseProps) {
  const art = getTrackArtUrl(track);
  const detail = `/music/${track.slug}`;
  const blurb = (track.description || "").trim().split(/\n\n+/)[0] || "";
  const meta = [track.year, (track.meta || "").toLowerCase()].filter(Boolean).join(" · ");

  return (
    <div className="feature">
      {art ? <span className="feature__backdrop" style={{ backgroundImage: `url(${art})` }} aria-hidden /> : null}
      <div className="wrap feature__grid">
        <Link to={detail} onClick={() => trackEvent("track_click", { slug: track.slug })} className="feature__frame" aria-label={`${track.title}, latest release`}>
          <span className="feature__art">
            {art ? (
              <img src={art} srcSet={getTrackArtSrcSet(track)} sizes="(max-width: 1000px) 92vw, 560px" alt={`${track.title} cover art`} decoding="async" />
            ) : (
              <TrackCoverPlaceholder variant="detail" />
            )}
          </span>
        </Link>

        <div className="feature__body">
          <p className="eyebrow">latest release{isNew ? " · new" : ""}</p>
          <h3 className="feature__title">
            <Link to={detail}>{track.title}</Link>
          </h3>
          <p className="feature__meta">{meta}</p>
          {blurb ? <p className="feature__blurb">{blurb}</p> : null}
          <div className="btn-row">
            <Link to={detail} onClick={() => trackEvent("track_click", { slug: track.slug })} className="btn btn--primary">
              listen <span className="arrow" aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
