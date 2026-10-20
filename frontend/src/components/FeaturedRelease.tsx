import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import { trackEvent } from "../utils/analytics";
import { getTrackArtSrcSet, getTrackArtUrl } from "../utils/trackArt";
import { TrackCoverPlaceholder } from "./TrackCoverPlaceholder";
import spotifyIcon from "../assets/spotify.svg";
import appleMusicIcon from "../assets/apple-music.svg";
import youtubeIcon from "../assets/youtube.svg";
import "./Releases.css";

type FeaturedReleaseProps = { track: Track; isNew?: boolean };

/** The newest release: its own cover art glows behind the card, the cover floats on the left, the story and listen links sit beside it. */
export function FeaturedRelease({ track, isNew = false }: FeaturedReleaseProps) {
  const art = getTrackArtUrl(track);
  const detail = `/music/${track.slug}`;
  const blurb = (track.description || "").trim().split(/\n\n+/)[0] || "";
  const meta = [track.year, (track.meta || "").toLowerCase()].filter(Boolean).join(" · ");
  const open = () => trackEvent("track_click", { slug: track.slug });
  const platforms = [
    { label: "Spotify", href: track.spotify_url, icon: spotifyIcon },
    { label: "Apple Music", href: track.apple_music_url, icon: appleMusicIcon },
    { label: "YouTube", href: track.youtube_url, icon: youtubeIcon },
  ].filter((p) => p.href);

  return (
    <div className="wrap">
      <article className="feature">
        {art ? <img className="feature__ambient" src={art} alt="" aria-hidden decoding="async" /> : null}

        <Link to={detail} onClick={open} className="feature__cover" aria-label={`${track.title}, latest release`}>
          {art ? (
            <img src={art} srcSet={getTrackArtSrcSet(track)} sizes="(max-width: 900px) 92vw, 560px" alt={`${track.title} cover art by SAINTTED`} decoding="async" />
          ) : (
            <TrackCoverPlaceholder variant="detail" />
          )}
        </Link>

        <div className="feature__body">
          <p className="feature__kicker">
            <span className="feature__pulse" aria-hidden />
            {isNew ? "new release" : "out now"}
          </p>
          <h3 className="feature__title">
            <Link to={detail} onClick={open}>{track.title}</Link>
          </h3>
          <p className="feature__meta">{meta}</p>
          {blurb ? <p className="feature__blurb">{blurb}</p> : null}
          <div className="feature__actions">
            <Link to={detail} onClick={open} className="btn btn--primary">
              listen <span className="arrow" aria-hidden>↗</span>
            </Link>
            {platforms.length ? (
              <div className="feature__plat" role="group" aria-label="Listen on">
                {platforms.map((p) => (
                  <a
                    key={p.label}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Listen on ${p.label}`}
                    onClick={() => trackEvent("track_click", { slug: track.slug, platform: p.label })}
                  >
                    <img src={p.icon} alt="" width={22} height={22} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
