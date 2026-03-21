import compactDiscSrc from "../assets/compact-disc.svg";
import "./TrackCoverPlaceholder.css";

type Variant = "card" | "detail";

interface TrackCoverPlaceholderProps {
  /** `card` = grid tile; `detail` = larger track page cover box */
  variant?: Variant;
  className?: string;
}

/**
 * Shown when no cover art URL is available — greyed compact disc inside the art frame.
 */
export function TrackCoverPlaceholder({
  variant = "card",
  className = "",
}: TrackCoverPlaceholderProps) {
  return (
    <div
      className={`track-cover-placeholder track-cover-placeholder--${variant} ${className}`.trim()}
      aria-hidden
    >
      <img
        src={compactDiscSrc}
        alt=""
        className="track-cover-placeholder__disc"
        decoding="async"
      />
    </div>
  );
}
