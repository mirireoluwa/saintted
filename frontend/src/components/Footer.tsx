import { SocialLinks } from "./SocialLinks";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-love">
        <img
          src="/love-saintted.png"
          alt="love, saintted"
          className="footer-copy__love"
        />
      </div>
      <SocialLinks className="footer__social" linkClassName="footer__social-icon" />
      <div className="footer-copy">
        <span>© 2026 saintted. All rights reserved.</span>
      </div>
    </footer>
  );
}
