import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import "./SiteHeader.css";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMenuOpen(false);
    const targetHash = `#${id}`;
    if (location.pathname === "/" && location.hash === targetHash) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate({ pathname: "/", hash: targetHash }, { replace: location.pathname === "/" });
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
              <a
                href="/#music-section"
                className="site-header__nav-link"
                onClick={(e) => handleSectionClick(e, "music-section")}
              >
                music
              </a>
              <a
                href="/#featured-section"
                className="site-header__nav-link"
                onClick={(e) => handleSectionClick(e, "featured-section")}
              >
                videos
              </a>
              <a
                href="/#image-gallery-section"
                className="site-header__nav-link"
                onClick={(e) => handleSectionClick(e, "image-gallery-section")}
              >
                images
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
            <a
              href="/#music-section"
              className="site-header__mobile-link"
              onClick={(e) => handleSectionClick(e, "music-section")}
            >
              music
            </a>
            <a
              href="/#featured-section"
              className="site-header__mobile-link"
              onClick={(e) => handleSectionClick(e, "featured-section")}
            >
              videos
            </a>
            <a
              href="/#image-gallery-section"
              className="site-header__mobile-link"
              onClick={(e) => handleSectionClick(e, "image-gallery-section")}
            >
              images
            </a>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
