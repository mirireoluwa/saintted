import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import { getTrackArtUrl } from "../utils/trackArt";

interface MusicSectionProps {
  tracks: Track[];
  loading?: boolean;
}

export function MusicSection({ tracks, loading }: MusicSectionProps) {
  return (
    <section className="music-section" id="music-section">
      <div className="section-label">
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
        <div className="music-grid">
          {tracks.map((track) => {
            const artUrl = getTrackArtUrl(track);
            return (
              <article key={track.id} className="track-card">
                <Link to={`/music/${track.slug}`} className="track-card-link">
                  <div className="track-card__art-frame">
                    <div className="track-art">
                      {artUrl ? (
                        <img
                          src={artUrl}
                          alt={`${track.title} cover art`}
                          className="track-art__img"
                          loading="lazy"
                          decoding="async"
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
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
