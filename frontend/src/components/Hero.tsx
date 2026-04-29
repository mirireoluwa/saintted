import { useEffect, useRef, useState } from "react";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import { readHeroCache } from "../utils/heroCache";
import { resolvePublicMediaUrl } from "../utils/mediaUrl";

type HeroProps = {
  releaseConfig: ReleaseCountdown | null;
  releaseLoaded: boolean;
  summaryText?: string;
};

export function Hero({ releaseConfig, releaseLoaded, summaryText }: HeroProps) {
  const [showAltTag, setShowAltTag] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const summaryHideTimerRef = useRef<number | null>(null);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [headerVideoUrl, setHeaderVideoUrl] = useState<string | null>(null);
  const [headerImageFocus, setHeaderImageFocus] = useState({ x: 50, y: 50 });
  const [heroPhotoVisible, setHeroPhotoVisible] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoError, setHeroVideoError] = useState(false);
  const prevHeroMediaRef = useRef<string | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setShowAltTag((prev) => !prev);
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (summaryHideTimerRef.current != null) {
        window.clearTimeout(summaryHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {

    if (!releaseLoaded) {
      const cached = readHeroCache();
      if (cached) {
        const img = cached.imageUrl ? resolvePublicMediaUrl(cached.imageUrl) : "";
        const vid = cached.videoUrl ? resolvePublicMediaUrl(cached.videoUrl) : "";
        setHeaderImageUrl(img || null);
        setHeaderVideoUrl(vid || null);
        setHeaderImageFocus(cached.focus);
      }
      return;
    }

    if (!releaseConfig) {
      setHeaderImageUrl(null);
      setHeaderVideoUrl(null);
      setHeaderImageFocus({ x: 50, y: 50 });
      return;
    }

    const uploadedVideo = (releaseConfig.header_video_file_url || "").trim();
    const customVideo = (releaseConfig.header_video_url || "").trim();
    const uploadedUrl = (releaseConfig.header_image_file_url || "").trim();
    const customUrl = (releaseConfig.header_image_url || "").trim();
    const imageUrlRaw = uploadedUrl || customUrl;
    const videoUrlRaw = uploadedVideo || customVideo;
    const imageUrl = imageUrlRaw ? resolvePublicMediaUrl(imageUrlRaw) : null;
    const videoUrl = videoUrlRaw ? resolvePublicMediaUrl(videoUrlRaw) : null;
    const focus = {
      x: typeof releaseConfig.header_image_focus_x === "number" ? releaseConfig.header_image_focus_x : 50,
      y: typeof releaseConfig.header_image_focus_y === "number" ? releaseConfig.header_image_focus_y : 50,
    };
    setHeaderImageUrl(imageUrl);
    setHeaderVideoUrl(videoUrl);
    setHeaderImageFocus(focus);
  }, [releaseLoaded, releaseConfig]);

  const activeVideoUrl = headerVideoUrl || "/hero-bg.mp4";

  useEffect(() => {
    const mediaKey = activeVideoUrl || headerImageUrl || "";
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
  }, [headerImageUrl, activeVideoUrl]);

  useEffect(() => {
    if (!activeVideoUrl) {
      setHeroVideoReady(false);
      setHeroVideoError(false);
      return;
    }

    const el = heroVideoRef.current;
    if (!el) return;

    const tryPlay = () => {
      el.muted = true;
      el.defaultMuted = true;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Silent catch: browser can still require user gesture in rare cases.
        });
      }
    };

    const handleCanPlay = () => {
      setHeroVideoReady(true);
      setHeroVideoError(false);
      tryPlay();
    };
    const handlePlaying = () => {
      setHeroVideoReady(true);
      setHeroVideoError(false);
    };
    const handleError = () => {
      setHeroVideoReady(false);
      setHeroVideoError(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tryPlay();
      }
    };

    setHeroVideoReady(false);
    setHeroVideoError(false);
    el.addEventListener("canplay", handleCanPlay);
    el.addEventListener("playing", handlePlaying);
    el.addEventListener("error", handleError);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", tryPlay);
    tryPlay();

    return () => {
      el.removeEventListener("canplay", handleCanPlay);
      el.removeEventListener("playing", handlePlaying);
      el.removeEventListener("error", handleError);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", tryPlay);
    };
  }, [activeVideoUrl]);

  const handleSummaryHoverStart = () => {
    if (summaryHideTimerRef.current != null) {
      window.clearTimeout(summaryHideTimerRef.current);
      summaryHideTimerRef.current = null;
    }
    setShowSummary(true);
  };

  const handleSummaryHoverEnd = () => {
    if (summaryHideTimerRef.current != null) {
      window.clearTimeout(summaryHideTimerRef.current);
    }
    const hideDelayMs =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 640px)").matches ||
        window.matchMedia("(hover: none)").matches)
        ? 1200
        : 2200;
    summaryHideTimerRef.current = window.setTimeout(() => {
      setShowSummary(false);
      summaryHideTimerRef.current = null;
    }, hideDelayMs);
  };

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
      {activeVideoUrl && !heroVideoError ? (
        <video
          key={activeVideoUrl}
          ref={heroVideoRef}
          className={`hero-section__video${heroVideoReady ? " hero-section__video--visible" : ""}`}
          src={activeVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      ) : null}
      <div className="hero-inner">
        <div className="hero-content">
          <div className="hero-titles">
            <h1 className="hero-title">SAINTTED</h1>
          </div>

          <div className="hero-tags hero-tags--bottom">
            <span
              className="hero-tag"
              onMouseEnter={handleSummaryHoverStart}
              onMouseLeave={handleSummaryHoverEnd}
              onFocus={handleSummaryHoverStart}
              onBlur={handleSummaryHoverEnd}
              onTouchStart={handleSummaryHoverStart}
              onTouchEnd={handleSummaryHoverEnd}
              onTouchCancel={handleSummaryHoverEnd}
            >
              ARTIST
            </span>
            <span
              className={`hero-tag hero-tag--swap${showAltTag ? " hero-tag--alt" : ""}`}
              onMouseEnter={handleSummaryHoverStart}
              onMouseLeave={handleSummaryHoverEnd}
              onFocus={handleSummaryHoverStart}
              onBlur={handleSummaryHoverEnd}
              onTouchStart={handleSummaryHoverStart}
              onTouchEnd={handleSummaryHoverEnd}
              onTouchCancel={handleSummaryHoverEnd}
            >
              <span className="hero-tag__line hero-tag__line--primary">PRODUCER</span>
              <span className="hero-tag__line hero-tag__line--alt">silence, selah</span>
            </span>
          </div>

          {summaryText ? (
            <p className={`hero-summary${showSummary ? " hero-summary--visible" : ""}`}>
              {summaryText}
            </p>
          ) : null}

          <a href="#music-section" className="hero-scroll">
            <span className="hero-scroll__text">Scroll</span>
            <span className="hero-scroll__chevron">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
