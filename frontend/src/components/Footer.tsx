import { Link } from "react-router-dom";
import { SocialLinks } from "./SocialLinks";
import "./Footer.css";

const BOOKING_EMAIL = "beingsaintted@gmail.com";

const EXPLORE = [
  { to: "/music", label: "music" },
  { to: "/media", label: "media" },
  { to: "/shows", label: "shows" },
  { to: "/about", label: "about" },
  { to: "/#mailing-list-section", label: "mailing list" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="grid-12 footer__grid">
          <div className="footer__brand">
            <Link to="/" className="footer__wordmark" aria-label="saintted — home">
              saintted
              <span className="seal" aria-hidden />
            </Link>
            <p className="footer__tagline">
              a Nigerian artist + producer communicating the human experience through his perspective.
            </p>
            <a href={`mailto:${BOOKING_EMAIL}`} className="footer__email">
              <span className="eyebrow">booking &amp; press</span>
              {BOOKING_EMAIL}
            </a>
          </div>

          <nav className="footer__col" aria-label="Footer">
            <p className="eyebrow">explore</p>
            <ul className="footer__list">
              {EXPLORE.map((l) => (
                <li key={l.label}>
                  <Link to={l.to}>
                    {l.label}
                    <span className="footer__arrow" aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer__col">
            <p className="eyebrow">elsewhere</p>
            <SocialLinks className="footer__list" linkClassName="footer__social" showLabels />
          </div>
        </div>

        <div className="footer__legal">
          <span>© {new Date().getFullYear()} saintted. all rights reserved.</span>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            back to top <span aria-hidden>↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
