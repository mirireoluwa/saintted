import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { subscribeToMailingList } from "../api/client";
import "./MailingListSection.css";
import "./MailingListPopup.css";

type FormState = "idle" | "loading" | "success" | "error";

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState === "loading") return;
    setFormState("loading");
    setMessage("");
    try {
      const result = await subscribeToMailingList({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      });
      setFormState("success");
      setMessage(result.message);
      markSeen();
      if (!result.already_subscribed) {
        setFirstName("");
        setLastName("");
        setEmail("");
      }
      window.setTimeout(() => setOpen(false), 2800);
    } catch (err) {
      setFormState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const isDisabled = formState === "loading" || formState === "success";

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
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
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

            <p className="ml-popup__eyebrow">.mailing list</p>
            <h2 id="ml-popup-title" className="ml-popup__title">stay in the loop</h2>
            <p className="ml-popup__sub">
              Be first to hear new music, events, and updates — straight to your inbox.
            </p>

            {formState === "success" ? (
              <div className="mailing-list-section__success ml-popup__success">
                <span className="mailing-list-section__success-icon" aria-hidden>✓</span>
                <p className="mailing-list-section__success-text">{message}</p>
              </div>
            ) : (
              <form className="mailing-list-form" onSubmit={handleSubmit} noValidate>
                <div className="mailing-list-form__row">
                  <div className="mailing-list-form__field">
                    <label htmlFor="mlp-first-name" className="mailing-list-form__label">
                      First Name
                    </label>
                    <input
                      id="mlp-first-name"
                      ref={firstFieldRef}
                      type="text"
                      className="mailing-list-form__input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      required
                      disabled={isDisabled}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="mailing-list-form__field">
                    <label htmlFor="mlp-last-name" className="mailing-list-form__label">
                      Last Name
                    </label>
                    <input
                      id="mlp-last-name"
                      type="text"
                      className="mailing-list-form__input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      required
                      disabled={isDisabled}
                      autoComplete="family-name"
                    />
                  </div>
                  <div className="mailing-list-form__field mailing-list-form__field--email">
                    <label htmlFor="mlp-email" className="mailing-list-form__label">
                      Email Address
                    </label>
                    <input
                      id="mlp-email"
                      type="email"
                      className="mailing-list-form__input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={isDisabled}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="mailing-list-form__footer">
                  {formState === "error" && message ? (
                    <p className="mailing-list-form__error" role="alert">{message}</p>
                  ) : (
                    <span />
                  )}
                  <button type="submit" className="mailing-list-form__btn" disabled={isDisabled}>
                    {formState === "loading" ? "Subscribing…" : "Subscribe"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
