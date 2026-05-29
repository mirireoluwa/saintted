import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { pageTransition } from "../utils/motion";

export function PublicShell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion() ?? false;
  const transition = pageTransition(reduceMotion);

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      <SiteHeader />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="public-shell__page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
