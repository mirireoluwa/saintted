import { useEffect, useState } from "react";
import { fetchReleaseCountdown } from "../api/client";

export function Hero() {
  const [showAltTag, setShowAltTag] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState("/hero-bg.png");
  const [headerImageFocus, setHeaderImageFocus] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setShowAltTag((prev) => !prev);
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchReleaseCountdown()
      .then((config) => {
        const uploadedUrl = (config?.header_image_file_url || "").trim();
        const customUrl = (config?.header_image_url || "").trim();
        setHeaderImageUrl(uploadedUrl || customUrl || "/hero-bg.png");
        setHeaderImageFocus({
          x: typeof config?.header_image_focus_x === "number" ? config.header_image_focus_x : 50,
          y: typeof config?.header_image_focus_y === "number" ? config.header_image_focus_y : 50,
        });
      })
      .catch(() => {
        setHeaderImageUrl("/hero-bg.png");
        setHeaderImageFocus({ x: 50, y: 50 });
      });
  }, []);

  return (
    <section
      className="hero-section"
      style={{
        backgroundImage: `url(${headerImageUrl})`,
        backgroundPosition: `${headerImageFocus.x}% ${headerImageFocus.y}%`,
      }}
    >
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
