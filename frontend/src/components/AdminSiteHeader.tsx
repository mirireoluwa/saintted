import { Link } from "react-router-dom";
import { isAdminHostname } from "../utils/adminHost";
import { getSiteUrl } from "../utils/siteUrl";
import "./AdminSiteHeader.css";

export function AdminSiteHeader() {
  const onAdminHost =
    typeof window !== "undefined" && isAdminHostname(window.location.hostname);
  const viewSiteHref = onAdminHost ? `${getSiteUrl()}/` : "/";

  return (
    <header className="admin-site-header">
      <div className="admin-site-header__shell">
        <div className="admin-site-header__bar">
          <div className="admin-site-header__inner">
            <div className="admin-site-header__title-block">
              <span className="admin-site-header__glyph" aria-hidden>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              <div className="admin-site-header__titles">
                <p className="admin-site-header__eyebrow">admin / cms</p>
                <p className="admin-site-header__name">saintted content</p>
              </div>
            </div>
            <div className="admin-site-header__actions">
              {onAdminHost ? (
                <a href={viewSiteHref} className="admin-site-header__view-site" rel="noopener noreferrer">
                  view site
                </a>
              ) : (
                <Link to="/" className="admin-site-header__view-site">
                  view site
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
