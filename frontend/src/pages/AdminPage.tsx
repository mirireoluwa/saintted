import { Helmet } from "react-helmet-async";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import type { GalleryImage } from "../types/galleryImage";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import {
  broadcastEmail,
  checkSession,
  seedTracks,
  clearTrackCoverArt,
  createFeaturedVideo,
  createGalleryImage,
  createTrack,
  deleteGalleryImage,
  deleteFeaturedVideo,
  deleteSubscriber,
  deleteTrack,
  fetchFeaturedVideosAuth,
  fetchGalleryImagesAuth,
  fetchMailingListSubscribers,
  fetchReleaseCountdownAuth,
  fetchTracksAuth,
  login,
  logout as apiLogout,
  patchTrackCoverArt,
  updateFeaturedVideo,
  updateGalleryImage,
  updateHeroHeader,
  updateReleaseCountdown,
  updateTrack,
  type MailingListSubscriber,
} from "../api/adminApi";
import { AdminSiteHeader } from "../components/AdminSiteHeader";
import { AdminDropzone } from "../components/AdminDropzone";
import { AdminSortableList } from "../components/AdminSortableList";
import { AdminBell } from "../components/AdminBell";
import { AdminInsights } from "../components/AdminInsights";
import { AdminStoryOrder } from "../components/AdminStoryOrder";
import { buildNotices, type AdminNotice } from "../components/noticeRules";
import { markAdminBrowser } from "../utils/analytics";
import { getTrackArtUrl } from "../utils/trackArt";
import { FocalPointEditor } from "../components/FocalPointEditor";
import { AdminAboutPanel } from "../components/AdminAboutPanel";
import { AdminShowsPanel } from "../components/AdminShowsPanel";
import { getAdminSiteOrigin, shouldSuggestAdminSubdomain } from "../utils/adminHost";
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
        as your main site and turn off "redirect to primary domain" for it (details in the README).
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
    accent_color: "",
    highlighted_until_local: "",
    publish_at_local: "",
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
    accent_color: t.accent_color || "",
    highlighted_until_local: isoToDatetimeLocal(t.highlighted_until),
    publish_at_local: isoToDatetimeLocal(t.publish_at),
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


/** How long to wait with no new reorder success before showing one "order updated" toast (per list). */
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

const SESSION_LOGIN_KEY = "saintted_admin_login_at";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_WARN_BEFORE_MS = 24 * 60 * 60 * 1000;  // warn 1 day before expiry

const SUBSCRIBER_PREVIEW = 8;
const SUBSCRIBER_PAGE_SIZE = 20;

const ACCENT_PRESETS = ["#87ceeb", "#f472b6", "#fbbf24", "#a3e635", "#a78bfa", "#fb7185", "#34d399", "#f97316"];

type AdminSection = "home" | "music" | "media" | "pages" | "audience" | "insights";

const ADMIN_SECTIONS: { id: AdminSection; label: string; hint: string }[] = [
  { id: "home", label: "Homepage", hint: "countdown + hero" },
  { id: "music", label: "Music", hint: "tracks" },
  { id: "media", label: "Media", hint: "videos + photos" },
  { id: "pages", label: "Pages", hint: "about + shows" },
  { id: "audience", label: "Audience", hint: "mailing list" },
  { id: "insights", label: "Insights", hint: "who visits + clicks" },
];

const SEEN_KEY = "saintted:admin-seen";
const READ_KEY = "saintted:admin-read";
const DISMISSED_KEY = "saintted:admin-dismissed";

function loadSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]") as string[]);
  } catch {
    return new Set();
  }
}
function saveSet(key: string, v: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...v].slice(-300)));
  } catch {
    /* ignore */
  }
}

function sectionFromHash(): AdminSection {
  const h = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  return ADMIN_SECTIONS.some((x) => x.id === h) ? (h as AdminSection) : "home";
}

