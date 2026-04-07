import { useEffect, useRef, useState } from "react";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import { readHeroCache } from "../utils/heroCache";

type HeroProps = {
  releaseConfig: ReleaseCountdown | null;
  releaseLoaded: boolean;
};

export function Hero({ releaseConfig, releaseLoaded }: HeroProps) {
  const [showAltTag, setShowAltTag] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [headerImageFocus, setHeaderImageFocus] = useState({ x: 50, y: 50 });
  const [heroPhotoVisible, setHeroPhotoVisible] = useState(false);
  const prevHeroUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setShowAltTag((prev) => !prev);
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const fallback = "/hero-bg.png";

    if (!releaseLoaded) {
      const cached = readHeroCache();
      if (cached) {
        setHeaderImageUrl(cached.url);
        setHeaderImageFocus(cached.focus);
      }
      return;
    }

    if (!releaseConfig) {
      setHeaderImageUrl(fallback);
      setHeaderImageFocus({ x: 50, y: 50 });
      return;
    }

    const uploadedUrl = (releaseConfig.header_image_file_url || "").trim();
    const customUrl = (releaseConfig.header_image_url || "").trim();
    const url = uploadedUrl || customUrl || fallback;
    const focus = {
      x: typeof releaseConfig.header_image_focus_x === "number" ? releaseConfig.header_image_focus_x : 50,
      y: typeof releaseConfig.header_image_focus_y === "number" ? releaseConfig.header_image_focus_y : 50,
    };
    setHeaderImageUrl(url);
    setHeaderImageFocus(focus);
  }, [releaseLoaded, releaseConfig]);

  useEffect(() => {
    if (!headerImageUrl) {
      prevHeroUrlRef.current = null;
      setHeroPhotoVisible(false);
      return;
    }
    if (prevHeroUrlRef.current === headerImageUrl) {
      return;
    }
    prevHeroUrlRef.current = headerImageUrl;
    setHeroPhotoVisible(false);
    const id = window.requestAnimationFrame(() => setHeroPhotoVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [headerImageUrl]);

  return (
    <section id="hero-section" className="hero-section">
      {headerImageUrl ? (
        <div
          className={`hero-section__photo${heroPhotoVisible ? " hero-section__photo--visible" : ""}`}
          style={{
            backgroundImage: `url(${headerImageUrl})`,
            backgroundPosition: `${headerImageFocus.x}% ${headerImageFocus.y}%`,
            transformOrigin: `${headerImageFocus.x}% ${headerImageFocus.y}%`,
          }}
          aria-hidden
        />
      ) : null}
      <div className="hero-inner">
        <div className="hero-content">
          <div className="hero-titles">
            <h1 className="hero-title">SAINTTED</h1>
          </div>

          <div className="hero-tags hero-tags--bottom">
            <span className="hero-tag">ARTIST</span>
            <span className={`hero-tag hero-tag--swap${showAltTag ? " hero-tag--alt" : ""}`}>
              <span className="hero-tag__line hero-tag__line--primary">PRODUCER</span>
              <span className="hero-tag__line hero-tag__line--alt">silence, selah</span>
            </span>
          </div>

          <a href="#music-section" className="hero-scroll">
            <span className="hero-scroll__text">Scroll</span>
            <span className="hero-scroll__chevron">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
