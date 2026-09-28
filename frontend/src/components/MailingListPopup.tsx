import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MailingForm } from "./MailingForm";
import { WhatsAppButton } from "./WhatsAppButton";
import "./MailingListPopup.css";

const STORAGE_KEY = "saintted:ml-popup-seen";
const SHOW_DELAY_MS = 2200;

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* storage may be unavailable (private mode) — non-fatal */
  }
}

export function MailingListPopup() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Show once, shortly after the first visit.
  useEffect(() => {
    if (alreadySeen()) return;
    const t = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  // Escape to close, lock body scroll, focus the first field.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusT = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusT);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="ml-popup__overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={close}
        >
          <motion.div
            className="ml-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ml-popup-title"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ml-popup__close"
              aria-label="Close"
              onClick={close}
            >
              ✕
            </button>

            <p className="eyebrow ml-popup__eyebrow">mailing list</p>
            <h2 id="ml-popup-title" className="ml-popup__title">stay in the loop</h2>
            <p className="ml-popup__sub">
              be first to hear new music, shows and updates, straight to your inbox.
            </p>

            <MailingForm
              idPrefix="mlp"
              actions={<WhatsAppButton />}
              firstFieldRef={firstFieldRef}
              onSuccess={() => {
                markSeen();
                window.setTimeout(() => setOpen(false), 2800);
              }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
