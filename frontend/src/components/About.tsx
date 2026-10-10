import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAbout } from "../api/client";
import { DEFAULT_ABOUT, type AboutContent } from "../types/aboutContent";
import "./About.css";

const DEFAULT_PORTRAIT = "/about-portrait.jpg";
const HEADER_IMAGE = "/about-header.jpg";

const CONTACT_LINKS = [
  { label: "instagram", href: "https://instagram.com/beingsaintted" },
  { label: "linktree", href: "https://linktr.ee/saintted" },
  { label: "x", href: "https://x.com/beingsaintted" },
];

type AboutProps = {
  /** Home-page version: first paragraph only, linking through to /about. Otherwise the page heading is the h1. */
  teaser?: boolean;
};

export function About({ teaser = false }: AboutProps) {
  // Start from the defaults so it renders instantly and still works if the API is down.
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
  const shown = teaser ? paragraphs.slice(0, 1) : paragraphs;
  const email = (about.booking_email || "").trim();
  const Heading = teaser ? "h2" : "h1";

  return (
    <section className={`section about${teaser ? " about--teaser" : ""}`} id="about-section">
      {teaser ? null : (
        <div className="wrap">
          <div className="about__banner">
            <img src={HEADER_IMAGE} alt="Saintted looking out over the sea" decoding="async" />
          </div>
        </div>
      )}
      <div className={`wrap about__grid${teaser ? "" : " about__grid--page"}`}>
        {teaser ? (
          <figure className="about__frame">
            <span className="about__art">
              <img
                src={about.portrait_url || DEFAULT_PORTRAIT}
                alt="Saintted, portrait"
                loading="lazy"
                decoding="async"
              />
            </span>
          </figure>
        ) : null}

        <div className="about__body">
          <Heading className="about__heading">{about.heading}</Heading>

          {shown.length > 0 ? (
            <div className="prose about__copy">
              {shown.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}

          {teaser ? (
            <Link to="/about" className="textlink">
              more about saintted <span className="arrow" aria-hidden>→</span>
            </Link>
          ) : (
            <dl className="about__specs">
              {email ? (
                <div>
                  <dt>booking &amp; press</dt>
                  <dd>
                    <a href={`mailto:${email}?subject=Booking%20%2F%20Press%20inquiry`}>
                      {email} <span aria-hidden>↗</span>
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>elsewhere</dt>
                <dd className="about__links">
                  {CONTACT_LINKS.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label} <span aria-hidden>↗</span>
                    </a>
                  ))}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
