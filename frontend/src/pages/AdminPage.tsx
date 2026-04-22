import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import type { GalleryImage } from "../types/galleryImage";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import {
  clearTrackCoverArt,
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
  patchTrackCoverArt,
  resetAdminPassword,
  setStoredToken,
  updateFeaturedVideo,
  updateGalleryImage,
  updateHeroHeader,
  updateReleaseCountdown,
  updateTrack,
} from "../api/adminApi";
import { AdminSiteHeader } from "../components/AdminSiteHeader";
import { getAdminSiteOrigin, shouldSuggestAdminSubdomain } from "../utils/adminHost";
import { getApiBase } from "../utils/apiBase";
import { resolvePublicMediaUrl } from "../utils/mediaUrl";
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
  header_video_url: string;
  header_video_file_url: string;
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
    is_highlighted: 0,
    is_unreleased: 0,
    release_at_local: "",
    presave_url: "",
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
    is_highlighted: t.is_highlighted ? 1 : 0,
    is_unreleased: t.is_unreleased ? 1 : 0,
    release_at_local: isoToDatetimeLocal(t.release_at),
    presave_url: t.presave_url || "",
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
    header_video_url: "",
    header_video_file_url: "",
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
    header_video_url: c.header_video_url || "",
    header_video_file_url: c.header_video_file_url || "",
  };
}

function emptyGalleryForm() {
  return { caption: "", order: 0 };
}

function arrayMove<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from === to) return [...arr];
  const result = arr.slice();
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}

const DND_TYPE_TRACK = "application/x-saintted-admin-track";
const DND_TYPE_VIDEO = "application/x-saintted-admin-video";
const DND_TYPE_GALLERY = "application/x-saintted-admin-gallery";

/** How long to wait with no new reorder success before showing one “order updated” toast (per list). */
const REORDER_SUCCESS_TOAST_QUIET_MS = 2500;

type AdminToast = { id: number; type: "ok" | "error"; text: string };

