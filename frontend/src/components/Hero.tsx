import { useEffect, useRef, useState } from "react";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import { readHeroCache } from "../utils/heroCache";

type HeroProps = {
  releaseConfig: ReleaseCountdown | null;
  releaseLoaded: boolean;
  summaryText?: string;
};

export function Hero({ releaseConfig, releaseLoaded, summaryText }: HeroProps) {
  const [showAltTag, setShowAltTag] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [headerVideoUrl, setHeaderVideoUrl] = useState<string | null>(null);
  const [headerImageFocus, setHeaderImageFocus] = useState({ x: 50, y: 50 });
  const [heroPhotoVisible, setHeroPhotoVisible] = useState(false);
  const prevHeroMediaRef = useRef<string | null>(null);

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
        setHeaderImageUrl(cached.imageUrl);
        setHeaderVideoUrl(cached.videoUrl || null);
        setHeaderImageFocus(cached.focus);
      }
      return;
    }

    if (!releaseConfig) {
      setHeaderImageUrl(fallback);
      setHeaderVideoUrl(null);
      setHeaderImageFocus({ x: 50, y: 50 });
      return;
    }

    const uploadedVideo = (releaseConfig.header_video_file_url || "").trim();
    const customVideo = (releaseConfig.header_video_url || "").trim();
    const uploadedUrl = (releaseConfig.header_image_file_url || "").trim();
    const customUrl = (releaseConfig.header_image_url || "").trim();
    const imageUrl = uploadedUrl || customUrl || fallback;
    const videoUrl = uploadedVideo || customVideo || null;
    const focus = {
      x: typeof releaseConfig.header_image_focus_x === "number" ? releaseConfig.header_image_focus_x : 50,
      y: typeof releaseConfig.header_image_focus_y === "number" ? releaseConfig.header_image_focus_y : 50,
    };
    setHeaderImageUrl(imageUrl);
    setHeaderVideoUrl(videoUrl);
    setHeaderImageFocus(focus);
  }, [releaseLoaded, releaseConfig]);

  useEffect(() => {
    const mediaKey = headerVideoUrl || headerImageUrl || "";
    if (!mediaKey) {
      prevHeroMediaRef.current = null;
      setHeroPhotoVisible(false);
      return;
    }
    if (prevHeroMediaRef.current === mediaKey) {
      return;
    }
    prevHeroMediaRef.current = mediaKey;
    setHeroPhotoVisible(false);
    const id = window.requestAnimationFrame(() => setHeroPhotoVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [headerImageUrl, headerVideoUrl]);

  return (
    <section id="hero-section" className="hero-section">
      {headerVideoUrl ? (
        <video
          className={`hero-section__video${heroPhotoVisible ? " hero-section__photo--visible" : ""}`}
          src={headerVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : null}
      {headerImageUrl && !headerVideoUrl ? (
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

          {summaryText ? <p className="hero-summary">{summaryText}</p> : null}

          <a href="#music-section" className="hero-scroll">
            <span className="hero-scroll__text">Scroll</span>
            <span className="hero-scroll__chevron">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
