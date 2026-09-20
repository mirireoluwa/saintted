import { useState } from "react";
import { Link } from "react-router-dom";
import { Featured } from "../components/Featured";
import { Footer } from "../components/Footer";
import { ImageGallery } from "../components/ImageGallery";
import { SeoHead } from "../components/SeoHead";
import "./SubPage.css";

export function MediaPage() {
  // null = still loading; both zero = show one combined empty state.
  const [videoCount, setVideoCount] = useState<number | null>(null);
  const [imageCount, setImageCount] = useState<number | null>(null);
  const loaded = videoCount !== null && imageCount !== null;
  const nothing = loaded && videoCount === 0 && imageCount === 0;

  return (
    <>
      <SeoHead
        title="media · saintted"
        description="Videos, photos and visuals from Saintted — a Nigerian artist and producer."
        canonicalPath="/media"
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
            <h1 className="subpage__title">media</h1>
            <p className="subpage__sub">videos, photos and visuals. click any image to view it larger.</p>
          </header>

          <Featured showLabel onCount={setVideoCount} />
          <ImageGallery showLabel onCount={setImageCount} />

          {nothing ? <p className="subpage__empty">nothing here yet — check back soon.</p> : null}

          <Footer />
        </div>
      </main>
    </>
  );
}
