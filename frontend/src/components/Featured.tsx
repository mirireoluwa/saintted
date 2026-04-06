import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchFeaturedVideos } from "../api/client";
import type { FeaturedVideo } from "../types/featuredVideo";
import { staggerChildren, sectionTransition } from "../utils/motion";

const EMBED_BASE = "https://www.youtube.com/embed";

export function Featured() {
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    fetchFeaturedVideos()
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  if (videos.length === 0 && !loading) return null;

  return (
    <section className="featured-section" id="featured-section">
      <div className="section-label">
        <span className="section-label__text">.videos</span>
        <span className="section-label__line" aria-hidden />
      </div>
      {loading ? (
        <div className="featured-videos">
          {Array.from({ length: 2 }).map((_, idx) => (
            <article key={idx} className="featured-video featured-video--skeleton">
              <div className="featured-video__embed-wrap featured-video__embed-wrap--skeleton" />
              <div className="featured-video__title featured-video__title--skeleton" />
            </article>
          ))}
        </div>
      ) : (
        <motion.div
          className="featured-videos"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: staggerChildren(reduceMotion, 0.1) },
            },
          }}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          {videos.map((video) => (
            <motion.article
              key={video.id}
              className="featured-video"
              variants={{
                hidden: reduceMotion ? {} : { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={sectionTransition(reduceMotion)}
            >
              <motion.div
                className="featured-video__embed-wrap"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <iframe
                  src={`${EMBED_BASE}/${video.youtube_id}?rel=0`}
                  title={video.title || `YouTube video ${video.youtube_id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="featured-video__iframe"
                />
              </motion.div>
              {video.title ? (
                <h3 className="featured-video__title">{video.title}</h3>
              ) : null}
            </motion.article>
          ))}
        </motion.div>
      )}
    </section>
  );
}
