import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sectionTransition } from "../utils/motion";
import "./SiteHeader.css";

const PLATFORMS = [
  { name: "Spotify", url: "https://open.spotify.com/search/saintted" },
  { name: "Apple Music", url: "https://music.apple.com/search?term=saintted" },
  { name: "YouTube Music", url: "https://music.youtube.com/search?q=saintted" },
  { name: "Deezer", url: "https://www.deezer.com/search/saintted" },
  { name: "Amazon Music", url: "https://music.amazon.com/search/saintted" },
  { name: "Tidal", url: "https://tidal.com/search?q=saintted" },
  { name: "SoundCloud", url: "https://soundcloud.com/search?q=saintted" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
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

  useEffect(() => {
    if (!listenOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setListenOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listenOpen]);

  return (
    <>
      <header className="site-header">
        <div className="site-header__shell">
          <div className="site-header__bar">
            <div className="site-header__inner">
              <Link to="/" className="site-header__brand" onClick={() => setMenuOpen(false)}>
                <span className="site-header__brand-dot" aria-hidden>.</span>
                saintted
              </Link>

              <div className="site-header__right">
                <nav className="site-header__nav" aria-label="Primary">
                  <a href="/#music-section" className="site-header__nav-link" onClick={(e) => handleSectionClick(e, "music-section")}>music</a>
                  <a href="/#featured-section" className="site-header__nav-link" onClick={(e) => handleSectionClick(e, "featured-section")}>videos</a>
                  <a href="/#image-gallery-section" className="site-header__nav-link" onClick={(e) => handleSectionClick(e, "image-gallery-section")}>images</a>
                </nav>

                <button
                  type="button"
                  className="site-header__listen-btn"
                  onClick={() => setListenOpen(true)}
                >
                  listen now
                </button>

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

      <AnimatePresence>
        {listenOpen ? (
          <motion.div
            className="listen-modal__overlay"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setListenOpen(false)}
          >
            <motion.div
              className="listen-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Choose a streaming platform"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="listen-modal__label">.listen on</p>
              <ul className="listen-modal__list">
                {PLATFORMS.map(({ name, url }) => (
                  <li key={name}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="listen-modal__item"
                      onClick={() => setListenOpen(false)}
                    >
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="listen-modal__close"
                aria-label="Close"
                onClick={() => setListenOpen(false)}
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
