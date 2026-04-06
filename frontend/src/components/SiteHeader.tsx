import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { sectionTransition } from "../utils/motion";
import "./SiteHeader.css";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;

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

        <AnimatePresence>
          {menuOpen ? (
            <motion.nav
              className="site-header__mobile"
              aria-label="Mobile"
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={sectionTransition(reduceMotion)}
            >
              {(
                [
                  ["music-section", "music"],
                  ["featured-section", "videos"],
                  ["image-gallery-section", "images"],
                ] as const
              ).map(([id, label], i) => (
                <motion.a
                  key={id}
                  href={`/#${id}`}
                  className="site-header__mobile-link"
                  initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    ...sectionTransition(reduceMotion),
                    delay: reduceMotion ? 0 : 0.05 + i * 0.045,
                  }}
                  onClick={(e) => handleSectionClick(e, id)}
                >
                  {label}
                </motion.a>
              ))}
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
