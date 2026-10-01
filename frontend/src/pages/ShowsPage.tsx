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
        <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>shows</h1>
      </header>
      <Shows />
    </>
  );
}
