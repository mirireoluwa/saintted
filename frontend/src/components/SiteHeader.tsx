import { useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import "./SiteHeader.css";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute("href");
    if (!href?.startsWith("#")) return;
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMenuOpen(false);
    }
  };

  return (
    <header className="site-header">
      <div className="site-header__shell">
        <div className="site-header__bar">
          <div className="site-header__inner">
            <Link to="/" className="site-header__brand" onClick={() => setMenuOpen(false)}>
              <span className="site-header__brand-dot" aria-hidden>
                .
              </span>
              saintted
            </Link>

            <nav className="site-header__nav" aria-label="Primary">
              <a href="#music-section" className="site-header__nav-link" onClick={handleAnchorClick}>
                music
              </a>
              <a href="#featured-section" className="site-header__nav-link" onClick={handleAnchorClick}>
                videos
              </a>
            </nav>

            <div className="site-header__tools">
              <ThemeToggle embedded />
              <button
                type="button"
                className="site-header__menu-btn"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="site-header__menu-label">menu</span>
                <span className="site-header__menu-icon" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {menuOpen ? (
          <nav className="site-header__mobile" aria-label="Mobile">
            <a href="#music-section" className="site-header__mobile-link" onClick={handleAnchorClick}>
              music
            </a>
            <a href="#featured-section" className="site-header__mobile-link" onClick={handleAnchorClick}>
              videos
            </a>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
