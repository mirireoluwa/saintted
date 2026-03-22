import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { TrackCoverPlaceholder } from "../components/TrackCoverPlaceholder";
import { fetchTrackBySlug, fetchTracks } from "../api/client";
import { getTrackArtUrl } from "../utils/trackArt";
import { SocialLinks } from "../components/SocialLinks";
import type { Track } from "../types/track";
import {
  appleMusicSearchUrl,
  spotifySearchUrl,
  youtubeSearchUrl,
} from "../utils/streamingLinks";
import "./TrackDetailPage.css";

function pickUrl(stored: string | undefined | null, fallback: string): string {
  const t = (stored ?? "").trim();
  return t || fallback;
}

export function TrackDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetchTrackBySlug(slug).then(setTrack).catch(() => setError(true)),
      fetchTracks().then(setTracks).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [slug]);

  const nextTrack = track && tracks.length
    ? tracks.find((t) => t.order === track.order + 1)
    : null;
  const prevTrack = track && tracks.length
    ? tracks.find((t) => t.order === track.order - 1)
    : null;

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="track-detail">
          <div className="track-detail__inner">
            <p className="track-detail__loading">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !track) {
    return (
      <>
        <SiteHeader />
        <div className="track-detail">
          <div className="track-detail__inner">
            <p className="track-detail__loading">Track not found.</p>
            <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--home">
              home
            </Link>
          </div>
        </div>
      </>
    );
  }

  const yt = pickUrl(track.youtube_url, youtubeSearchUrl(track.title));
  const am = pickUrl(track.apple_music_url, appleMusicSearchUrl(track.title));
  const sp = pickUrl(track.spotify_url, spotifySearchUrl(track.title));
  const coverUrl = getTrackArtUrl(track);

  return (
    <>
      <SiteHeader />
      <div className="track-detail">
        <div className="track-detail__inner">
        <nav className="track-detail__nav" aria-label="Track navigation">
          <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--home">
            home
          </Link>
          <span className="track-detail__breadcrumb">
            <Link to="/#music-section">My Music</Link>
            <span className="track-detail__breadcrumb-sep">→</span>
            <span>{track.title}</span>
          </span>
          <div className="track-detail__nav-pair">
            {prevTrack ? (
              <Link
                to={`/music/${prevTrack.slug}`}
                className="track-detail__nav-btn track-detail__nav-btn--prev"
              >
                previous
              </Link>
            ) : (
              <span
                className="track-detail__nav-btn track-detail__nav-btn--prev track-detail__nav-btn--inactive"
                aria-disabled="true"
              >
                previous
              </span>
            )}
            {nextTrack ? (
              <Link
                to={`/music/${nextTrack.slug}`}
                className="track-detail__nav-btn track-detail__nav-btn--next"
              >
                next
              </Link>
            ) : (
              <span
                className="track-detail__nav-btn track-detail__nav-btn--next track-detail__nav-btn--inactive"
                aria-disabled="true"
              >
                next
              </span>
            )}
          </div>
        </nav>

        <h1 className="track-detail__title">{track.title}</h1>

        <div className="track-detail__main">
          <div className="track-detail__left">
            <div className="track-detail__cover">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={`${track.title} cover art`}
                  className="track-detail__cover-img"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <TrackCoverPlaceholder variant="detail" />
              )}
            </div>
          </div>
          <div className="track-detail__right">
            <section className="track-detail__about">
              <h2 className="track-detail__about-title">About the song</h2>
              <p className="track-detail__about-text">{track.description || "—"}</p>
            </section>
          </div>
        </div>

        <div className="track-detail__meta">
          <div className="track-detail__year-block">
            <span className="track-detail__year-label">YEAR</span>
            <span className="track-detail__year-value">{track.year ?? "—"}</span>
          </div>
          <div className="track-detail__streaming">
            <a
              href={yt}
              target="_blank"
              rel="noopener noreferrer"
              className="track-detail__stream-link track-detail__stream-link--youtube"
            >
              YouTube
            </a>
            <a
              href={am}
              target="_blank"
              rel="noopener noreferrer"
              className="track-detail__stream-link track-detail__stream-link--apple"
            >
              Apple Music
            </a>
            <a
              href={sp}
              target="_blank"
              rel="noopener noreferrer"
              className="track-detail__stream-link track-detail__stream-link--spotify"
            >
              Spotify
            </a>
          </div>
        </div>

        <footer className="track-detail__footer">
          <div className="track-detail__footer-left">
            <img
              src="/love-saintted.png"
              alt="love, saintted"
              className="track-detail__love-image"
            />
          </div>
          <SocialLinks
            className="track-detail__footer-links"
            linkClassName="track-detail__footer-icon"
          />
          <div className="track-detail__footer-time">
            {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
          </div>
        </footer>
      </div>
    </div>
    </>
  );
}
