import { SeoHead } from "../components/SeoHead";
import { Shows } from "../components/Shows";

export function ShowsPage() {
  return (
    <>
      <SeoHead
        title="shows · saintted"
        description="Upcoming live shows and events from Saintted."
        canonicalPath="/shows"
      />
      <header className="wrap page-head">
        <p className="eyebrow rise">shows</p>
        <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>live dates</h1>
        <p className="page-head__sub rise" style={{ "--i": 2 } as React.CSSProperties}>
          upcoming shows. tap tickets to grab yours.
        </p>
      </header>
      <Shows />
    </>
  );
}
