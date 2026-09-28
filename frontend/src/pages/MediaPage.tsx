import { useState } from "react";
import { Featured } from "../components/Featured";
import { ImageGallery } from "../components/ImageGallery";
import { SeoHead } from "../components/SeoHead";

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
        description="Videos, photos and visuals from Saintted, a Nigerian artist and producer."
        canonicalPath="/media"
      />
      <header className="wrap page-head">
        <p className="eyebrow rise">media</p>
        <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>watch + look</h1>
        <p className="page-head__sub rise" style={{ "--i": 2 } as React.CSSProperties}>
          videos, photos and visuals. click any photo to view it larger.
        </p>
      </header>

      <Featured onCount={setVideoCount} />
      <ImageGallery onCount={setImageCount} />

      {nothing ? (
        <div className="wrap">
          <p className="empty">nothing here yet, check back soon.</p>
        </div>
      ) : null}
    </>
  );
}
