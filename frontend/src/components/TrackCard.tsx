import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { getTrackArtSrcSet, getTrackArtUrl } from "../utils/trackArt";
import { trackEvent } from "../utils/analytics";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import "./Releases.css";

type TrackCardProps = {
  track: Track;
  /** Marks the card with a small accent "new" tag. */
  isNew?: boolean;
  /** Fades/rises in with a stagger (index into the grid). */
  index?: number;
};

/** Square release card: the title sits over the bottom of the cover, "listen" appears on hover. */
export function TrackCard({ track, isNew = false, index = 0 }: TrackCardProps) {
  const art = getTrackArtUrl(track);
  const srcSet = getTrackArtSrcSet(track);
  const meta = [track.year, (track.meta || "").toLowerCase()].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/music/${track.slug}`}
      className="card rise"
      onClick={() => trackEvent("track_click", { slug: track.slug })}
      style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
    >
      <span className="card__art">
        {art ? (
          <img
            src={art}
            srcSet={srcSet}
            sizes="(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 25vw"
            alt={`${track.title} cover art`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <TrackCoverPlaceholder variant="card" />
        )}
        <span className="card__shade" aria-hidden />
        {isNew ? <span className="card__tag">new</span> : null}
        <span className="card__cap">
          <small>{meta}</small>
          <strong>{track.title}</strong>
        </span>
        <span className="card__go" aria-hidden>listen <span className="arrow">↗</span></span>
      </span>
    </Link>
  );
}
