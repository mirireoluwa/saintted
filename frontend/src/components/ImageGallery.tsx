import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchGalleryImages } from "../api/client";
import type { GalleryImage } from "../types/galleryImage";
import { staggerChildren, sectionTransition } from "../utils/motion";
import { resolvePublicMediaUrl } from "../utils/mediaUrl";
export function ImageGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [landscapeIds, setLandscapeIds] = useState<Record<number, boolean>>({});
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    fetchGalleryImages()
      .then(setImages)
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  if (images.length === 0 && !loading) return null;

  return (
    <section className="image-gallery-section" id="image-gallery-section">
      <div className="section-label">
        <span className="section-label__text">.images</span>
        <span className="section-label__line" aria-hidden />
      </div>
      {loading ? (
        <div className="image-gallery image-gallery--skeleton">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="image-gallery__item image-gallery__item--skeleton" />
          ))}
        </div>
      ) : (
        <motion.div
          className="image-gallery"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: staggerChildren(reduceMotion, 0.06) },
            },
          }}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          {images.map((img) => (
            <motion.figure
              key={img.id}
              className={`image-gallery__item${landscapeIds[img.id] ? " image-gallery__item--landscape" : ""}`}
              variants={{
                hidden: reduceMotion ? {} : { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={sectionTransition(reduceMotion)}
            >
              <motion.img
                src={resolvePublicMediaUrl(img.image_url || img.image || "")}
                alt={img.caption || "Saintted gallery image"}
                className="image-gallery__img"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                initial={reduceMotion ? false : { opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  const isLandscape = naturalWidth > naturalHeight;
                  setLandscapeIds((prev) =>
                    prev[img.id] === isLandscape ? prev : { ...prev, [img.id]: isLandscape }
                  );
                }}
              />
              {img.caption ? <figcaption className="image-gallery__caption">{img.caption}</figcaption> : null}
            </motion.figure>
          ))}
        </motion.div>
      )}
    </section>
  );
}