function AdminToastStack({ toasts, onDismiss }: { toasts: AdminToast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="admin-toast-stack" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`admin-toast admin-toast--${t.type}`}
          role={t.type === "error" ? "alert" : "status"}
        >
          <p className="admin-toast__text">{t.text}</p>
          <button type="button" className="admin-toast__close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function AdminPage() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [resetSecret, setResetSecret] = useState("");
  const [resetInfo, setResetInfo] = useState<{ username: string; new_password: string } | null>(null);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);

  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [trackCoverFile, setTrackCoverFile] = useState<File | null>(null);
  const [clearTrackCover, setClearTrackCover] = useState(false);
  const [trackCoverBlobUrl, setTrackCoverBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!trackCoverFile) {
      setTrackCoverBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(trackCoverFile);
    setTrackCoverBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [trackCoverFile]);

  const trackCoverPreviewUrl =
    trackCoverBlobUrl ||
    (() => {
      const fromApi = editingSlug ? tracks.find((x) => x.slug === editingSlug)?.art_url?.trim() ?? "" : "";
      return fromApi ? resolvePublicMediaUrl(fromApi) : "";
    })();

  const [videoForm, setVideoForm] = useState({ title: "", youtube_id: "", order: 0 });
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
  const [galleryForm, setGalleryForm] = useState(emptyGalleryForm);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);

  const [dndDragging, setDndDragging] = useState<
    | { kind: "track"; key: string }
    | { kind: "video"; id: number }
    | { kind: "gallery"; id: number }
    | null
  >(null);

  const [countdownForm, setCountdownForm] = useState(emptyCountdownForm);
  const [heroImageForm, setHeroImageForm] = useState(emptyHeroImageForm);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroVideoFile, setHeroVideoFile] = useState<File | null>(null);
  const [clearHeroImageUpload, setClearHeroImageUpload] = useState(false);
  const [clearHeroVideoUpload, setClearHeroVideoUpload] = useState(false);
  const heroImagePreviewUrl = useMemo(() => {
    if (heroImageFile) return URL.createObjectURL(heroImageFile);
    if (heroImageForm.header_image_file_url.trim())
      return resolvePublicMediaUrl(heroImageForm.header_image_file_url.trim());
    if (heroImageForm.header_image_url.trim()) return resolvePublicMediaUrl(heroImageForm.header_image_url.trim());
    return "";
  }, [heroImageFile, heroImageForm.header_image_file_url, heroImageForm.header_image_url]);
  const heroVideoPreviewUrl = useMemo(() => {
    if (heroVideoFile) return URL.createObjectURL(heroVideoFile);
    if (heroImageForm.header_video_file_url.trim())
      return resolvePublicMediaUrl(heroImageForm.header_video_file_url.trim());
    if (heroImageForm.header_video_url.trim()) return resolvePublicMediaUrl(heroImageForm.header_video_url.trim());
    return "";
  }, [heroVideoFile, heroImageForm.header_video_file_url, heroImageForm.header_video_url]);

  useEffect(() => {
    return () => {
      if (heroImageFile && heroImagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(heroImagePreviewUrl);
      }
      if (heroVideoFile && heroVideoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(heroVideoPreviewUrl);
      }
    };
  }, [heroImageFile, heroImagePreviewUrl, heroVideoFile, heroVideoPreviewUrl]);

  const sortedTracks = useMemo(
    () => [...tracks].sort((a, b) => a.order - b.order || a.id - b.id),
    [tracks],
  );
  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => a.order - b.order || a.id - b.id),
    [videos],
  );
  const sortedGalleryImages = useMemo(
    () => [...galleryImages].sort((a, b) => a.order - b.order || a.id - b.id),
    [galleryImages],
  );

  const trackOrderConflict = useMemo(() => {
    const currentOrder = Number(trackForm.order) || 0;
    return tracks.some((item) => {
      if (editingSlug && item.slug === editingSlug) return false;
      return item.order === currentOrder;
    });
  }, [editingSlug, trackForm.order, tracks]);

  const videoOrderConflict = useMemo(() => {
    const currentOrder = Number(videoForm.order) || 0;
    return videos.some((item) => {
      if (editingVideoId != null && item.id === editingVideoId) return false;
      return item.order === currentOrder;
    });
  }, [editingVideoId, videoForm.order, videos]);

  const galleryOrderConflict = useMemo(() => {
    const currentOrder = Number(galleryForm.order) || 0;
    return galleryImages.some((item) => {
      if (editingGalleryId != null && item.id === editingGalleryId) return false;
      return item.order === currentOrder;
    });
  }, [editingGalleryId, galleryForm.order, galleryImages]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((type: "ok" | "error", text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);

  const reorderSuccessTimersRef = useRef<{
    track: number | null;
    video: number | null;
    gallery: number | null;
  }>({ track: null, video: null, gallery: null });

  const clearReorderSuccessTimer = useCallback((kind: "track" | "video" | "gallery") => {
    const ref = reorderSuccessTimersRef.current;
    const t = ref[kind];
    if (t != null) {
      window.clearTimeout(t);
      ref[kind] = null;
    }
  }, []);

  const scheduleReorderSuccessNotify = useCallback(
    (kind: "track" | "video" | "gallery", text: string) => {
      const ref = reorderSuccessTimersRef.current;
      const prevT = ref[kind];
      if (prevT != null) window.clearTimeout(prevT);
      ref[kind] = window.setTimeout(() => {
        ref[kind] = null;
        notify("ok", text);
      }, REORDER_SUCCESS_TOAST_QUIET_MS);
    },
    [notify],
  );

  useEffect(() => {
    return () => {
      const m = reorderSuccessTimersRef.current;
      (["track", "video", "gallery"] as const).forEach((k) => {
        const t = m[k];
        if (t != null) window.clearTimeout(t);
        m[k] = null;
      });
    };
  }, []);

  const loadData = useCallback(async (t: string, signal?: AbortSignal) => {
    setLoading(true);
    const [tr, fv, cd, gi] = await Promise.allSettled([
      fetchTracksAuth(t, { signal }),
      fetchFeaturedVideosAuth(t, { signal }),
      fetchReleaseCountdownAuth(t, { signal }),
      fetchGalleryImagesAuth(t, { signal }),
    ]);

    try {
      if (signal?.aborted) return;

      if (tr.status === "fulfilled") setTracks(tr.value);
      else setTracks([]);

      if (fv.status === "fulfilled") setVideos(fv.value);
      else setVideos([]);

      if (gi.status === "fulfilled") setGalleryImages(gi.value);
      else setGalleryImages([]);

      if (cd.status === "fulfilled") {
        setCountdownForm(countdownFormFromApi(cd.value));
        setHeroImageForm(heroImageFormFromApi(cd.value));
      } else {
        setCountdownForm(emptyCountdownForm());
        setHeroImageForm(emptyHeroImageForm());
      }

      setHeroImageFile(null);
      setHeroVideoFile(null);
      setClearHeroImageUpload(false);
      setClearHeroVideoUpload(false);

      const isAbortRejection = (x: PromiseSettledResult<unknown>) => {
        if (x.status !== "rejected") return false;
        const r = x.reason;
        return (
          (typeof r === "object" &&
            r !== null &&
            "name" in r &&
            (r as { name: string }).name === "AbortError") ||
          String(r).includes("AbortError")
        );
      };
      const failures = [tr, fv, cd, gi].filter(
        (x) => x.status === "rejected" && !isAbortRejection(x),
      );
      if (failures.length > 0) {
        const firstErr = String((failures[0] as PromiseRejectedResult).reason);
        const apiBase = getApiBase();
        const origin =
          typeof window !== "undefined" ? window.location.origin : "this origin";
        const netHint = firstErr.includes("HTTP")
          ? "If you see HTTP 401, use Log out then sign in again (token invalid after DB/migrate)."
          : "“Failed to fetch” usually means CORS or the API URL is wrong — check DevTools → Network.";
        notify(
          "error",
          `Some admin sections failed to load (${failures.length}/4). ${firstErr} API base: ${apiBase}. ${netHint} Include ${origin} in CORS_ORIGINS / CSRF_TRUSTED_ORIGINS on the API if needed; redeploy the frontend after changing VITE_API_URL.`,
        );
      }
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    void loadData(token, ac.signal);
    return () => ac.abort();
  }, [token, loadData]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const tok = await login(loginUser, loginPass);
      setStoredToken(tok);
      setToken(tok);
      setLoginPass("");
      setResetInfo(null);
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetInfo(null);
    try {
      const username = loginUser.trim();
      if (!username) {
        notify("error", "Enter your username first.");
        return;
      }
      const data = await resetAdminPassword(username, resetSecret.trim() || undefined);
      setResetInfo({ username: data.username, new_password: data.new_password });
      setLoginPass(data.new_password);
      setShowLoginPassword(true);
      notify("ok", "Password reset. Use the generated password to sign in.");
    } catch (err) {
      notify("error", String(err));
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
    setHeroVideoFile(null);
    setClearHeroImageUpload(false);
    setClearHeroVideoUpload(false);
    setToasts([]);
  }

  async function saveReleaseCountdown(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
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
      notify("ok", "Release countdown saved.");
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function saveHeroImageSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
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
      notify("ok", "Hero image settings saved.");
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function saveHeroVideoSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      const updated = await updateHeroHeader(token, {
        header_video_url: heroImageForm.header_video_url.trim(),
        header_video_file: heroVideoFile,
        clear_header_video_file: clearHeroVideoUpload,
      });
      setHeroImageForm(heroImageFormFromApi(updated));
      setHeroVideoFile(null);
      setClearHeroVideoUpload(false);
      notify("ok", "Hero video settings saved.");
    } catch (err) {
      notify("error", String(err));
    }
  }

  function startNewTrack() {
    setEditingSlug(null);
    setTrackForm(emptyTrackForm());
    setTrackCoverFile(null);
    setClearTrackCover(false);
  }

  function startEditTrack(t: Track) {
    setEditingSlug(t.slug);
    setTrackForm(trackToForm(t));
    setTrackCoverFile(null);
    setClearTrackCover(false);
  }

  async function saveTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const isUnreleased = Number(trackForm.is_unreleased) !== 0;
    const releaseAtLocal = String(trackForm.release_at_local || "").trim();
    const release_at =
      isUnreleased && releaseAtLocal ? new Date(releaseAtLocal).toISOString() : null;

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
      is_highlighted: Number(trackForm.is_highlighted) !== 0,
      is_unreleased: isUnreleased,
      release_at,
      presave_url: String(trackForm.presave_url).trim(),
    };
    if (!payload.title) {
      notify("error", "Title is required.");
      return;
    }
    if (isUnreleased && !release_at) {
      notify("error", "Unreleased tracks need a release date and time.");
      return;
    }
    const coverFile = trackCoverFile;
    const shouldClearCover = clearTrackCover && !coverFile;

    try {
      if (editingSlug) {
        const body = { ...payload };
        if (!body.slug) delete body.slug;
        await updateTrack(token, editingSlug, body as Partial<Track>);
        if (coverFile) {
          await patchTrackCoverArt(token, editingSlug, coverFile);
        } else if (shouldClearCover) {
          await clearTrackCoverArt(token, editingSlug);
        }
        notify("ok", "Track updated.");
      } else {
        const body = { ...payload };
        if (!body.slug) delete body.slug;
        const created = await createTrack(token, body as Partial<Track>);
        if (coverFile) {
          await patchTrackCoverArt(token, created.slug, coverFile);
        }
        notify("ok", "Track created.");
      }
      await loadData(token);
      startNewTrack();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function handleDeleteTrack(slug: string) {
    if (!token || !window.confirm(`Delete track “${slug}”?`)) return;
    try {
      await deleteTrack(token, slug);
      notify("ok", "Track deleted.");
      if (editingSlug === slug) startNewTrack();
      await loadData(token);
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function reorderTrackRowsBySlug(draggedSlug: string, targetSlug: string) {
    if (!token || draggedSlug === targetSlug) return;
    const from = sortedTracks.findIndex((item) => item.slug === draggedSlug);
    const to = sortedTracks.findIndex((item) => item.slug === targetSlug);
    if (from < 0 || to < 0) return;
    if (from === to) return;
    const reordered = arrayMove(sortedTracks, from, to);
    const withOrders: Track[] = reordered.map((item, i) => ({ ...item, order: i }));
    const previous = tracks.map((t) => ({ ...t }));
    setTracks(withOrders);
    const patches: Promise<Track>[] = [];
    withOrders.forEach((item, i) => {
      const prev = previous.find((p) => p.slug === item.slug);
      if (prev && prev.order !== i) {
        patches.push(updateTrack(token, item.slug, { order: i }));
      }
    });
    if (patches.length === 0) return;
    try {
      await Promise.all(patches);
      scheduleReorderSuccessNotify("track", "Track order updated.");
    } catch (err) {
      clearReorderSuccessTimer("track");
      setTracks(previous);
      notify("error", String(err));
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
      notify("error", "YouTube video ID is required.");
      return;
    }
    try {
      if (editingVideoId != null) {
        await updateFeaturedVideo(token, editingVideoId, {
          title: String(videoForm.title).trim(),
          youtube_id,
          order: Number(videoForm.order) || 0,
        });
        notify("ok", "Video updated.");
      } else {
        await createFeaturedVideo(token, {
          title: String(videoForm.title).trim(),
          youtube_id,
          order: Number(videoForm.order) || 0,
        });
        notify("ok", "Video added.");
      }
      await loadData(token);
      startNewVideo();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function handleDeleteVideo(id: number) {
    if (!token || !window.confirm("Delete this featured video?")) return;
    try {
      await deleteFeaturedVideo(token, id);
      notify("ok", "Video removed.");
      if (editingVideoId === id) startNewVideo();
      await loadData(token);
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function reorderVideosById(draggedId: number, targetId: number) {
    if (!token || draggedId === targetId) return;
    const from = sortedVideos.findIndex((item) => item.id === draggedId);
    const to = sortedVideos.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    if (from === to) return;
    const reordered = arrayMove(sortedVideos, from, to);
    const withOrders: FeaturedVideo[] = reordered.map((item, i) => ({ ...item, order: i }));
    const previous = videos.map((v) => ({ ...v }));
    setVideos(withOrders);
    const patches: Promise<FeaturedVideo>[] = [];
    withOrders.forEach((item, i) => {
      const prev = previous.find((p) => p.id === item.id);
      if (prev && prev.order !== i) {
        patches.push(updateFeaturedVideo(token, item.id, { order: i }));
      }
    });
    if (patches.length === 0) return;
    try {
      await Promise.all(patches);
      scheduleReorderSuccessNotify("video", "Featured video order updated.");
    } catch (err) {
      clearReorderSuccessTimer("video");
      setVideos(previous);
      notify("error", String(err));
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
    try {
      if (editingGalleryId != null) {
        await updateGalleryImage(token, editingGalleryId, {
          caption: galleryForm.caption.trim(),
          order: Number(galleryForm.order) || 0,
          image: galleryFile,
        });
        notify("ok", "Image updated.");
      } else {
        if (!galleryFile) {
          notify("error", "Select an image file to upload.");
          return;
        }
        await createGalleryImage(token, {
          image: galleryFile,
          caption: galleryForm.caption.trim(),
          order: Number(galleryForm.order) || 0,
        });
        notify("ok", "Image uploaded.");
      }
      await loadData(token);
      startNewGalleryImage();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function handleDeleteGalleryImage(id: number) {
    if (!token || !window.confirm("Delete this image?")) return;
    try {
      await deleteGalleryImage(token, id);
      notify("ok", "Image deleted.");
      if (editingGalleryId === id) startNewGalleryImage();
      await loadData(token);
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function reorderGalleryById(draggedId: number, targetId: number) {
    if (!token || draggedId === targetId) return;
    const from = sortedGalleryImages.findIndex((item) => item.id === draggedId);
    const to = sortedGalleryImages.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    if (from === to) return;
    const reordered = arrayMove(sortedGalleryImages, from, to);
    const withOrders: GalleryImage[] = reordered.map((item, i) => ({ ...item, order: i }));
    const previous = galleryImages.map((g) => ({ ...g }));
    setGalleryImages(withOrders);
    const patches: Promise<GalleryImage>[] = [];
    withOrders.forEach((item, i) => {
      const prev = previous.find((p) => p.id === item.id);
      if (prev && prev.order !== i) {
        patches.push(updateGalleryImage(token, item.id, { order: i }));
      }
    });
    if (patches.length === 0) return;
    try {
      await Promise.all(patches);
      scheduleReorderSuccessNotify("gallery", "Gallery order updated.");
    } catch (err) {
      clearReorderSuccessTimer("gallery");
      setGalleryImages(previous);
      notify("error", String(err));
    }
  }

  if (!token) {
    return (
      <>
        <AdminToastStack toasts={toasts} onDismiss={dismissToast} />
        <div className="admin-page">
        <AdminSiteHeader />
        <AdminSubdomainCallout />
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
          <form className="admin-form admin-form--forgot" onSubmit={handleForgotPassword}>
            <div className="admin-form__row">
              <label htmlFor="admin-reset-secret">Reset secret (required in production)</label>
              <input
                id="admin-reset-secret"
                type="password"
                autoComplete="off"
                placeholder="Only needed when production reset is enabled"
                value={resetSecret}
                onChange={(e) => setResetSecret(e.target.value)}
              />
            </div>
            <button type="submit" className="admin-btn">
              Forgot password (generate new one)
            </button>
            {resetInfo ? (
              <p className="admin-form__hint">
                New password for <strong>{resetInfo.username}</strong>:{" "}
                <code>{resetInfo.new_password}</code>
              </p>
            ) : null}
          </form>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <AdminToastStack toasts={toasts} onDismiss={dismissToast} />
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
        <h2 className="admin-card__title">Hero media</h2>
        <p className="admin-card__lead">
          Set the home-page hero using image and optional video URL/upload. Uploaded files take priority over URLs, and on slower connections the site automatically falls back to the image for reliability.
        </p>
        <div className="admin-hero-media-grid">
          <form className="admin-form admin-hero-media-col" onSubmit={saveHeroImageSettings}>
            <h3 className="admin-hero-media-col__title">Image</h3>
            <div
              className="admin-crop-editor__preview admin-hero-media-col__preview"
              style={
                heroImagePreviewUrl
                  ? {
                      backgroundImage: `url(${heroImagePreviewUrl})`,
                      backgroundPosition: `${heroImageForm.header_image_focus_x}% ${heroImageForm.header_image_focus_y}%`,
                    }
                  : undefined
              }
              aria-hidden
            />
            {!heroImagePreviewUrl ? <p className="admin-form__hint">No image selected yet.</p> : null}
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
                <div className="admin-crop-editor__controls">
                  <label htmlFor="hero-image-focus-x">
                    Horizontal position: {Math.round(heroImageForm.header_image_focus_x)}%
                  </label>
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
                  <label htmlFor="hero-image-focus-y">
                    Vertical position: {Math.round(heroImageForm.header_image_focus_y)}%
                  </label>
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
                Adjust what stays in frame in the hero crop.
              </p>
            </div>
            <div className="admin-page__actions">
              <button
                type="submit"
                className="admin-btn admin-btn--primary admin-hero-media-col__save-btn"
              >
                Save image
              </button>
            </div>
          </form>

          <form className="admin-form admin-hero-media-col" onSubmit={saveHeroVideoSettings}>
            <h3 className="admin-hero-media-col__title">Video</h3>
            {heroVideoPreviewUrl ? (
              <video
                className="admin-hero-video-preview admin-hero-media-col__preview"
                src={heroVideoPreviewUrl}
                controls
                muted
                playsInline
              />
            ) : (
              <div className="admin-hero-media-col__empty">No video selected yet.</div>
            )}
            <div className="admin-form__row">
              <label htmlFor="hero-video-url">Video URL (optional)</label>
              <input
                id="hero-video-url"
                type="url"
                placeholder="https://…"
                value={heroImageForm.header_video_url}
                onChange={(e) =>
                  setHeroImageForm((f) => ({ ...f, header_video_url: e.target.value }))
                }
              />
              <p className="admin-form__hint">
                Video autoplay is attempted on the public site. Keep an image set as visual fallback.
              </p>
            </div>
            <div className="admin-form__row">
              <label htmlFor="hero-video-upload">Upload video (optional)</label>
              <input
                id="hero-video-upload"
                type="file"
                accept="video/*"
                onChange={(e) => setHeroVideoFile(e.target.files?.[0] || null)}
              />
              {heroImageForm.header_video_file_url ? (
                <p className="admin-form__hint">
                  Current upload:{" "}
                  <a href={heroImageForm.header_video_file_url} target="_blank" rel="noreferrer">
                    open video
                  </a>
                </p>
              ) : null}
              <label className="admin-form__check">
                <input
                  type="checkbox"
                  checked={clearHeroVideoUpload}
                  onChange={(e) => setClearHeroVideoUpload(e.target.checked)}
                />
                <span>Remove current uploaded video</span>
              </label>
            </div>
            <div className="admin-page__actions">
              <button
                type="submit"
                className="admin-btn admin-btn--primary admin-hero-media-col__save-btn"
              >
                Save video
              </button>
            </div>
          </form>
        </div>
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
                className={trackOrderConflict ? "admin-input--error" : undefined}
                value={trackForm.order}
                onChange={(e) =>
                  setTrackForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))
                }
              />
              {trackOrderConflict ? (
                <p className="admin-form__hint admin-form__hint--error">
                  This order number is already used by another track.
                </p>
              ) : null}
            </div>
          </div>
          <div className="admin-form__row">
            <label htmlFor="t-art">Cover art URL</label>
            <input
              id="t-art"
              placeholder="Optional — or upload a file below"
              value={String(trackForm.art_url)}
              onChange={(e) => setTrackForm((f) => ({ ...f, art_url: e.target.value }))}
            />
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="t-art-file">Upload cover art</label>
              <input
                id="t-art-file"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setTrackCoverFile(f);
                  if (f) setClearTrackCover(false);
                }}
              />
            </div>
            {trackCoverPreviewUrl ? (
              <div className="admin-form__row admin-form__preview">
                <span className="admin-form__preview-label">Preview</span>
                <img
                  src={trackCoverPreviewUrl}
                  alt=""
                  className="admin-track-cover-preview"
                />
              </div>
            ) : null}
          </div>
          {editingSlug ? (
            <div className="admin-form__row admin-form__row--checkbox">
              <label className="admin-form__checkbox-label">
                <input
                  type="checkbox"
                  checked={clearTrackCover}
                  onChange={(e) => {
                    setClearTrackCover(e.target.checked);
                    if (e.target.checked) setTrackCoverFile(null);
                  }}
                />
                <span>Remove uploaded cover (use URL above or automatic art only)</span>
              </label>
            </div>
          ) : null}
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
          <div className="admin-form__row admin-form__row--checkbox">
            <label className="admin-form__checkbox-label">
              <input
                id="t-highlighted"
                type="checkbox"
                checked={Number(trackForm.is_highlighted) !== 0}
                onChange={(e) =>
                  setTrackForm((f) => ({ ...f, is_highlighted: e.target.checked ? 1 : 0 }))
                }
              />
              <span>Highlight as featured/new release on home page</span>
            </label>
          </div>
          <div className="admin-form__row admin-form__row--checkbox">
            <label className="admin-form__checkbox-label">
              <input
                id="t-unreleased"
                type="checkbox"
                checked={Number(trackForm.is_unreleased) !== 0}
                onChange={(e) =>
                  setTrackForm((f) => ({ ...f, is_unreleased: e.target.checked ? 1 : 0 }))
                }
              />
              <span>Unreleased / upcoming (countdown page + “upcoming” row on home)</span>
            </label>
          </div>
          <div className="admin-form__row admin-form__row--2">
            <div className="admin-form__row">
              <label htmlFor="t-release-at">Release date &amp; time (required if unreleased)</label>
              <input
                id="t-release-at"
                type="datetime-local"
                value={String(trackForm.release_at_local)}
                onChange={(e) => setTrackForm((f) => ({ ...f, release_at_local: e.target.value }))}
              />
            </div>
            <div className="admin-form__row">
              <label htmlFor="t-presave">Pre-save URL (optional)</label>
              <input
                id="t-presave"
                type="url"
                placeholder="https://…"
                value={String(trackForm.presave_url)}
                onChange={(e) => setTrackForm((f) => ({ ...f, presave_url: e.target.value }))}
              />
            </div>
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
                <th>Upcoming</th>
                <th>Highlighted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedTracks.map((t) => (
                <tr
                  key={t.id}
                  className={
                    dndDragging?.kind === "track" && dndDragging.key === t.slug
                      ? "admin-table__row--dragging"
                      : undefined
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDropCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const dragged = e.dataTransfer.getData(DND_TYPE_TRACK) || e.dataTransfer.getData("text/plain");
                    if (!dragged) return;
                    if (dragged === t.slug) return;
                    void reorderTrackRowsBySlug(dragged, t.slug);
                  }}
                >
                  <td>
                    <div className="admin-table__orderCell">
                      <span
                        className="admin-drag-handle"
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DND_TYPE_TRACK, t.slug);
                          e.dataTransfer.setData("text/plain", t.slug);
                          e.dataTransfer.effectAllowed = "move";
                          setDndDragging({ kind: "track", key: t.slug });
                        }}
                        onDragEnd={() => {
                          setDndDragging(null);
                        }}
                      />
                      <span>{t.order}</span>
                    </div>
                  </td>
                  <td>{t.title}</td>
                  <td>
                    <Link draggable={false} to={`/music/${t.slug}`}>
                      {t.slug}
                    </Link>
                  </td>
                  <td>{t.year ?? "—"}</td>
                  <td>{t.is_published === false ? "draft" : "live"}</td>
                  <td>{t.is_unreleased ? "yes" : "—"}</td>
                  <td>{t.is_highlighted ? "yes" : "—"}</td>
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
                className={videoOrderConflict ? "admin-input--error" : undefined}
                value={videoForm.order}
                onChange={(e) =>
                  setVideoForm((f) => ({
                    ...f,
                    order: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              {videoOrderConflict ? (
                <p className="admin-form__hint admin-form__hint--error">
                  This order number is already used by another featured video.
                </p>
              ) : null}
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
              {sortedVideos.map((v) => (
                <tr
                  key={v.id}
                  className={
                    dndDragging?.kind === "video" && dndDragging.id === v.id
                      ? "admin-table__row--dragging"
                      : undefined
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDropCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const raw =
                      e.dataTransfer.getData(DND_TYPE_VIDEO) || e.dataTransfer.getData("text/plain");
                    const draggedId = parseInt(String(raw), 10);
                    if (!Number.isFinite(draggedId)) return;
                    if (draggedId === v.id) return;
                    void reorderVideosById(draggedId, v.id);
                  }}
                >
                  <td>
                    <div className="admin-table__orderCell">
                      <span
                        className="admin-drag-handle"
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DND_TYPE_VIDEO, String(v.id));
                          e.dataTransfer.setData("text/plain", String(v.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDndDragging({ kind: "video", id: v.id });
                        }}
                        onDragEnd={() => {
                          setDndDragging(null);
                        }}
                      />
                      <span>{v.order}</span>
                    </div>
                  </td>
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
                className={galleryOrderConflict ? "admin-input--error" : undefined}
                value={galleryForm.order}
                onChange={(e) =>
                  setGalleryForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))
                }
              />
              {galleryOrderConflict ? (
                <p className="admin-form__hint admin-form__hint--error">
                  This order number is already used by another gallery image.
                </p>
              ) : null}
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
              {sortedGalleryImages.map((img) => (
                <tr
                  key={img.id}
                  className={
                    dndDragging?.kind === "gallery" && dndDragging.id === img.id
                      ? "admin-table__row--dragging"
                      : undefined
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDropCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const raw =
                      e.dataTransfer.getData(DND_TYPE_GALLERY) || e.dataTransfer.getData("text/plain");
                    const draggedId = parseInt(String(raw), 10);
                    if (!Number.isFinite(draggedId)) return;
                    if (draggedId === img.id) return;
                    void reorderGalleryById(draggedId, img.id);
                  }}
                >
                  <td>
                    <div className="admin-table__orderCell">
                      <span
                        className="admin-drag-handle"
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DND_TYPE_GALLERY, String(img.id));
                          e.dataTransfer.setData("text/plain", String(img.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDndDragging({ kind: "gallery", id: img.id });
                        }}
                        onDragEnd={() => {
                          setDndDragging(null);
                        }}
                      />
                      <span>{img.order}</span>
                    </div>
                  </td>
                  <td>
                    <a href={img.image_url || img.image} target="_blank" rel="noreferrer" draggable={false}>
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
    </>
  );
}
