import { useEffect, useState } from "react";
import { fetchGalleryImages } from "../api/client";
import type { GalleryImage } from "../types/galleryImage";

export function ImageGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="image-gallery">
          {images.map((img) => (
            <figure key={img.id} className="image-gallery__item">
              <img
                src={img.image_url || img.image}
                alt={img.caption || "Saintted gallery image"}
                className="image-gallery__img"
                loading="lazy"
                decoding="async"
              />
              {img.caption ? <figcaption className="image-gallery__caption">{img.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
