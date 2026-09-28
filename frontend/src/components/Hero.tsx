import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import type { Track } from "../types/track";
import { trackEvent } from "../utils/analytics";
import { readHeroCache } from "../utils/heroCache";
import { resolvePublicMediaUrl } from "../utils/mediaUrl";
import "./Hero.css";

type HeroProps = {
  releaseConfig: ReleaseCountdown | null;
  releaseLoaded: boolean;
  summaryText?: string;
  tracks?: Track[];
};

type Featured = { track: Track; kind: "presave" | "listen" };

/** The release the hero points at: the next upcoming drop, otherwise the latest release. */
function pickFeatured(tracks: Track[]): Featured | null {
  const now = Date.now();
  const upcoming = tracks
    .filter((t) => t.is_unreleased && t.release_at && new Date(t.release_at).getTime() > now)
    .sort((a, b) => new Date(a.release_at!).getTime() - new Date(b.release_at!).getTime())[0];
  if (upcoming) return { track: upcoming, kind: "presave" };
  const released = tracks.filter((t) => !t.is_unreleased);
  const latest = released.find((t) => t.is_highlighted) ?? released[0];
  return latest ? { track: latest, kind: "listen" } : null;
}

function captionMeta(f: Featured): string {
  if (f.kind === "presave" && f.track.release_at) {
    const d = new Date(f.track.release_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `arriving ${d.toLowerCase()}`;
  }
  return [f.track.year, (f.track.meta || "").toLowerCase()].filter(Boolean).join(" · ");
}

export function Hero({ releaseConfig, releaseLoaded, summaryText, tracks = [] }: HeroProps) {
  const featured = pickFeatured(tracks);
  const [showAltTag, setShowAltTag] = useState(false);
  const [showDesc, setShowDesc] = useState(false);

  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [headerVideoUrl, setHeaderVideoUrl] = useState<string | null>(null);
  const [headerImageFocus, setHeaderImageFocus] = useState({ x: 50, y: 50 });
  const [heroPhotoVisible, setHeroPhotoVisible] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoError, setHeroVideoError] = useState(false);
  const prevHeroMediaRef = useRef<string | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setShowAltTag((prev) => !prev), 3200);
    return () => window.clearInterval(interval);
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
    setHeaderImageUrl(imageUrlRaw ? resolvePublicMediaUrl(imageUrlRaw) : null);
    setHeaderVideoUrl(videoUrlRaw ? resolvePublicMediaUrl(videoUrlRaw) : null);
    setHeaderImageFocus({
      x: typeof releaseConfig.header_image_focus_x === "number" ? releaseConfig.header_image_focus_x : 50,
      y: typeof releaseConfig.header_image_focus_y === "number" ? releaseConfig.header_image_focus_y : 50,
    });
  }, [releaseLoaded, releaseConfig]);

  const activeVideoUrl = headerVideoUrl || "/hero-bg.mp4";

  useEffect(() => {
    const mediaKey = activeVideoUrl || headerImageUrl || "";
    if (!mediaKey) {
      prevHeroMediaRef.current = null;
      setHeroPhotoVisible(false);
      return;
    }
    if (prevHeroMediaRef.current === mediaKey) return;
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
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    const handleCanPlay = () => { setHeroVideoReady(true); setHeroVideoError(false); tryPlay(); };
    const handlePlaying = () => { setHeroVideoReady(true); setHeroVideoError(false); };
    const handleError = () => { setHeroVideoReady(false); setHeroVideoError(true); };
    const handleVisibility = () => { if (document.visibilityState === "visible") tryPlay(); };

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

  return (
    <section className="hero" aria-labelledby="hero-title">
      {headerImageUrl ? (
        <div
          className={`hero__photo${heroPhotoVisible ? " hero__photo--visible" : ""}`}
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
          className={`hero__video${heroVideoReady ? " hero__video--visible" : ""}`}
          src={activeVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden
        />
      ) : null}
      <div className="hero__scrim" aria-hidden />

      <div className="wrap hero__inner">
        <p className="eyebrow hero__eyebrow rise">
          artist +{" "}
          <span className={`hero-swap${showAltTag ? " hero-swap--alt" : ""}`}>
            <span className="hero-swap__line hero-swap__line--a">producer</span>
            <span className="hero-swap__line hero-swap__line--b">silence, selah</span>
          </span>
        </p>

        {/* hover (or tap) the name to reveal the tagline */}
        <h1
          id="hero-title"
          className="hero__name"
          aria-label="saintted"
          onMouseEnter={() => setShowDesc(true)}
          onMouseLeave={() => setShowDesc(false)}
          onClick={() => setShowDesc((v) => !v)}
        >
          <span className="hero__line" aria-hidden>
            <span>SAINTTED</span>
          </span>
        </h1>

        {summaryText ? (
          <div className={`hero__lede${showDesc ? " hero__lede--visible" : ""}`}>
            <span className="hero__rule" aria-hidden />
            <p>{summaryText}</p>
          </div>
        ) : null}

        <div className="hero__cta rise" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="btn-row">
            {featured ? (
              <Link
                to={`/music/${featured.track.slug}`}
                className="btn btn--primary"
                onClick={() => trackEvent(featured.kind === "presave" ? "presave" : "track_click", { slug: featured.track.slug })}
              >
                {featured.kind === "presave" ? <span className="hero__dot" aria-hidden /> : null}
                {featured.kind === "presave" ? "pre-save" : "listen now"} <span className="arrow" aria-hidden>↗</span>
              </Link>
            ) : null}
            <Link to="/music" className="btn">all music</Link>
          </div>
        </div>

        {featured ? (
          <Link
            to={`/music/${featured.track.slug}`}
            className="hero__caption"
            onClick={() => trackEvent("track_click", { slug: featured.track.slug })}
          >
            <span className="hero__index">01</span>
            <span className="hero__caption-text">
              <strong>{featured.track.title}</strong>
              <small>{captionMeta(featured)}</small>
            </span>
            <span className="hero__caption-icon" aria-hidden>↗</span>
          </Link>
        ) : null}
      </div>

      {/* vertical rail on the right edge; the accent segment slides down it */}
      <a href="#latest" className="hero__scroll" aria-label="Scroll to the latest releases">
        <span className="hero__scroll-text">scroll</span>
        <span className="hero__scroll-line" aria-hidden />
      </a>
    </section>
  );
}
