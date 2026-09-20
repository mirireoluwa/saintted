import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { SeoHead } from "../components/SeoHead";
import { Shows } from "../components/Shows";
import "./SubPage.css";

export function ShowsPage() {
  return (
    <>
      <SeoHead
        title="shows · saintted"
        description="Upcoming live shows and events from Saintted."
        canonicalPath="/shows"
      />
      <main className="subpage">
        <div className="subpage__inner">
          <header className="subpage__head">
            <Link to="/" className="subpage__back">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden>
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              home
            </Link>
            <h1 className="subpage__title">shows</h1>
            <p className="subpage__sub">upcoming live dates. tap tickets to grab yours.</p>
          </header>

          <Shows showLabel={false} />

          <Footer />
        </div>
      </main>
    </>
  );
}
