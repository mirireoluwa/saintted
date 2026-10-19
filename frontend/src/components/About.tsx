import { HOME_BIO } from "../../api/_lib/seoData";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAbout } from "../api/client";
import instagramIcon from "../assets/instagram.svg";
import xIcon from "../assets/x.svg";
import { DEFAULT_ABOUT, type AboutContent } from "../types/aboutContent";
import "./About.css";

const DEFAULT_PORTRAIT = "/about-portrait.jpg";
const HEADER_IMAGE = "/about-header.jpg";

const CONTACT_LINKS = [
  { label: "instagram", href: "https://instagram.com/beingsaintted", icon: instagramIcon },
  { label: "linktree", href: "https://linktr.ee/saintted", icon: null },
  { label: "x", href: "https://x.com/beingsaintted", icon: xIcon },
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
  // the home teaser always carries the artist bio (SAINTTED / Nigerian / alternative / Lagos); /about shows the editable one
  const shown = teaser ? [HOME_BIO] : paragraphs;
  const email = (about.booking_email || "").trim();
  const Heading = teaser ? "h2" : "h1";

  return (
    <section className={`section about${teaser ? " about--teaser" : ""}`} id="about-section">
      {teaser ? null : (
        <div className="wrap">
          <div className="about__banner">
            <img src={HEADER_IMAGE} alt="SAINTTED looking out over the sea" decoding="async" />
          </div>
        </div>
      )}
      <div className={`wrap about__grid${teaser ? "" : " about__grid--page"}`}>
        {teaser ? (
          <figure className="about__frame">
            <span className="about__art">
              <img
                src={about.portrait_url || DEFAULT_PORTRAIT}
                alt="SAINTTED, portrait"
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
                <dt>socials</dt>
                <dd className="about__links">
                  {CONTACT_LINKS.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label}>
                      <span className="about__link-text">
                        {l.label} <span aria-hidden>↗</span>
                      </span>
                      <span className="about__link-icon" aria-hidden>
                        {l.icon ? (
                          <img src={l.icon} alt="" width={22} height={22} />
                        ) : (
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
                            <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
                          </svg>
                        )}
                      </span>
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
