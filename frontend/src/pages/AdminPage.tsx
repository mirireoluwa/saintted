import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import type { GalleryImage } from "../types/galleryImage";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import {
  createFeaturedVideo,
  createGalleryImage,
  createTrack,
  deleteGalleryImage,
  deleteFeaturedVideo,
  deleteTrack,
  fetchFeaturedVideosAuth,
  fetchGalleryImagesAuth,
  fetchReleaseCountdownAuth,
  fetchTracksAuth,
  getStoredToken,
  login,
  setStoredToken,
  updateFeaturedVideo,
  updateGalleryImage,
  updateHeroHeader,
  updateReleaseCountdown,
  updateTrack,
} from "../api/adminApi";
import { AdminSiteHeader } from "../components/AdminSiteHeader";
import { getAdminSiteOrigin, shouldSuggestAdminSubdomain } from "../utils/adminHost";
import "./AdminPage.css";

function AdminSubdomainCallout() {
  if (typeof window === "undefined" || !shouldSuggestAdminSubdomain()) return null;
  const href = `${getAdminSiteOrigin()}/`;
  return (
    <div className="admin-callout admin-callout--subdomain" role="status">
      <p className="admin-callout__text">
        Prefer the dedicated admin host:{" "}
        <a href={href} rel="noopener noreferrer">
          {href.replace(/\/+$/, "")}
        </a>
        . If that opens the public site instead of this CMS, add the admin domain to the same Vercel project
        as your main site and turn off “redirect to primary domain” for it (details in the README).
      </p>
    </div>
  );
}

type HeroImageForm = {
  header_image_url: string;
  header_image_crop: ReleaseCountdown["header_image_crop"];
  header_image_file_url: string;
  header_image_focus_x: number;
  header_image_focus_y: number;
};

function emptyTrackForm(): Record<string, string | number> {
  return {
    title: "",
    slug: "",
    meta: "",
    art_url: "",
    link_url: "",
    order: 0,
    description: "",
    year: "",
    youtube_url: "",
    apple_music_url: "",
    spotify_url: "",
    is_published: 1,
  };
}

function trackToForm(t: Track): Record<string, string | number> {
  return {
    title: t.title,
    slug: t.slug,
    meta: t.meta,
    art_url: t.art_url || "",
    link_url: t.link_url || "",
    order: t.order,
    description: t.description || "",
    year: t.year ?? "",
    youtube_url: t.youtube_url || "",
    apple_music_url: t.apple_music_url || "",
    spotify_url: t.spotify_url || "",
    is_published: t.is_published === false ? 0 : 1,
  };
}

function parseYear(v: string | number): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyCountdownForm() {
  return { enabled: false, song_title: "", release_at_local: "", presave_url: "" };
}

function emptyHeroImageForm(): HeroImageForm {
  return {
    header_image_url: "",
    header_image_crop: "center",
    header_image_file_url: "",
    header_image_focus_x: 50,
    header_image_focus_y: 50,
  };
}

function countdownFormFromApi(c: ReleaseCountdown) {
  return {
    enabled: c.enabled,
    song_title: c.song_title || "",
    release_at_local: isoToDatetimeLocal(c.release_at),
    presave_url: c.presave_url || "",
  };
}

function heroImageFormFromApi(c: ReleaseCountdown): HeroImageForm {
  return {
    header_image_url: c.header_image_url || "",
    header_image_crop: c.header_image_crop || "center",
    header_image_file_url: c.header_image_file_url || "",
    header_image_focus_x: typeof c.header_image_focus_x === "number" ? c.header_image_focus_x : 50,
    header_image_focus_y: typeof c.header_image_focus_y === "number" ? c.header_image_focus_y : 50,
  };
}

