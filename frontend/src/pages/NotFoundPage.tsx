import { motion, useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { sectionTransition } from "../utils/motion";

export function NotFoundPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const location = useLocation();
  const canonicalPath = location.pathname || "/";

  return (
    <>
      <SeoHead title="Page not found · saintted" description="love, saintted" canonicalPath={canonicalPath} />
      <main className="page not-found page--nav-offset">
        <motion.section
          className="intro-section"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={sectionTransition(reduceMotion)}
        >
          <motion.h2
            className="intro-heading"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...sectionTransition(reduceMotion), delay: reduceMotion ? 0 : 0.05 }}
          >
            Lost in the sound
          </motion.h2>
          <motion.p
            className="intro-text"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...sectionTransition(reduceMotion), delay: reduceMotion ? 0 : 0.1 }}
          >
            The page you were looking for doesn&apos;t exist. Let&apos;s take you back home.
          </motion.p>
          <motion.p
            style={{ marginTop: "1.5rem" }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...sectionTransition(reduceMotion), delay: reduceMotion ? 0 : 0.16 }}
          >
            <Link to="/" className="not-found__action">
              ← Back to home
            </Link>
          </motion.p>
          <motion.p
            style={{ marginTop: "1rem" }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...sectionTransition(reduceMotion), delay: reduceMotion ? 0 : 0.2 }}
          >
            <Link to="/#music-section" className="not-found__action not-found__action--green">
              Browse music
            </Link>
          </motion.p>
        </motion.section>
      </main>
    </>
  );
}
