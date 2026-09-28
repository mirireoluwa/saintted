import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { Footer } from "./Footer";
import { MailingListPopup } from "./MailingListPopup";
import { pageTransition } from "../utils/motion";
import { trackEvent } from "../utils/analytics";

export function PublicShell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion() ?? false;
  const transition = pageTransition(reduceMotion);

  // Scroll to top on every route change (unless we're jumping to a hash on the same page)
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);

  // Real visible height for browsers without svh (older iOS/Android): the hero fills the screen there too.
  useEffect(() => {
    const set = () => document.documentElement.style.setProperty("--app-h", `${window.innerHeight}px`);
    set();
    let lastW = window.innerWidth;
    const onResize = () => {
      // ignore the height-only resizes caused by the address bar collapsing while scrolling
      if (window.innerWidth !== lastW) {
        lastW = window.innerWidth;
        set();
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", set);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", set);
    };
  }, []);

  // Discourage saving media: no right-click "save image", no drag-out, no long-press menu.
  // (Anything shown in a browser can still be screenshotted; this only stops casual saving.)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("protect-media");
    const isMedia = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("img, video, picture, canvas, .hero, .lightbox__overlay");
    const block = (e: Event) => {
      if (isMedia(e.target)) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      root.classList.remove("protect-media");
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);

  // One page view per route change; a track page also counts as a view of that track.
  useEffect(() => {
    trackEvent("pageview", { path: location.pathname });
    const m = location.pathname.match(/^\/music\/([a-z0-9-]+)\/?$/i);
    if (m) trackEvent("track_view", { slug: m[1].toLowerCase() });
  }, [location.pathname]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <SiteHeader />
      <AnimatePresence mode="wait">
        <motion.main
          id="main"
          tabIndex={-1}
          key={location.pathname}
          className="public-shell__page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <MailingListPopup />
    </>
  );
}