function emptyGalleryForm() {
  return { caption: "", order: 0 };
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);

  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const [videoForm, setVideoForm] = useState({ title: "", youtube_id: "", order: 0 });
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
  const [galleryForm, setGalleryForm] = useState(emptyGalleryForm);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);

  const [countdownForm, setCountdownForm] = useState(emptyCountdownForm);
  const [heroImageForm, setHeroImageForm] = useState(emptyHeroImageForm);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [clearHeroImageUpload, setClearHeroImageUpload] = useState(false);
  const heroImagePreviewUrl = useMemo(() => {
    if (heroImageFile) return URL.createObjectURL(heroImageFile);
    if (heroImageForm.header_image_file_url.trim()) return heroImageForm.header_image_file_url.trim();
    if (heroImageForm.header_image_url.trim()) return heroImageForm.header_image_url.trim();
    return "/hero-bg.png";
  }, [heroImageFile, heroImageForm.header_image_file_url, heroImageForm.header_image_url]);

  useEffect(() => {
    return () => {
      if (heroImageFile && heroImagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(heroImagePreviewUrl);
      }
    };
  }, [heroImageFile, heroImagePreviewUrl]);

  const loadData = useCallback(async (t: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const [tr, fv, cd, gi] = await Promise.all([
        fetchTracksAuth(t),
        fetchFeaturedVideosAuth(t),
        fetchReleaseCountdownAuth(t),
        fetchGalleryImagesAuth(t),
      ]);
      setTracks(tr);
      setVideos(fv);
      setGalleryImages(gi);
      setCountdownForm(countdownFormFromApi(cd));
      setHeroImageForm(heroImageFormFromApi(cd));
      setHeroImageFile(null);
      setClearHeroImageUpload(false);
    } catch (e) {
      setMessage({ type: "error", text: String(e) });
      setStoredToken(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void loadData(token);
  }, [token, loadData]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const tok = await login(loginUser, loginPass);
      setStoredToken(tok);
      setToken(tok);
      setLoginPass("");
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  function logout() {
    setStoredToken(null);
    setToken(null);
    setTracks([]);
    setVideos([]);
    setGalleryImages([]);
    setTrackForm(emptyTrackForm());
    setEditingSlug(null);
    setEditingVideoId(null);
    setEditingGalleryId(null);
    setGalleryForm(emptyGalleryForm());
    setGalleryFile(null);
    setCountdownForm(emptyCountdownForm());
    setHeroImageForm(emptyHeroImageForm());
    setHeroImageFile(null);
    setClearHeroImageUpload(false);
  }

  async function saveReleaseCountdown(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMessage(null);
    try {
      const release_at = countdownForm.release_at_local.trim()
        ? new Date(countdownForm.release_at_local).toISOString()
        : null;
      const updated = await updateReleaseCountdown(token, {
        enabled: countdownForm.enabled,
        song_title: countdownForm.song_title.trim(),
        release_at,
        presave_url: countdownForm.presave_url.trim(),
      });
      setCountdownForm(countdownFormFromApi(updated));
      setMessage({ type: "ok", text: "Release countdown saved." });
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  async function saveHeroHeaderImage(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMessage(null);
    try {
      const updated = await updateHeroHeader(token, {
        header_image_url: heroImageForm.header_image_url.trim(),
        header_image_crop: heroImageForm.header_image_crop,
        header_image_focus_x: heroImageForm.header_image_focus_x,
        header_image_focus_y: heroImageForm.header_image_focus_y,
        header_image_file: heroImageFile,
        clear_header_image_file: clearHeroImageUpload,
      });
      setHeroImageForm(heroImageFormFromApi(updated));
      setHeroImageFile(null);
      setClearHeroImageUpload(false);
      setMessage({ type: "ok", text: "Hero image settings saved." });
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  function startNewTrack() {
    setEditingSlug(null);
    setTrackForm(emptyTrackForm());
  }

  function startEditTrack(t: Track) {
    setEditingSlug(t.slug);
    setTrackForm(trackToForm(t));
  }

  async function saveTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMessage(null);
    const payload: Record<string, unknown> = {
      title: String(trackForm.title).trim(),
      slug: String(trackForm.slug).trim(),
      meta: String(trackForm.meta).trim(),
      art_url: String(trackForm.art_url).trim(),
      link_url: String(trackForm.link_url).trim(),
      order: Number(trackForm.order) || 0,
      description: String(trackForm.description).trim(),
      year: parseYear(trackForm.year),
      youtube_url: String(trackForm.youtube_url).trim(),
      apple_music_url: String(trackForm.apple_music_url).trim(),
      spotify_url: String(trackForm.spotify_url).trim(),
      is_published: Number(trackForm.is_published) !== 0,
    };
    if (!payload.title) {
      setMessage({ type: "error", text: "Title is required." });
      return;
    }
    try {
      if (editingSlug) {
        const body = { ...payload };
        if (!body.slug) delete body.slug;
        await updateTrack(token, editingSlug, body as Partial<Track>);
        setMessage({ type: "ok", text: "Track updated." });
      } else {
        const body = { ...payload };
        if (!body.slug) delete body.slug;
        await createTrack(token, body as Partial<Track>);
        setMessage({ type: "ok", text: "Track created." });
      }
      await loadData(token);
      startNewTrack();
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  async function handleDeleteTrack(slug: string) {
    if (!token || !window.confirm(`Delete track “${slug}”?`)) return;
    try {
      await deleteTrack(token, slug);
      setMessage({ type: "ok", text: "Track deleted." });
      if (editingSlug === slug) startNewTrack();
      await loadData(token);
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  function startNewVideo() {
    setEditingVideoId(null);
    setVideoForm({ title: "", youtube_id: "", order: 0 });
  }

  function startEditVideo(v: FeaturedVideo) {
    setEditingVideoId(v.id);
    setVideoForm({
      title: v.title || "",
      youtube_id: v.youtube_id,
      order: v.order,
    });
  }

  async function saveVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const youtube_id = String(videoForm.youtube_id).trim();
    if (!youtube_id) {
      setMessage({ type: "error", text: "YouTube video ID is required." });
      return;
    }
    try {
      if (editingVideoId != null) {
        await updateFeaturedVideo(token, editingVideoId, {
          title: String(videoForm.title).trim(),
          youtube_id,
          order: Number(videoForm.order) || 0,
        });
        setMessage({ type: "ok", text: "Video updated." });
      } else {
        await createFeaturedVideo(token, {
          title: String(videoForm.title).trim(),
          youtube_id,
          order: Number(videoForm.order) || 0,
        });
        setMessage({ type: "ok", text: "Video added." });
      }
      await loadData(token);
      startNewVideo();
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  async function handleDeleteVideo(id: number) {
    if (!token || !window.confirm("Delete this featured video?")) return;
    try {
      await deleteFeaturedVideo(token, id);
      setMessage({ type: "ok", text: "Video removed." });
      if (editingVideoId === id) startNewVideo();
      await loadData(token);
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  function startNewGalleryImage() {
    setEditingGalleryId(null);
    setGalleryForm(emptyGalleryForm());
    setGalleryFile(null);
  }

  function startEditGalleryImage(img: GalleryImage) {
    setEditingGalleryId(img.id);
    setGalleryForm({ caption: img.caption || "", order: img.order });
    setGalleryFile(null);
  }

  async function saveGalleryImage(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMessage(null);
    try {
      if (editingGalleryId != null) {
        await updateGalleryImage(token, editingGalleryId, {
          caption: galleryForm.caption.trim(),
          order: Number(galleryForm.order) || 0,
          image: galleryFile,
        });
        setMessage({ type: "ok", text: "Image updated." });
      } else {
        if (!galleryFile) {
          setMessage({ type: "error", text: "Select an image file to upload." });
          return;
        }
        await createGalleryImage(token, {
          image: galleryFile,
          caption: galleryForm.caption.trim(),
          order: Number(galleryForm.order) || 0,
        });
        setMessage({ type: "ok", text: "Image uploaded." });
      }
      await loadData(token);
      startNewGalleryImage();
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  async function handleDeleteGalleryImage(id: number) {
    if (!token || !window.confirm("Delete this image?")) return;
    try {
      await deleteGalleryImage(token, id);
      setMessage({ type: "ok", text: "Image deleted." });
      if (editingGalleryId === id) startNewGalleryImage();
      await loadData(token);
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    }
  }

  if (!token) {
    return (
      <div className="admin-page">
        <AdminSiteHeader />
        <AdminSubdomainCallout />
        {message && (
          <div className={`admin-msg admin-msg--${message.type}`}>{message.text}</div>
        )}
        <div className="admin-card">
          <h2 className="admin-card__title">Log in</h2>
          <p className="admin-card__lead">
            Sign in with your Django user (same credentials as the Django <code>/admin/</code> site). An API token is stored in this browser.
          </p>
          <form className="admin-form" onSubmit={handleLogin}>
            <div className="admin-form__row">
              <label htmlFor="admin-user">Username</label>
              <input
                id="admin-user"
                autoComplete="username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="admin-pass">Password</label>
              <div className="admin-password-wrap">
                <input
                  id="admin-pass"
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="admin-password-wrap__input"
                />
                <button
                  type="button"
                  className="admin-password-wrap__toggle"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  aria-pressed={showLoginPassword}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary">
              Get API token
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AdminSiteHeader />
      <AdminSubdomainCallout />

      <div className="admin-page__toolbar">
        <div className="admin-page__toolbar-label">
          <p>.tracks &amp; videos</p>
          <span className="admin-page__toolbar-line" aria-hidden />
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn" onClick={() => void loadData(token)}>
            Refresh
          </button>
          <button type="button" className="admin-btn admin-btn--danger" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {message && (
        <div className={`admin-msg admin-msg--${message.type}`}>{message.text}</div>
      )}
      {loading && <p className="admin-page__loading">Loading…</p>}

      <div className="admin-card">
        <h2 className="admin-card__title">Release countdown</h2>
        <p className="admin-card__lead">
          Show a timer on the public home page until the drop. Optional <strong>pre-save</strong> link
          (Spotify, Apple Music, Linkfire, etc.).
        </p>
        <form className="admin-form" onSubmit={saveReleaseCountdown}>
          <div className="admin-form__row">
            <label className="admin-form__check">
              <input
                type="checkbox"
                checked={countdownForm.enabled}
                onChange={(e) =>
                  setCountdownForm((f) => ({ ...f, enabled: e.target.checked }))
                }
              />
              <span>Show countdown on saintted.com</span>
            </label>
          </div>
          <div className="admin-form__row">
            <label htmlFor="cd-title">Song / release title (optional)</label>
            <input
              id="cd-title"
              placeholder="e.g. hyperphoria II"
              value={countdownForm.song_title}
              onChange={(e) =>
                setCountdownForm((f) => ({ ...f, song_title: e.target.value }))
              }
            />
          </div>
          <div className="admin-form__row">
            <label htmlFor="cd-when">Drop date &amp; time *</label>
            <input
              id="cd-when"
              type="datetime-local"
              value={countdownForm.release_at_local}
              onChange={(e) =>
                setCountdownForm((f) => ({ ...f, release_at_local: e.target.value }))
              }
            />
            <p className="admin-form__hint">Uses your current time zone; stored in UTC on the server.</p>
          </div>
          <div className="admin-form__row">
            <label htmlFor="cd-presave">Pre-save / pre-add URL (optional)</label>
            <input
              id="cd-presave"
              type="url"
              placeholder="https://…"
              value={countdownForm.presave_url}
              onChange={(e) =>
                setCountdownForm((f) => ({ ...f, presave_url: e.target.value }))
              }
            />
          </div>
          <div className="admin-page__actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              Save countdown
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">Hero image</h2>
        <p className="admin-card__lead">
          Set the home-page header image using either a hosted URL or a direct upload. Uploaded image takes priority over URL.
        </p>
        <form className="admin-form" onSubmit={saveHeroHeaderImage}>
          <div className="admin-form__row">
            <label htmlFor="hero-image-url">Image URL (optional)</label>
            <input
              id="hero-image-url"
              type="url"
              placeholder="https://…"
              value={heroImageForm.header_image_url}
              onChange={(e) =>
                setHeroImageForm((f) => ({ ...f, header_image_url: e.target.value }))
              }
            />
          </div>
          <div className="admin-form__row">
            <label htmlFor="hero-image-upload">Upload image (optional)</label>
            <input
              id="hero-image-upload"
              type="file"
              accept="image/*"
              onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)}
            />
            {heroImageForm.header_image_file_url ? (
              <p className="admin-form__hint">
                Current upload:{" "}
                <a href={heroImageForm.header_image_file_url} target="_blank" rel="noreferrer">
                  open image
                </a>
              </p>
            ) : null}
            <label className="admin-form__check">
              <input
                type="checkbox"
                checked={clearHeroImageUpload}
                onChange={(e) => setClearHeroImageUpload(e.target.checked)}
              />
              <span>Remove current uploaded image</span>
            </label>
          </div>
          <div className="admin-form__row">
            <label>Image alignment (crop editor)</label>
            <div className="admin-crop-editor">
              <div
                className="admin-crop-editor__preview"
                style={{
                  backgroundImage: `url(${heroImagePreviewUrl})`,
                  backgroundPosition: `${heroImageForm.header_image_focus_x}% ${heroImageForm.header_image_focus_y}%`,
                }}
                aria-hidden
              />
              <div className="admin-crop-editor__controls">
                <label htmlFor="hero-image-focus-x">Horizontal position: {Math.round(heroImageForm.header_image_focus_x)}%</label>
                <input
                  id="hero-image-focus-x"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={heroImageForm.header_image_focus_x}
                  onChange={(e) =>
                    setHeroImageForm((f) => ({ ...f, header_image_focus_x: Number(e.target.value) }))
                  }
                />
                <label htmlFor="hero-image-focus-y">Vertical position: {Math.round(heroImageForm.header_image_focus_y)}%</label>
                <input
                  id="hero-image-focus-y"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={heroImageForm.header_image_focus_y}
                  onChange={(e) =>
                    setHeroImageForm((f) => ({ ...f, header_image_focus_y: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <p className="admin-form__hint">
              Adjust what stays in frame in the hero crop (similar to creator image alignment tools).
            </p>
          </div>
          <div className="admin-page__actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              Save hero image
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">{editingSlug ? "Edit track" : "Add track"}</h2>
        <form className="admin-form" onSubmit={saveTrack}>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="t-title">Title *</label>
              <input
                id="t-title"
                value={String(trackForm.title)}
                onChange={(e) => setTrackForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="t-slug">Slug (URL)</label>
              <input
                id="t-slug"
                placeholder="auto from title if empty"
                value={String(trackForm.slug)}
                onChange={(e) => setTrackForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="t-meta">Meta</label>
              <input
                id="t-meta"
                placeholder="e.g. Single, EP"
                value={String(trackForm.meta)}
                onChange={(e) => setTrackForm((f) => ({ ...f, meta: e.target.value }))}
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="t-order">Order</label>
              <input
                id="t-order"
                type="number"
                value={trackForm.order}
                onChange={(e) =>
                  setTrackForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>
          </div>
          <div className="admin-form__row">
            <label htmlFor="t-art">Cover art URL</label>
            <input
              id="t-art"
              value={String(trackForm.art_url)}
              onChange={(e) => setTrackForm((f) => ({ ...f, art_url: e.target.value }))}
            />
          </div>
          <div className="admin-form__row">
            <label htmlFor="t-link">General link</label>
            <input
              id="t-link"
              placeholder="Streaming or purchase"
              value={String(trackForm.link_url)}
              onChange={(e) => setTrackForm((f) => ({ ...f, link_url: e.target.value }))}
            />
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="t-spotify">Spotify URL</label>
              <input
                id="t-spotify"
                value={String(trackForm.spotify_url)}
                onChange={(e) => setTrackForm((f) => ({ ...f, spotify_url: e.target.value }))}
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="t-yt">YouTube URL</label>
              <input
                id="t-yt"
                value={String(trackForm.youtube_url)}
                onChange={(e) => setTrackForm((f) => ({ ...f, youtube_url: e.target.value }))}
              />
            </div>
          </div>
          <div className="admin-form__row">
            <label htmlFor="t-am">Apple Music URL</label>
            <input
              id="t-am"
              value={String(trackForm.apple_music_url)}
              onChange={(e) => setTrackForm((f) => ({ ...f, apple_music_url: e.target.value }))}
            />
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="t-year">Year</label>
              <input
                id="t-year"
                type="number"
                placeholder="e.g. 2024"
                value={trackForm.year === "" ? "" : String(trackForm.year)}
                onChange={(e) =>
                  setTrackForm((f) => ({
                    ...f,
                    year: e.target.value === "" ? "" : parseInt(e.target.value, 10) || "",
                  }))
                }
              />
            </div>
          </div>
          <div className="admin-form__row">
            <label htmlFor="t-desc">About the song</label>
            <textarea
              id="t-desc"
              value={String(trackForm.description)}
              onChange={(e) => setTrackForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="admin-form__row admin-form__row--checkbox">
            <label className="admin-form__checkbox-label">
              <input
                id="t-published"
                type="checkbox"
                checked={Number(trackForm.is_published) !== 0}
                onChange={(e) =>
                  setTrackForm((f) => ({ ...f, is_published: e.target.checked ? 1 : 0 }))
                }
              />
              <span>Published (visible on public site and API)</span>
            </label>
          </div>
          <div className="admin-page__actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              {editingSlug ? "Save changes" : "Create track"}
            </button>
            {editingSlug && (
              <button type="button" className="admin-btn" onClick={startNewTrack}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">All tracks</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Title</th>
                <th>Slug</th>
                <th>Year</th>
                <th>Public</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tracks.map((t) => (
                <tr key={t.id}>
                  <td>{t.order}</td>
                  <td>{t.title}</td>
                  <td>
                    <Link to={`/music/${t.slug}`}>{t.slug}</Link>
                  </td>
                  <td>{t.year ?? "—"}</td>
                  <td>{t.is_published === false ? "draft" : "live"}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn"
                      style={{ marginRight: "0.35rem" }}
                      onClick={() => startEditTrack(t)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      onClick={() => void handleDeleteTrack(t.slug)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">{editingVideoId != null ? "Edit featured video" : "Add featured video"}</h2>
        <form className="admin-form" onSubmit={saveVideo}>
          <div className="admin-form__row">
            <label htmlFor="v-title">Title (optional)</label>
            <input
              id="v-title"
              value={videoForm.title}
              onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="v-yt">YouTube video ID *</label>
              <input
                id="v-yt"
                placeholder="from watch?v=…"
                value={videoForm.youtube_id}
                onChange={(e) => setVideoForm((f) => ({ ...f, youtube_id: e.target.value }))}
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="v-order">Order</label>
              <input
                id="v-order"
                type="number"
                value={videoForm.order}
                onChange={(e) =>
                  setVideoForm((f) => ({
                    ...f,
                    order: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
          </div>
          <div className="admin-page__actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              {editingVideoId != null ? "Save video" : "Add video"}
            </button>
            {editingVideoId != null && (
              <button type="button" className="admin-btn" onClick={startNewVideo}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">Featured videos</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Title</th>
                <th>YouTube ID</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id}>
                  <td>{v.order}</td>
                  <td>{v.title || "—"}</td>
                  <td>{v.youtube_id}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn"
                      style={{ marginRight: "0.35rem" }}
                      onClick={() => startEditVideo(v)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      onClick={() => void handleDeleteVideo(v.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">{editingGalleryId != null ? "Edit image" : "Add image"}</h2>
        <p className="admin-card__lead">
          Upload images for the public image gallery section. They display in a Pinterest-style masonry grid.
        </p>
        <form className="admin-form" onSubmit={saveGalleryImage}>
          <div className="admin-form__row">
            <label htmlFor="g-file">Image {editingGalleryId == null ? "*" : "(optional to replace)"}</label>
            <input
              id="g-file"
              type="file"
              accept="image/*"
              onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="g-caption">Caption (optional)</label>
              <input
                id="g-caption"
                value={galleryForm.caption}
                onChange={(e) => setGalleryForm((f) => ({ ...f, caption: e.target.value }))}
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="g-order">Order</label>
              <input
                id="g-order"
                type="number"
                value={galleryForm.order}
                onChange={(e) =>
                  setGalleryForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>
          </div>
          <div className="admin-page__actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              {editingGalleryId != null ? "Save image" : "Upload image"}
            </button>
            {editingGalleryId != null && (
              <button type="button" className="admin-btn" onClick={startNewGalleryImage}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">Gallery images</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Preview</th>
                <th>Caption</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {galleryImages.map((img) => (
                <tr key={img.id}>
                  <td>{img.order}</td>
                  <td>
                    <a href={img.image_url || img.image} target="_blank" rel="noreferrer">
                      open
                    </a>
                  </td>
                  <td>{img.caption || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn"
                      style={{ marginRight: "0.35rem" }}
                      onClick={() => startEditGalleryImage(img)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      onClick={() => void handleDeleteGalleryImage(img.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {galleryImages.length === 0 ? (
                <tr>
                  <td colSpan={4}>No gallery images yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
