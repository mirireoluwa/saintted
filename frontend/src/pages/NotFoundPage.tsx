import { Link, useLocation } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";

export function NotFoundPage() {
  const location = useLocation();
  const canonicalPath = location.pathname || "/";

  return (
    <>
      <SeoHead title="Page not found · saintted" description="love, saintted" canonicalPath={canonicalPath} noindex />
      <header className="wrap page-head">
        <p className="eyebrow rise">404</p>
        <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>lost in the sound</h1>
        <p className="page-head__sub rise" style={{ "--i": 2 } as React.CSSProperties}>
          the page you were looking for doesn't exist.
        </p>
        <div className="btn-row rise" style={{ "--i": 3, flex: "1 1 100%", marginTop: "2rem" } as React.CSSProperties}>
          <Link to="/" className="btn btn--primary">back home <span className="arrow" aria-hidden>→</span></Link>
          <Link to="/music" className="btn">browse music</Link>
        </div>
      </header>
    </>
  );
}
