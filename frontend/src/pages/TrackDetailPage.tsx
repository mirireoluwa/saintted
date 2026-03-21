import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { fetchTrackBySlug, fetchTracks } from "../api/client";
import { getTrackArtUrl } from "../utils/trackArt";
import { SocialLinks } from "../components/SocialLinks";
import type { Track } from "../types/track";
import "./TrackDetailPage.css";

const PLACEHOLDER_LINKS = {
  youtube: "https://www.youtube.com/@saintted",
  appleMusic: "https://music.apple.com/artist/saintted",
  spotify: "https://open.spotify.com/artist/saintted",
};

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
            <Link to="/" className="track-detail__nav-btn">← back to home</Link>
          </div>
        </div>
      </>
    );
  }

  const yt = track.youtube_url || PLACEHOLDER_LINKS.youtube;
  const am = track.apple_music_url || PLACEHOLDER_LINKS.appleMusic;
  const sp = track.spotify_url || PLACEHOLDER_LINKS.spotify;
  const coverUrl = getTrackArtUrl(track);

  return (
    <>
      <SiteHeader />
      <div className="track-detail">
        <div className="track-detail__inner">
        <nav className="track-detail__nav" aria-label="Track navigation">
          <Link to="/" className="track-detail__nav-btn track-detail__nav-btn--prev">
            ← back to home
          </Link>
          <span className="track-detail__breadcrumb">
            <Link to="/#music-section">My Music</Link>
            <span className="track-detail__breadcrumb-sep">→</span>
            <span>{track.title}</span>
          </span>
          {nextTrack ? (
            <Link
              to={`/music/${nextTrack.slug}`}
              className="track-detail__nav-btn track-detail__nav-btn--next"
            >
              next →
            </Link>
          ) : (
            <span className="track-detail__nav-spacer" />
          )}
        </nav>

        <h1 className="track-detail__title">{track.title}</h1>

        <div className="track-detail__main">
          <div className="track-detail__left">
            {coverUrl ? (
              <div
                className="track-detail__cover"
                style={{ backgroundImage: `url(${coverUrl})` }}
                role="img"
                aria-label={`${track.title} cover art`}
              />
            ) : null}
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
            <a href={yt} target="_blank" rel="noopener noreferrer" className="track-detail__stream-link">YOUTUBE</a>
            <a href={am} target="_blank" rel="noopener noreferrer" className="track-detail__stream-link">APPLE MUSIC</a>
            <a href={sp} target="_blank" rel="noopener noreferrer" className="track-detail__stream-link">SPOTIFY</a>
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
