import { motion, useReducedMotion } from "framer-motion";
import { SectionLabel } from "./SectionLabel";
import "./About.css";

const BOOKING_EMAIL = "beingsaintted@gmail.com";

const CONTACT_LINKS = [
  { label: "instagram", href: "https://instagram.com/beingsaintted" },
  { label: "linktree", href: "https://linktr.ee/saintted" },
  { label: "x", href: "https://x.com/beingsaintted" },
];

export function About() {
  const reduceMotion = useReducedMotion() ?? false;
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section className="about" id="about-section">
      <SectionLabel text=".about" />

      <div className="about__grid">
        <motion.figure
          className="about__photo"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease }}
        >
          <img
            src="/about-portrait.jpg"
            alt="Saintted, portrait"
            className="about__img"
            loading="lazy"
            decoding="async"
          />
        </motion.figure>

        <motion.div
          className="about__body"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease, delay: 0.08 }}
        >
          <h2 className="about__heading">free like a hummingbird</h2>

          <div className="about__contact">
            <span className="about__contact-label">booking &amp; press</span>
            <a
              href={`mailto:${BOOKING_EMAIL}?subject=Booking%20%2F%20Press%20inquiry`}
              className="about__email"
            >
              {BOOKING_EMAIL}
              <span aria-hidden>↗</span>
            </a>
            <div className="about__contact-links">
              {CONTACT_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about__contact-link"
                >
                  {l.label}
                  <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
