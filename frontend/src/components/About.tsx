import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fetchAbout } from "../api/client";
import { DEFAULT_ABOUT, type AboutContent } from "../types/aboutContent";
import { SectionLabel } from "./SectionLabel";
import "./About.css";

const DEFAULT_PORTRAIT = "/about-portrait.jpg";

const CONTACT_LINKS = [
  { label: "instagram", href: "https://instagram.com/beingsaintted" },
  { label: "linktree", href: "https://linktr.ee/saintted" },
  { label: "x", href: "https://x.com/beingsaintted" },
];

export function About() {
  const reduceMotion = useReducedMotion() ?? false;
  const ease = [0.22, 1, 0.36, 1] as const;
  // Start from the defaults so the section renders instantly and still works if the API is down.
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);

  useEffect(() => {
    let cancelled = false;
    fetchAbout()
      .then((data) => {
        if (!cancelled && data) setAbout(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const paragraphs = (about.body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const email = (about.booking_email || "").trim();

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
            src={about.portrait_url || DEFAULT_PORTRAIT}
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
          <h2 className="about__heading">{about.heading}</h2>

          {paragraphs.length > 0 ? (
            <div className="about__copy">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}

          <div className="about__contact">
            <span className="about__contact-label">booking &amp; press</span>
            {email ? (
              <a
                href={`mailto:${email}?subject=Booking%20%2F%20Press%20inquiry`}
                className="about__email"
              >
                {email}
                <span aria-hidden>↗</span>
              </a>
            ) : null}
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
