import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sectionTransition } from "../utils/motion";
import "./SiteHeader.css";

const NAV_LINKS = [
  { id: "music-section", label: "music" },
  { id: "featured-section", label: "videos" },
  { id: "image-gallery-section", label: "images" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
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

  // Scroll-spy: highlight the nav item whose section is crossing the viewport centre.
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveId(null);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let current: string | null = null;
      for (const { id } of NAV_LINKS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= mid) {
          current = id;
          break;
        }
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [location.pathname]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand" onClick={() => setMenuOpen(false)}>
          <span className="site-header__brand-dot" aria-hidden>.</span>
          saintted
        </Link>

        <div className="site-header__right">
          <nav className="site-header__nav" aria-label="Primary">
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`/#${id}`}
                className={`site-header__nav-link${activeId === id ? " site-header__nav-link--active" : ""}`}
                aria-current={activeId === id ? "true" : undefined}
                onClick={(e) => handleSectionClick(e, id)}
              >
                {label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="site-header__menu-btn"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="site-header__menu-icon" aria-hidden />
          </button>
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
              {NAV_LINKS.map(({ id, label }, i) => (
                <motion.a
                  key={id}
                  href={`/#${id}`}
                  className={`site-header__mobile-link${activeId === id ? " site-header__mobile-link--active" : ""}`}
                  aria-current={activeId === id ? "true" : undefined}
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
