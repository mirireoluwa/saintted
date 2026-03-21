import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import {
  createFeaturedVideo,
  createTrack,
  deleteFeaturedVideo,
  deleteTrack,
  fetchFeaturedVideosAuth,
  fetchTracksAuth,
  getStoredToken,
  login,
  setStoredToken,
  updateFeaturedVideo,
  updateTrack,
} from "../api/adminApi";
import { AdminSiteHeader } from "../components/AdminSiteHeader";
import "./AdminPage.css";

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
  };
}

function parseYear(v: string | number): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const [videoForm, setVideoForm] = useState({ title: "", youtube_id: "", order: 0 });
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);

  const loadData = useCallback(async (t: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const [tr, fv] = await Promise.all([
        fetchTracksAuth(t),
        fetchFeaturedVideosAuth(t),
      ]);
      setTracks(tr);
      setVideos(fv);
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
    setTrackForm(emptyTrackForm());
    setEditingSlug(null);
    setEditingVideoId(null);
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

  if (!token) {
    return (
      <div className="admin-page">
        <AdminSiteHeader />
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
    </div>
  );
}
