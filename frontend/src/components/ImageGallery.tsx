import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGalleryImages } from "../api/client";
import type { GalleryImage } from "../types/galleryImage";
import { staggerChildren, sectionTransition } from "../utils/motion";
import { resolvePublicMediaUrl } from "../utils/mediaUrl";

export function ImageGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [landscapeIds, setLandscapeIds] = useState<Record<number, boolean>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    fetchGalleryImages()
      .then(setImages)
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, prev, next]);

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 48) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (images.length === 0 && !loading) return null;

  const activeImage = lightboxIndex !== null ? images[lightboxIndex] : null;

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
          {images.map((img, idx) => (
            <motion.figure
              key={img.id}
              className={`image-gallery__item${landscapeIds[img.id] ? " image-gallery__item--landscape" : ""}`}
              variants={{
                hidden: reduceMotion ? {} : { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={sectionTransition(reduceMotion)}
              onClick={() => setLightboxIndex(idx)}
              role="button"
              tabIndex={0}
              aria-label={`View ${img.caption || "gallery image"} in fullscreen`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxIndex(idx); } }}
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

      <AnimatePresence>
        {activeImage !== null && lightboxIndex !== null ? (
          <motion.div
            className="lightbox__overlay"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxIndex(null)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              className="lightbox__close"
              aria-label="Close"
              onClick={() => setLightboxIndex(null)}
            >
              ✕
            </button>

            <button
              type="button"
              className="lightbox__nav lightbox__nav--prev"
              aria-label="Previous image"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              ‹
            </button>

            <motion.div
              className="lightbox__img-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="lightbox__counter">
                {lightboxIndex + 1} / {images.length}
              </span>
              <motion.img
                key={lightboxIndex}
                src={resolvePublicMediaUrl(activeImage.image_url || activeImage.image || "")}
                alt={activeImage.caption || "Saintted gallery image"}
                className="lightbox__img"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                draggable={false}
              />
              {activeImage.caption ? (
                <p className="lightbox__caption">{activeImage.caption}</p>
              ) : null}
            </motion.div>

            <button
              type="button"
              className="lightbox__nav lightbox__nav--next"
              aria-label="Next image"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              ›
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
