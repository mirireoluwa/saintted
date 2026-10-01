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
        <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>media</h1>
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
