import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { staggerChildren, sectionTransition } from "../utils/motion";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import { getTrackArtUrl } from "../utils/trackArt";

interface MusicSectionProps {
  tracks: Track[];
  loading?: boolean;
}

export function MusicSection({ tracks, loading }: MusicSectionProps) {
  const reduceMotion = useReducedMotion() ?? false;

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
          {tracks.map((track) => {
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
