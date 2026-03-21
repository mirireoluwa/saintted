import { useEffect, useState } from "react";
import { fetchFeaturedVideos } from "../api/client";
import type { FeaturedVideo } from "../types/featuredVideo";

const EMBED_BASE = "https://www.youtube.com/embed";

export function Featured() {
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="featured-videos">
          {videos.map((video) => (
            <article key={video.id} className="featured-video">
              <div className="featured-video__embed-wrap">
                <iframe
                  src={`${EMBED_BASE}/${video.youtube_id}?rel=0`}
                  title={video.title || `YouTube video ${video.youtube_id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="featured-video__iframe"
                />
              </div>
              {video.title ? (
                <h3 className="featured-video__title">{video.title}</h3>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
