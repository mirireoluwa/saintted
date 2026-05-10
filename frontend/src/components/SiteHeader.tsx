import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sectionTransition } from "../utils/motion";
import "./SiteHeader.css";

const SpotifyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#1DB954" />
    <path d="M7 9.5c3.5-1.2 7.5-.8 10 1M7 12c3-1 7-.6 10 .8M7.5 14.5c2.5-.8 5.5-.5 8 .8" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const AppleMusicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#FC3C44" />
    <path d="M15 7h-4.5v8a2 2 0 1 0 1.5 1.94V10H15V7z" fill="white" />
  </svg>
);

const YouTubeMusicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#FF0000" />
    <circle cx="12" cy="12" r="5" fill="white" />
    <path d="M10.5 9.5l5 2.5-5 2.5V9.5z" fill="#FF0000" />
  </svg>
);

const DeezerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#A238FF" />
    <rect x="4" y="13" width="2.5" height="5" rx="1" fill="white" opacity="0.7" />
    <rect x="8" y="9" width="2.5" height="9" rx="1" fill="white" />
    <rect x="12" y="11" width="2.5" height="7" rx="1" fill="white" opacity="0.85" />
    <rect x="16" y="14" width="2.5" height="4" rx="1" fill="white" opacity="0.6" />
  </svg>
);

const AmazonMusicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#232F3E" />
    <path d="M6.5 15c2.8 1.8 8.2 1.8 11 0" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M17 15.5c.6-.4 1.2-.3 1.5 0" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="10" r="3" fill="#FF9900" />
    <path d="M10 10l1.5 1.5 3-3" stroke="#232F3E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TidalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#000" />
    <path d="M5 9l3.5 3.5L12 9l3.5 3.5L19 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 12.5L12 16l3.5-3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SoundCloudIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#FF5500" />
    <path d="M3.5 14.5a2.5 2.5 0 0 0 2.5 2.5h10a3 3 0 0 0 .5-5.95 4 4 0 0 0-7.5-1.05A2.5 2.5 0 0 0 3.5 14.5z" fill="white" />
  </svg>
);

const PLATFORMS = [
  { name: "Spotify",       url: "https://open.spotify.com/search/saintted",       Icon: SpotifyIcon },
  { name: "Apple Music",   url: "https://music.apple.com/search?term=saintted",   Icon: AppleMusicIcon },
  { name: "YouTube Music", url: "https://music.youtube.com/search?q=saintted",    Icon: YouTubeMusicIcon },
  { name: "Deezer",        url: "https://www.deezer.com/search/saintted",         Icon: DeezerIcon },
  { name: "Amazon Music",  url: "https://music.amazon.com/search/saintted",       Icon: AmazonMusicIcon },
  { name: "Tidal",         url: "https://tidal.com/search?q=saintted",            Icon: TidalIcon },
  { name: "SoundCloud",    url: "https://soundcloud.com/search?q=saintted",       Icon: SoundCloudIcon },
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

              <nav className="site-header__nav" aria-label="Primary">
                <a href="/#music-section" className="site-header__nav-link" onClick={(e) => handleSectionClick(e, "music-section")}>music</a>
                <a href="/#featured-section" className="site-header__nav-link" onClick={(e) => handleSectionClick(e, "featured-section")}>videos</a>
                <a href="/#image-gallery-section" className="site-header__nav-link" onClick={(e) => handleSectionClick(e, "image-gallery-section")}>images</a>
              </nav>

              <div className="site-header__right">
                <button
                  type="button"
                  className="site-header__listen-btn"
                  onClick={() => setListenOpen(true)}
                >
                  Listen Now
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
                {PLATFORMS.map(({ name, url, Icon }) => (
                  <li key={name}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="listen-modal__item"
                      onClick={() => setListenOpen(false)}
                    >
                      <span className="listen-modal__item-icon"><Icon /></span>
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
