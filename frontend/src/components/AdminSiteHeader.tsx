import { Link } from "react-router-dom";
import { isAdminHostname } from "../utils/adminHost";
import { getSiteUrl } from "../utils/siteUrl";
import "./AdminSiteHeader.css";

export function AdminSiteHeader({ actions }: { actions?: React.ReactNode }) {
  const onAdminHost =
    typeof window !== "undefined" && isAdminHostname(window.location.hostname);
  const viewSiteHref = onAdminHost ? `${getSiteUrl()}/` : "/";

  return (
    <header className="admin-site-header">
      <div className="admin-site-header__inner">
        <p className="admin-site-header__brand">
          saintted<span className="seal" aria-hidden />
          <span className="admin-site-header__tag">admin</span>
        </p>
        <div className="admin-site-header__actions">
        {actions}
        {onAdminHost ? (
          <a href={viewSiteHref} className="admin-site-header__view-site" rel="noopener noreferrer">
            view site <span aria-hidden>↗</span>
          </a>
        ) : (
          <Link to="/" className="admin-site-header__view-site">
            view site <span aria-hidden>↗</span>
          </Link>
        )}
        </div>
      </div>
    </header>
  );
}