export function AdminPage() {
  const [section, setSectionState] = useState<AdminSection>(sectionFromHash);
  const [navOpen, setNavOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(SEEN_KEY)) || 0;
    } catch {
      return 0;
    }
  });
  const [readIds, setReadIds] = useState<Set<string>>(() => loadSet(READ_KEY));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadSet(DISMISSED_KEY));
  const setSection = (next: AdminSection) => {
    setNavOpen(false);
    setSectionState(next);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  };
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionExpiresIn, setSessionExpiresIn] = useState<number | null>(null);
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);

  // Mailing list
  const [mlSubscribers, setMlSubscribers] = useState<MailingListSubscriber[]>([]);
  const [subsFullView, setSubsFullView] = useState(false);
  const [subsQuery, setSubsQuery] = useState("");
  const [subsPage, setSubsPage] = useState(1);
  const [mlCount, setMlCount] = useState<number | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastPreviewOpen, setBroadcastPreviewOpen] = useState(false);

  // Cover art validation hints
  const [coverArtWarning, setCoverArtWarning] = useState<string | null>(null);

  const [seedingTracks, setSeedingTracks] = useState(false);

  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [trackDrawerOpen, setTrackDrawerOpen] = useState(false);

  useEffect(() => {
    if (isLoggedIn) markAdminBrowser();
  }, [isLoggedIn]);

  const [trackCoverFile, setTrackCoverFile] = useState<File | null>(null);
  const [clearTrackCover, setClearTrackCover] = useState(false);
  const [trackCoverBlobUrl, setTrackCoverBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!trackCoverFile) {
      setTrackCoverBlobUrl(null);
      setCoverArtWarning(null);
      return;
    }
    const url = URL.createObjectURL(trackCoverFile);
    setTrackCoverBlobUrl(url);

    // Validate image dimensions and file size
    const warnings: string[] = [];
    const MAX_SIZE_MB = 5;
    const MIN_DIM = 500;
    if (trackCoverFile.size > MAX_SIZE_MB * 1024 * 1024) {
      warnings.push(`File is ${(trackCoverFile.size / 1024 / 1024).toFixed(1)} MB — consider compressing below ${MAX_SIZE_MB} MB for faster loads.`);
    }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < MIN_DIM || img.naturalHeight < MIN_DIM) {
        warnings.push(`Image is ${img.naturalWidth}×${img.naturalHeight}px — recommended minimum is ${MIN_DIM}×${MIN_DIM}px for crisp display.`);
      }
      setCoverArtWarning(warnings.join(" "));
    };
    img.src = url;

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

  useEffect(() => {
    checkSession().then((ok) => {
      setIsLoggedIn(ok);
      setSessionChecked(true);
      if (ok) {
        const loginAt = parseInt(localStorage.getItem(SESSION_LOGIN_KEY) || "0", 10);
        if (loginAt > 0) {
          const expiresAt = loginAt + SESSION_MAX_AGE_MS;
          const remaining = expiresAt - Date.now();
          if (remaining < SESSION_WARN_BEFORE_MS && remaining > 0) {
            setSessionExpiresIn(remaining);
          }
        }
      }
    });
  }, []);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const [tr, fv, cd, gi] = await Promise.allSettled([
      fetchTracksAuth({ signal }),
      fetchFeaturedVideosAuth({ signal }),
      fetchReleaseCountdownAuth({ signal }),
      fetchGalleryImagesAuth({ signal }),
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
        notify("error", `Some admin sections failed to load (${failures.length}/4). ${firstErr}`);
      }
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const ac = new AbortController();
    void loadData(ac.signal);
    return () => ac.abort();
  }, [isLoggedIn, loadData]);

  const loadMailingList = useCallback(async () => {
    setMlLoading(true);
    try {
      const data = await fetchMailingListSubscribers();
      setMlSubscribers(data.subscribers);
      setMlCount(data.count);
    } catch (err) {
      notify("error", `Failed to load subscribers: ${String(err)}`);
    } finally {
      setMlLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadMailingList();
  }, [isLoggedIn, loadMailingList]);

  async function handleDeleteSubscriber(id: number, email: string) {
    if (!window.confirm(`Remove ${email} from the mailing list?`)) return;
    try {
      await deleteSubscriber(id);
      setMlSubscribers((prev) => prev.filter((s) => s.id !== id));
      setMlCount((prev) => (prev !== null ? prev - 1 : null));
      notify("ok", `${email} removed.`);
    } catch (err) {
      notify("error", `Could not delete subscriber: ${String(err)}`);
    }
  }

  function buildBroadcastHtml(body: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="background:#000;color:#fff;font-family:'Space Mono',ui-monospace,monospace;padding:40px 24px;max-width:600px;margin:0 auto;">${body
      .split(/\n\n+/)
      .map((p) => `<p style="line-height:1.7;color:rgba(255,255,255,0.8);">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("")}<p style="margin-top:40px;font-size:11px;opacity:0.4;"><a href="https://saintted.com" style="color:#fff;">saintted.com</a></p></body></html>`;
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBody.trim()) {
      notify("error", "Subject and message are both required.");
      return;
    }
    setBroadcastSending(true);
    try {
      // Convert plain text body to simple HTML paragraphs
      const html = buildBroadcastHtml(broadcastBody);
      const result = await broadcastEmail({
        subject: broadcastSubject.trim(),
        html,
        text: broadcastBody.trim(),
      });
      notify("ok", `Sent to ${result.sent} subscriber${result.sent === 1 ? "" : "s"}.`);
      setBroadcastSubject("");
      setBroadcastBody("");
    } catch (err) {
      notify("error", `Broadcast failed: ${String(err)}`);
    } finally {
      setBroadcastSending(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(loginPass);
      localStorage.setItem(SESSION_LOGIN_KEY, String(Date.now()));
      setIsLoggedIn(true);
      setSessionExpiresIn(null);
      setLoginPass("");
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function logout() {
    await apiLogout().catch(() => {});
    localStorage.removeItem(SESSION_LOGIN_KEY);
    setIsLoggedIn(false);
    setTracks([]);
    setVideos([]);
    setGalleryImages([]);
    setTrackForm(emptyTrackForm());
    setEditingSlug(null);
    setEditingVideoId(null);
    setEditingGalleryId(null);
    setGalleryForm({ ...emptyGalleryForm(), order: sortedGalleryImages.length ? Math.max(...sortedGalleryImages.map((g) => g.order)) + 1 : 0 });
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
    try {
      const release_at = countdownForm.release_at_local.trim()
        ? new Date(countdownForm.release_at_local).toISOString()
        : null;
      const updated = await updateReleaseCountdown({
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
    try {
      const updated = await updateHeroHeader({
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
    try {
      const updated = await updateHeroHeader({
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

  useEffect(() => {
    if (!trackDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTrackDrawer();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackDrawerOpen]);

  // the phone menu closes on Escape or a tap outside it
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!(e.target as Element).closest(".admin-side")) setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [navOpen]);

  function startNewTrack() {
    setEditingSlug(null);
    // new items join the end of the list; reorder them from the list afterwards
    setTrackForm({ ...emptyTrackForm(), order: sortedTracks.length ? Math.max(...sortedTracks.map((t) => t.order)) + 1 : 0 });
    setTrackCoverFile(null);
    setClearTrackCover(false);
  }

  function openNewTrack() {
    startNewTrack();
    setTrackDrawerOpen(true);
  }

  function closeTrackDrawer() {
    startNewTrack();
    setTrackDrawerOpen(false);
  }

  function startEditTrack(t: Track) {
    setTrackDrawerOpen(true);
    setEditingSlug(t.slug);
    setTrackForm(trackToForm(t));
    setTrackCoverFile(null);
    setClearTrackCover(false);
  }

  async function saveTrack(e: React.FormEvent) {
    e.preventDefault();
    const isUnreleased = Number(trackForm.is_unreleased) !== 0;
    const releaseAtLocal = String(trackForm.release_at_local || "").trim();
    const release_at =
      isUnreleased && releaseAtLocal ? new Date(releaseAtLocal).toISOString() : null;

    const highlightedUntilLocal = String(trackForm.highlighted_until_local || "").trim();
    const highlighted_until = highlightedUntilLocal
      ? new Date(highlightedUntilLocal).toISOString()
      : null;

    const publishAtLocal = String(trackForm.publish_at_local || "").trim();
    const publish_at = publishAtLocal ? new Date(publishAtLocal).toISOString() : null;

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
      accent_color: String(trackForm.accent_color || "").trim(),
      highlighted_until,
      publish_at,
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
        await updateTrack(editingSlug, body as Partial<Track>);
        if (coverFile) {
          await patchTrackCoverArt(editingSlug, coverFile);
        } else if (shouldClearCover) {
          await clearTrackCoverArt(editingSlug);
        }
        notify("ok", "Track updated.");
      } else {
        const body = { ...payload };
        if (!body.slug) delete body.slug;
        const created = await createTrack(body as Partial<Track>);
        if (coverFile) {
          await patchTrackCoverArt(created.slug, coverFile);
        }
        notify("ok", "Track created.");
      }
      await loadData();
      closeTrackDrawer();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function handleDeleteTrack(slug: string) {
    if (!window.confirm(`Delete track "${slug}"?`)) return;
    try {
      await deleteTrack(slug);
      notify("ok", "Track deleted.");
      if (editingSlug === slug) closeTrackDrawer();
      await loadData();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function reorderTrackRowsBySlug(draggedSlug: string, targetSlug: string) {
    if (draggedSlug === targetSlug) return;
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
        patches.push(updateTrack(item.slug, { order: i }));
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
    setVideoForm({ title: "", youtube_id: "", order: sortedVideos.length ? Math.max(...sortedVideos.map((v) => v.order)) + 1 : 0 });
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
    const youtube_id = String(videoForm.youtube_id).trim();
    if (!youtube_id) {
      notify("error", "YouTube video ID is required.");
      return;
    }
    try {
      if (editingVideoId != null) {
        await updateFeaturedVideo(editingVideoId, {
          title: String(videoForm.title).trim(),
          youtube_id,
          order: Number(videoForm.order) || 0,
        });
        notify("ok", "Video updated.");
      } else {
        await createFeaturedVideo({
          title: String(videoForm.title).trim(),
          youtube_id,
          order: Number(videoForm.order) || 0,
        });
        notify("ok", "Video added.");
      }
      await loadData();
      startNewVideo();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function handleDeleteVideo(id: number) {
    if (!window.confirm("Delete this featured video?")) return;
    try {
      await deleteFeaturedVideo(id);
      notify("ok", "Video removed.");
      if (editingVideoId === id) startNewVideo();
      await loadData();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function reorderVideosById(draggedId: number, targetId: number) {
    if (draggedId === targetId) return;
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
        patches.push(updateFeaturedVideo(item.id, { order: i }));
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
    try {
      if (editingGalleryId != null) {
        await updateGalleryImage(editingGalleryId, {
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
        await createGalleryImage({
          image: galleryFile,
          caption: galleryForm.caption.trim(),
          order: Number(galleryForm.order) || 0,
        });
        notify("ok", "Image uploaded.");
      }
      await loadData();
      startNewGalleryImage();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function handleDeleteGalleryImage(id: number) {
    if (!window.confirm("Delete this image?")) return;
    try {
      await deleteGalleryImage(id);
      notify("ok", "Image deleted.");
      if (editingGalleryId === id) startNewGalleryImage();
      await loadData();
    } catch (err) {
      notify("error", String(err));
    }
  }

  async function reorderGalleryById(draggedId: number, targetId: number) {
    if (draggedId === targetId) return;
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
        patches.push(updateGalleryImage(item.id, { order: i }));
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

  if (!sessionChecked) {
    return null;
  }

  const renderSubscriberRow = (s: MailingListSubscriber) => (
    <tr key={s.id}>
      <td>{s.first_name} {s.last_name}</td>
      <td>{s.email}</td>
      <td>{new Date(s.subscribed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
      <td className="admin-table__actions">
        <button
          type="button"
          className="admin-btn admin-btn--danger"
          aria-label={`Remove ${s.email}`}
          onClick={() => void handleDeleteSubscriber(s.id, s.email)}
        >
          <span className="admin-btn__icon"><TrashIcon /></span>
          <span className="admin-btn__label">Remove</span>
        </button>
      </td>
    </tr>
  );

  const subsQ = subsQuery.trim().toLowerCase();
  const subsFiltered = subsQ
    ? mlSubscribers.filter((x) => `${x.first_name} ${x.last_name} ${x.email}`.toLowerCase().includes(subsQ))
    : mlSubscribers;
  const subsPages = Math.max(1, Math.ceil(subsFiltered.length / SUBSCRIBER_PAGE_SIZE));
  const subsPageSafe = Math.min(subsPage, subsPages);
  const subsSlice = subsFiltered.slice((subsPageSafe - 1) * SUBSCRIBER_PAGE_SIZE, subsPageSafe * SUBSCRIBER_PAGE_SIZE);

  const notices: AdminNotice[] = buildNotices(tracks, mlSubscribers, lastSeen).filter((n) => !dismissedIds.has(n.id));
  const unreadCount = notices.filter((n) => n.unread && !readIds.has(n.id)).length;
  const trackTitles = Object.fromEntries(tracks.map((t) => [t.slug, t.title]));

  function markAllNoticesRead() {
    const now = Date.now();
    setLastSeen(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
    const next = new Set(readIds);
    notices.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveSet(READ_KEY, next);
  }
  function dismissNotice(id: string) {
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    saveSet(DISMISSED_KEY, next);
  }
  function openNotice(n: AdminNotice) {
    if (!n.action) return;
    setSection(n.action.section);
    if (n.action.trackSlug) {
      const t = tracks.find((x) => x.slug === n.action!.trackSlug);
      if (t) startEditTrack(t);
    }
  }

  if (!isLoggedIn) {
    return (
      <>
        <AdminToastStack toasts={toasts} onDismiss={dismissToast} />
        <Helmet>
          <title>admin · saintted</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>

        <div className="admin-page">
          <AdminSiteHeader />
          <AdminSubdomainCallout />
          <div className="admin-card">
            <h2 className="admin-card__title">Log in</h2>
            <form className="admin-form" onSubmit={(e) => void handleLogin(e)}>
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
                Sign in
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const sessionHoursLeft = sessionExpiresIn != null
    ? Math.ceil(sessionExpiresIn / 1000 / 60 / 60)
    : null;

  return (
    <>
      <AdminToastStack toasts={toasts} onDismiss={dismissToast} />
      <Helmet>
        <title>admin · saintted</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
    <div className="admin-page">
      <AdminSiteHeader
        actions={
          <AdminBell
            notices={notices}
            unreadCount={unreadCount}
            onOpen={openNotice}
            onDismiss={dismissNotice}
            onMarkAllRead={markAllNoticesRead}
          />
        }
      />
      <AdminSubdomainCallout />
      {sessionHoursLeft !== null && (
        <div className="admin-callout admin-callout--warning" role="alert">
          <p className="admin-callout__text">
            ⏱ Your admin session expires in about <strong>{sessionHoursLeft} hour{sessionHoursLeft === 1 ? "" : "s"}</strong>. Log out and back in to reset it.
          </p>
        </div>
      )}

      <div className="admin-shell">
        <aside className={`admin-side${navOpen ? " admin-side--open" : ""}`}>
          {/* phones + tablets: one menu button showing the current section, like the main site */}
          <button
            type="button"
            className="admin-side__toggle"
            aria-expanded={navOpen}
            aria-controls="admin-side-panel"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span className="admin-side__toggle-label">
              {ADMIN_SECTIONS.find((x) => x.id === section)?.label}
            </span>
            <span className="admin-side__burger" aria-hidden />
            <span className="sr-only">{navOpen ? "Close menu" : "Open menu"}</span>
          </button>
          <div className="admin-side__panel" id="admin-side-panel">
            <nav className="admin-side__nav" aria-label="Admin sections">
              {ADMIN_SECTIONS.map((x) => {
                const count =
                  x.id === "music" ? tracks.length
                  : x.id === "media" ? videos.length + galleryImages.length
                  : x.id === "audience" ? mlCount
                  : null;
                return (
                  <button
                    key={x.id}
                    type="button"
                    className="admin-side__link"
                    aria-current={section === x.id ? "page" : undefined}
                    onClick={() => setSection(x.id)}
                  >
                    <span className="admin-side__label">{x.label}</span>
                    <span className="admin-side__hint">{x.hint}</span>
                    {count != null ? <span className={`admin-side__count`}>{count}</span> : null}
                  </button>
                );
              })}
            </nav>
            <div className="admin-side__foot">
              <button type="button" className="admin-btn" onClick={() => void loadData()}>
                Refresh
              </button>
              <button type="button" className="admin-btn admin-btn--danger" onClick={() => void logout()}>
                Log out
              </button>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-main__head">
            <p className="admin-main__eyebrow">admin</p>
            <h1 className="admin-main__title">{ADMIN_SECTIONS.find((x) => x.id === section)?.label}</h1>
            {loading && <p className="admin-page__loading">Loading…</p>}
          </header>


      {section === "insights" && <AdminInsights trackTitles={trackTitles} />}

      {section === "home" && (<>
      <AdminStoryOrder tracks={tracks} notify={notify} />

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
            <AdminDropzone
              id="hero-image-upload"
              kind="image"
              accept="image/*"
              file={heroImageFile}
              currentUrl={clearHeroImageUpload ? null : heroImagePreviewUrl}
              hint="landscape, at least 1920px wide"
              onFile={(f) => {
                setHeroImageFile(f);
                if (f) setClearHeroImageUpload(false);
              }}
            />
            {heroImageForm.header_image_file_url ? (
              <label className="admin-form__check">
                <input
                  type="checkbox"
                  checked={clearHeroImageUpload}
                  onChange={(e) => setClearHeroImageUpload(e.target.checked)}
                />
                <span>Remove the current uploaded image</span>
              </label>
            ) : null}
            <div className="admin-form__row">
              <label htmlFor="hero-image-url">Or use an image URL</label>
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
            {heroImagePreviewUrl ? (
              <div className="admin-form__row">
                <label>Crop</label>
                <FocalPointEditor
                  src={heroImagePreviewUrl}
                  x={Math.round(heroImageForm.header_image_focus_x)}
                  y={Math.round(heroImageForm.header_image_focus_y)}
                  onChange={(x, y) =>
                    setHeroImageForm((f) => ({ ...f, header_image_focus_x: x, header_image_focus_y: y }))
                  }
                />
              </div>
            ) : null}
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
            <AdminDropzone
              id="hero-video-upload"
              kind="video"
              accept="video/*"
              file={heroVideoFile}
              currentUrl={clearHeroVideoUpload ? null : heroVideoPreviewUrl}
              hint="short, muted loop, MP4"
              onFile={(f) => {
                setHeroVideoFile(f);
                if (f) setClearHeroVideoUpload(false);
              }}
            />
            {heroImageForm.header_video_file_url ? (
              <label className="admin-form__check">
                <input
                  type="checkbox"
                  checked={clearHeroVideoUpload}
                  onChange={(e) => setClearHeroVideoUpload(e.target.checked)}
                />
                <span>Remove the current uploaded video</span>
              </label>
            ) : null}
            <div className="admin-form__row">
              <label htmlFor="hero-video-url">Or use a video URL</label>
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
                The video autoplays on the public site. Keep an image set as the fallback.
              </p>
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

      </>)}

      {section === "music" && (<>
      {trackDrawerOpen && (
        <>
          <div className="drawer__overlay" onClick={closeTrackDrawer} aria-hidden />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label={editingSlug ? "Edit track" : "Add track"}>
            <div className="drawer__head">
              <h2>{editingSlug ? "edit track" : "add track"}</h2>
              <button type="button" className="drawer__close" onClick={closeTrackDrawer} aria-label="Close">
                ✕
              </button>
            </div>
            <form className="admin-form drawer__form" onSubmit={saveTrack}>
              <div className="drawer__scroll">
                <fieldset className="admin-group">
                  <legend>Basics</legend>
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
                      <label htmlFor="t-meta">Type</label>
                      <input
                        id="t-meta"
                        placeholder="e.g. Single, EP"
                        value={String(trackForm.meta)}
                        onChange={(e) => setTrackForm((f) => ({ ...f, meta: e.target.value }))}
                      />
                    </div>
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
                </fieldset>

                <fieldset className="admin-group">
                  <legend>Cover art</legend>
                  <AdminDropzone
                    id="t-art-file"
                    kind="image"
                    accept="image/*"
                    file={trackCoverFile}
                    currentUrl={clearTrackCover ? null : trackCoverPreviewUrl}
                    hint="square works best"
                    onFile={(f) => {
                      setTrackCoverFile(f);
                      if (f) setClearTrackCover(false);
                    }}
                  />
                  {coverArtWarning ? (
                    <p className="admin-form__hint admin-form__hint--warning">⚠ {coverArtWarning}</p>
                  ) : null}
                  <div className="admin-form__row">
                    <label htmlFor="t-art">Or use an image URL</label>
                    <input
                      id="t-art"
                      placeholder="Optional"
                      value={String(trackForm.art_url)}
                      onChange={(e) => setTrackForm((f) => ({ ...f, art_url: e.target.value }))}
                    />
                  </div>
                  {editingSlug ? (
                    <label className="admin-form__checkbox-label">
                      <input
                        type="checkbox"
                        checked={clearTrackCover}
                        onChange={(e) => {
                          setClearTrackCover(e.target.checked);
                          if (e.target.checked) setTrackCoverFile(null);
                        }}
                      />
                      <span>Remove the uploaded cover (use the URL or automatic art)</span>
                    </label>
                  ) : null}
                </fieldset>

                <fieldset className="admin-group">
                  <legend>Listen links</legend>
                  <div className="admin-form__row admin-form__row--2">
                    <div className="admin-form__row">
                      <label htmlFor="t-spotify">Spotify</label>
                      <input
                        id="t-spotify"
                        placeholder="https://open.spotify.com/track/…"
                        value={String(trackForm.spotify_url)}
                        onChange={(e) => setTrackForm((f) => ({ ...f, spotify_url: e.target.value }))}
                      />
                    </div>
                    <div className="admin-form__row">
                      <label htmlFor="t-am">Apple Music</label>
                      <input
                        id="t-am"
                        value={String(trackForm.apple_music_url)}
                        onChange={(e) => setTrackForm((f) => ({ ...f, apple_music_url: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="admin-form__row admin-form__row--2">
                    <div className="admin-form__row">
                      <label htmlFor="t-yt">YouTube</label>
                      <input
                        id="t-yt"
                        value={String(trackForm.youtube_url)}
                        onChange={(e) => setTrackForm((f) => ({ ...f, youtube_url: e.target.value }))}
                      />
                    </div>
                    <div className="admin-form__row">
                      <label htmlFor="t-link">Other link</label>
                      <input
                        id="t-link"
                        placeholder="Streaming or purchase"
                        value={String(trackForm.link_url)}
                        onChange={(e) => setTrackForm((f) => ({ ...f, link_url: e.target.value }))}
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="admin-group">
                  <legend>Release &amp; visibility</legend>
                  <label className="admin-form__checkbox-label">
                    <input
                      id="t-published"
                      type="checkbox"
                      checked={Number(trackForm.is_published) !== 0}
                      onChange={(e) =>
                        setTrackForm((f) => ({ ...f, is_published: e.target.checked ? 1 : 0 }))
                      }
                    />
                    <span>Published (visible on the public site)</span>
                  </label>
                  <label className="admin-form__checkbox-label">
                    <input
                      id="t-highlighted"
                      type="checkbox"
                      checked={Number(trackForm.is_highlighted) !== 0}
                      onChange={(e) =>
                        setTrackForm((f) => ({ ...f, is_highlighted: e.target.checked ? 1 : 0 }))
                      }
                    />
                    <span>Feature as the new release on the home page</span>
                  </label>
                  <label className="admin-form__checkbox-label">
                    <input
                      id="t-unreleased"
                      type="checkbox"
                      checked={Number(trackForm.is_unreleased) !== 0}
                      onChange={(e) =>
                        setTrackForm((f) => ({ ...f, is_unreleased: e.target.checked ? 1 : 0 }))
                      }
                    />
                    <span>Upcoming (shows a countdown page instead of the song page)</span>
                  </label>
                  {Number(trackForm.is_unreleased) !== 0 ? (
                    <div className="admin-form__row admin-form__row--2">
                      <div className="admin-form__row">
                        <label htmlFor="t-release-at">Release date &amp; time *</label>
                        <input
                          id="t-release-at"
                          type="datetime-local"
                          value={String(trackForm.release_at_local)}
                          onChange={(e) => setTrackForm((f) => ({ ...f, release_at_local: e.target.value }))}
                        />
                      </div>
                      <div className="admin-form__row">
                        <label htmlFor="t-presave">Pre-save URL</label>
                        <input
                          id="t-presave"
                          type="url"
                          placeholder="https://…"
                          value={String(trackForm.presave_url)}
                          onChange={(e) => setTrackForm((f) => ({ ...f, presave_url: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : null}
                  {Number(trackForm.is_unreleased) !== 0 ? (
                    <div className="admin-form__row">
                      <label htmlFor="t-accent">Accent colour for this track&rsquo;s countdown</label>
                      <div className="admin-accent">
                        <div className="admin-accent__swatches" role="group" aria-label="Preset colours">
                          {ACCENT_PRESETS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="admin-accent__swatch"
                              style={{ background: c }}
                              aria-label={`Use ${c}`}
                              aria-pressed={String(trackForm.accent_color).toLowerCase() === c}
                              onClick={() => setTrackForm((f) => ({ ...f, accent_color: c }))}
                            />
                          ))}
                        </div>
                        <input
                          id="t-accent"
                          type="color"
                          className="admin-accent__picker"
                          value={/^#[0-9a-f]{6}$/i.test(String(trackForm.accent_color)) ? String(trackForm.accent_color) : "#87ceeb"}
                          onChange={(e) => setTrackForm((f) => ({ ...f, accent_color: e.target.value }))}
                        />
                        <input
                          type="text"
                          className="admin-accent__hex"
                          placeholder="#87ceeb"
                          maxLength={7}
                          aria-label="Accent colour hex"
                          value={String(trackForm.accent_color)}
                          onChange={(e) => setTrackForm((f) => ({ ...f, accent_color: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="admin-btn"
                          disabled={!trackForm.accent_color}
                          onClick={() => setTrackForm((f) => ({ ...f, accent_color: "" }))}
                        >
                          Use site default
                        </button>
                      </div>
                      <p className="admin-form__hint">
                        Tints the buttons, markers and ticking seconds on this track&rsquo;s countdown page and its
                        &ldquo;coming soon&rdquo; block. Leave empty for the site&rsquo;s sky blue.
                      </p>
                    </div>
                  ) : null}
                  <div className="admin-form__row admin-form__row--2">
                    <div className="admin-form__row">
                      <label htmlFor="t-publish-at">Auto-publish at</label>
                      <input
                        id="t-publish-at"
                        type="datetime-local"
                        value={String(trackForm.publish_at_local)}
                        onChange={(e) => setTrackForm((f) => ({ ...f, publish_at_local: e.target.value }))}
                      />
                      <p className="admin-form__hint">Leave unpublished; it goes live at this time.</p>
                    </div>
                    <div className="admin-form__row">
                      <label htmlFor="t-highlighted-until">&ldquo;New&rdquo; tag expires</label>
                      <input
                        id="t-highlighted-until"
                        type="datetime-local"
                        value={String(trackForm.highlighted_until_local)}
                        onChange={(e) => setTrackForm((f) => ({ ...f, highlighted_until_local: e.target.value }))}
                      />
                      <p className="admin-form__hint">The tag clears itself after this date.</p>
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className="drawer__foot">
                <button type="submit" className="admin-btn admin-btn--primary">
                  {editingSlug ? "Save changes" : "Create track"}
                </button>
                <button type="button" className="admin-btn" onClick={closeTrackDrawer}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      <div className="admin-card">
        <div className="admin-tracks-head">
          <h2 className="admin-card__title">tracks</h2>
          <button type="button" className="admin-btn admin-btn--primary" onClick={openNewTrack}>
            + Add track
          </button>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className="admin-btn"
            disabled={seedingTracks}
            title="Creates missing tracks and fills in any empty descriptions, years, or streaming links for the 5 original tracks"
            onClick={async () => {
              setSeedingTracks(true);
              try {
                const result = await seedTracks();
                const { created = 0, updated = 0 } = result;
                notify("ok", result.message ?? `${created} created, ${updated} restored`);
                const refreshed = await fetchTracksAuth();
                setTracks(refreshed);
              } catch (err) {
                notify("error", err instanceof Error ? err.message : "Seed failed");
              } finally {
                setSeedingTracks(false);
              }
            }}
          >
            {seedingTracks ? "Loading…" : "Restore original track details"}
          </button>
        </div>
        <AdminSortableList
          items={sortedTracks}
          getKey={(t) => t.id}
          getLabel={(t) => t.title}
          onMove={(from, to) => void reorderTrackRowsBySlug(sortedTracks[from].slug, sortedTracks[to].slug)}
          renderItem={(t) => {
            const art = getTrackArtUrl(t);
            return (
              <>
                {art ? <img className="sortable__thumb" src={art} alt="" loading="lazy" /> : <span className="sortable__thumb" />}
                <div className="sortable__text">
                  <Link draggable={false} to={`/music/${t.slug}`} className="sortable__title">
                    {t.title}
                  </Link>
                  <div className="sortable__sub">
                    {t.year ? <span>{t.year}</span> : null}
                    <span className={`sortable__chip${t.is_published === false ? " sortable__chip--warn" : ""}`}>
                      {t.is_published === false ? "draft" : "live"}
                    </span>
                    {t.is_unreleased ? <span className="sortable__chip sortable__chip--accent">upcoming</span> : null}
                    {t.is_highlighted ? <span className="sortable__chip sortable__chip--accent">featured</span> : null}
                  </div>
                </div>
              </>
            );
          }}
          renderActions={(t) => (
            <>
              <button type="button" className="admin-btn" aria-label={`Edit ${t.title}`} onClick={() => startEditTrack(t)}>
                <span className="admin-btn__icon"><PencilIcon /></span>
                <span className="admin-btn__label">Edit</span>
              </button>
              <button type="button" className="admin-btn admin-btn--danger" aria-label={`Delete ${t.title}`} onClick={() => void handleDeleteTrack(t.slug)}>
                <span className="admin-btn__icon"><TrashIcon /></span>
                <span className="admin-btn__label">Delete</span>
              </button>
            </>
          )}
          empty={<p className="sortable__empty">No tracks yet.</p>}
        />
      </div>

      </>)}

      {section === "media" && (<>
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
        <AdminSortableList
          items={sortedVideos}
          getKey={(v) => v.id}
          getLabel={(v) => v.title || v.youtube_id}
          onMove={(from, to) => void reorderVideosById(sortedVideos[from].id, sortedVideos[to].id)}
          renderItem={(v) => (
            <>
              <img className="sortable__thumb sortable__thumb--wide" src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" loading="lazy" />
              <div className="sortable__text">
                <span className="sortable__title">{v.title || "Untitled video"}</span>
                <div className="sortable__sub">
                  <span>{v.youtube_id}</span>
                </div>
              </div>
            </>
          )}
          renderActions={(v) => (
            <>
              <button type="button" className="admin-btn" aria-label={`Edit ${v.title || v.youtube_id}`} onClick={() => startEditVideo(v)}>
                <span className="admin-btn__icon"><PencilIcon /></span>
                <span className="admin-btn__label">Edit</span>
              </button>
              <button type="button" className="admin-btn admin-btn--danger" aria-label={`Delete ${v.title || v.youtube_id}`} onClick={() => void handleDeleteVideo(v.id)}>
                <span className="admin-btn__icon"><TrashIcon /></span>
                <span className="admin-btn__label">Delete</span>
              </button>
            </>
          )}
          empty={<p className="sortable__empty">No featured videos yet.</p>}
        />
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">{editingGalleryId != null ? "Edit image" : "Add image"}</h2>
        <p className="admin-card__lead">
          Upload images for the public image gallery section. They display in a Pinterest-style masonry grid.
        </p>
        <form className="admin-form" onSubmit={saveGalleryImage}>
          <div className="admin-form__row">
            <label htmlFor="g-file">Image {editingGalleryId == null ? "*" : "(optional to replace)"}</label>
            <AdminDropzone
              id="g-file"
              kind="image"
              accept="image/*"
              file={galleryFile}
              onFile={setGalleryFile}
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
        <AdminSortableList
          items={sortedGalleryImages}
          getKey={(g) => g.id}
          getLabel={(g) => g.caption || `image ${g.id}`}
          onMove={(from, to) => void reorderGalleryById(sortedGalleryImages[from].id, sortedGalleryImages[to].id)}
          renderItem={(g) => (
            <>
              <img className="sortable__thumb" src={g.image_url || g.image} alt="" loading="lazy" />
              <div className="sortable__text">
                <span className="sortable__title">{g.caption || "No caption"}</span>
                <div className="sortable__sub">
                  <a href={g.image_url || g.image} target="_blank" rel="noreferrer" draggable={false}>open full size ↗</a>
                </div>
              </div>
            </>
          )}
          renderActions={(g) => (
            <>
              <button type="button" className="admin-btn" aria-label={`Edit image ${g.id}`} onClick={() => startEditGalleryImage(g)}>
                <span className="admin-btn__icon"><PencilIcon /></span>
                <span className="admin-btn__label">Edit</span>
              </button>
              <button type="button" className="admin-btn admin-btn--danger" aria-label={`Delete image ${g.id}`} onClick={() => void handleDeleteGalleryImage(g.id)}>
                <span className="admin-btn__icon"><TrashIcon /></span>
                <span className="admin-btn__label">Delete</span>
              </button>
            </>
          )}
          empty={<p className="sortable__empty">No gallery images yet.</p>}
        />
      </div>

      </>)}

      {section === "pages" && (<>
      <AdminAboutPanel notify={notify} />
      <AdminShowsPanel notify={notify} />

      </>)}

      {section === "audience" && (<>
      {/* ── Mailing list ───────────────────────────────────────────── */}
      <div className="admin-page__toolbar">
        <div className="admin-page__toolbar-label">
          <p>.mailing list</p>
          <span className="admin-page__toolbar-line" aria-hidden />
        </div>
        <div className="admin-page__actions">
          <a
            href="/api/admin/mailing-list?format=csv"
            className="admin-btn"
            download
          >
            Export CSV
          </a>
          <button
            type="button"
            className="admin-btn"
            onClick={() => void loadMailingList()}
            disabled={mlLoading}
          >
            {mlLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Subscribers: a short preview here, the full searchable list on its own view */}
      {subsFullView ? (
        <div className="admin-card">
          <button type="button" className="admin-back" onClick={() => setSubsFullView(false)}>
            <span aria-hidden>←</span> back to audience
          </button>
          <h2 className="admin-card__title">
            all subscribers{mlCount !== null ? ` — ${mlCount}` : ""}
          </h2>
          <div className="admin-subs-tools">
            <input
              type="search"
              className="admin-subs-search"
              placeholder="Search name or email…"
              value={subsQuery}
              onChange={(e) => {
                setSubsQuery(e.target.value);
                setSubsPage(1);
              }}
              aria-label="Search subscribers"
            />
            <span className="admin-subs-tools__count">
              {subsFiltered.length} {subsFiltered.length === 1 ? "result" : "results"}
            </span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mlLoading ? (
                  <tr><td colSpan={4}>Loading…</td></tr>
                ) : subsSlice.length === 0 ? (
                  <tr><td colSpan={4}>{subsQ ? "No one matches that search." : "No subscribers yet."}</td></tr>
                ) : (
                  subsSlice.map(renderSubscriberRow)
                )}
              </tbody>
            </table>
          </div>
          {subsPages > 1 ? (
            <div className="admin-pager">
              <button
                type="button"
                className="admin-btn"
                disabled={subsPageSafe <= 1}
                onClick={() => setSubsPage(subsPageSafe - 1)}
              >
                ← Prev
              </button>
              <span className="admin-pager__label">
                Page {subsPageSafe} of {subsPages}
              </span>
              <button
                type="button"
                className="admin-btn"
                disabled={subsPageSafe >= subsPages}
                onClick={() => setSubsPage(subsPageSafe + 1)}
              >
                Next →
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="admin-card">
          <h2 className="admin-card__title">
            subscribers{mlCount !== null ? ` — ${mlCount}` : ""}
          </h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mlLoading ? (
                  <tr><td colSpan={4}>Loading…</td></tr>
                ) : mlSubscribers.length === 0 ? (
                  <tr><td colSpan={4}>No subscribers yet.</td></tr>
                ) : (
                  mlSubscribers.slice(0, SUBSCRIBER_PREVIEW).map(renderSubscriberRow)
                )}
              </tbody>
            </table>
          </div>
          {mlSubscribers.length > SUBSCRIBER_PREVIEW ? (
            <div className="admin-more">
              <span>
                Showing {SUBSCRIBER_PREVIEW} of {mlSubscribers.length}
              </span>
              <button type="button" className="admin-btn" onClick={() => setSubsFullView(true)}>
                View all subscribers →
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Broadcast form */}
      <div className="admin-card">
        <h2 className="admin-card__title">broadcast email</h2>
        <p className="admin-card__lead">
          Sends to all {mlCount !== null ? <strong>{mlCount}</strong> : "…"} subscribers via Resend.
          Write in plain text — double line breaks become paragraphs.
        </p>
        <form className="admin-form" onSubmit={(e) => void handleBroadcast(e)}>
          <div className="admin-form__row">
            <label htmlFor="bc-subject">Subject</label>
            <input
              id="bc-subject"
              type="text"
              value={broadcastSubject}
              onChange={(e) => setBroadcastSubject(e.target.value)}
              placeholder="new music, updates, etc."
              required
            />
          </div>
          <div className="admin-form__row">
            <label htmlFor="bc-body">Message</label>
            <textarea
              id="bc-body"
              rows={10}
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder={"hey everyone,\n\n..."}
              required
            />
          </div>
          <div className="admin-page__actions" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={broadcastSending || !broadcastSubject.trim() || !broadcastBody.trim()}
            >
              {broadcastSending
                ? "Sending…"
                : `Send to ${mlCount ?? "…"} subscriber${mlCount === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setBroadcastPreviewOpen((v) => !v)}
              disabled={!broadcastBody.trim()}
            >
              {broadcastPreviewOpen ? "Hide preview" : "Preview email"}
            </button>
          </div>
        </form>
        {broadcastPreviewOpen && broadcastBody.trim() ? (
          <div className="admin-broadcast-preview">
            <p className="admin-broadcast-preview__label">
              Email preview — subject: <strong>{broadcastSubject || "(no subject)"}</strong>
            </p>
            <iframe
              className="admin-broadcast-preview__frame"
              srcDoc={buildBroadcastHtml(broadcastBody)}
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
        ) : null}
      </div>
      </>)}
        </main>
      </div>
    </div>
    </>
  );
}
