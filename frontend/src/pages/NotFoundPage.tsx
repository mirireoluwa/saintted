import { Link } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";

export function NotFoundPage() {
  return (
    <>
      <SiteHeader />
      <main className="page not-found page--nav-offset">
      <section className="intro-section">
        <h2 className="intro-heading">Lost in the sound</h2>
        <p className="intro-text">
          The page you were looking for doesn't exist. Let's take you back home.
        </p>
        <p style={{ marginTop: "1.5rem" }}>
          <Link to="/" className="track-card-link">
            ← Back to home
          </Link>
        </p>
      </section>
    </main>
    </>
  );
}

