import { useEffect, useState } from "react";

export function Hero() {
  const [showAltTag, setShowAltTag] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setShowAltTag((prev) => !prev);
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="hero-section">
      <div className="hero-inner">
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
    </section>
  );
}
