import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { pageTransition } from "../utils/motion";

export function PublicShell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion() ?? false;
  const transition = pageTransition(reduceMotion);

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
