import { Link } from "react-router-dom";
import { SocialLinks } from "./SocialLinks";
import "./Footer.css";

const FOOTER_LINKS = [
  { to: "/#music-section", label: "music" },
  { to: "/media", label: "media" },
  { to: "/shows", label: "shows" },
  { to: "/#about-section", label: "about" },
  { to: "/#mailing-list-section", label: "mailing list" },
];

const BOOKING_EMAIL = "beingsaintted@gmail.com";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <p className="footer__wordmark">
            <span className="footer__wordmark-dot" aria-hidden>.</span>saintted
          </p>
          <p className="footer__tagline">
            a nigerian artist + producer making experimental alternative and afrobeats.
          </p>
          <a href={`mailto:${BOOKING_EMAIL}`} className="footer__email">
            <span className="footer__email-label">booking &amp; press</span>
            {BOOKING_EMAIL}
          </a>
          <img src="/love-saintted.png" alt="love, saintted" className="footer__love" />
        </div>

        <nav className="footer__col" aria-label="Footer">
          <span className="footer__col-title">explore</span>
          {FOOTER_LINKS.map((l) => (
            <Link key={l.label} to={l.to} className="footer__link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="footer__col">
          <span className="footer__col-title">elsewhere</span>
          <SocialLinks className="footer__social" linkClassName="footer__social-icon" />
        </div>
      </div>

      <div className="footer__bottom">
        <span className="footer__copy">© 2026 saintted. all rights reserved.</span>
        <button
          type="button"
          className="footer__top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          back to top <span aria-hidden>↑</span>
        </button>
      </div>
    </footer>
  );
}
