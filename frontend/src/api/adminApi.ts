import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import type { GalleryImage } from "../types/galleryImage";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import type { LiveShow } from "../types/liveShow";
import type { AboutContent } from "../types/aboutContent";
import { fetchLive } from "./fetchLive";

const ADMIN_FETCH: RequestInit = { credentials: "include" };

async function guardJson<T>(res: Response, resource: string): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  const text = (await res.text()).trim();
  let detail = text.slice(0, 400);
  try {
    const j = JSON.parse(text) as { detail?: string; message?: string };
    if (typeof j.detail === "string" && j.detail) detail = j.detail;
    else if (typeof j.message === "string" && j.message) detail = j.message;
  } catch { /* keep slice */ }
  if (res.status === 401) {
    throw new Error(`Unauthorized loading ${resource}. Sign out and sign in again.`);
  }
  throw new Error(`Failed to load ${resource} (HTTP ${res.status}): ${detail || res.statusText}`);
}

/**
 * Upload a File directly to Cloudinary. Returns the public secure URL.
 * Uses XHR (not fetch) so real upload progress (0-100) can be reported as the bytes go out.
 */
async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim();
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "File uploads not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to the Vercel project env vars."
    );
  }

  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and try again."));
    xhr.onload = () => {
      let data: { secure_url?: string; error?: { message?: string } } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to the generic error below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
        onProgress?.(100);
        resolve(data.secure_url);
      } else {
        reject(new Error(data.error?.message ?? `Upload failed (HTTP ${xhr.status})`));
      }
    };
    xhr.send(form);
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(password: string): Promise<void> {
  const res = await fetchLive("/api/admin/auth", {
    ...ADMIN_FETCH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Login failed (HTTP ${res.status})`);
  }
}

export async function logout(): Promise<void> {
  await fetchLive("/api/admin/auth", { ...ADMIN_FETCH, method: "DELETE" });
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetchLive("/api/admin/auth", ADMIN_FETCH);
    return res.ok;
  } catch {
    return false;
  }
}

// ── Tracks ────────────────────────────────────────────────────────────────────

export async function fetchTracksAuth(req?: RequestInit): Promise<Track[]> {
  const res = await fetchLive("/api/admin/tracks", { ...ADMIN_FETCH, ...req });
  return guardJson<Track[]>(res, "tracks");
}

export async function createTrack(body: Partial<Track>): Promise<Track> {
  const res = await fetchLive("/api/admin/tracks", {
    ...ADMIN_FETCH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateTrack(slug: string, body: Partial<Track>): Promise<Track> {
  const res = await fetchLive(`/api/admin/tracks?slug=${encodeURIComponent(slug)}`, {
    ...ADMIN_FETCH,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function patchTrackCoverArt(slug: string, file: File, onProgress?: (pct: number) => void): Promise<Track> {
  const url = await uploadFile(file, onProgress);
  return updateTrack(slug, { art_url: url });
}

export async function clearTrackCoverArt(slug: string): Promise<Track> {
  return updateTrack(slug, { art_url: "" });
}

export async function deleteTrack(slug: string): Promise<void> {
  const res = await fetchLive(`/api/admin/tracks?slug=${encodeURIComponent(slug)}`, {
    ...ADMIN_FETCH,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function seedTracks(): Promise<{ seeded: number; created?: number; updated?: number; log?: string[]; message?: string }> {
  const res = await fetchLive("/api/admin/tracks?action=seed", {
    ...ADMIN_FETCH,
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Seed failed (HTTP ${res.status})`);
  }
  return res.json();
}

// ── Featured videos ───────────────────────────────────────────────────────────

export async function fetchFeaturedVideosAuth(req?: RequestInit): Promise<FeaturedVideo[]> {
  const res = await fetchLive("/api/admin/featured-videos", { ...ADMIN_FETCH, ...req });
  return guardJson<FeaturedVideo[]>(res, "featured videos");
}

export async function createFeaturedVideo(
  body: Pick<FeaturedVideo, "title" | "youtube_id" | "order">
): Promise<FeaturedVideo> {
  const res = await fetchLive("/api/admin/featured-videos", {
    ...ADMIN_FETCH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateFeaturedVideo(
  id: number,
  body: Partial<Pick<FeaturedVideo, "title" | "youtube_id" | "order">>
): Promise<FeaturedVideo> {
  const res = await fetchLive(`/api/admin/featured-videos?id=${id}`, {
    ...ADMIN_FETCH,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function deleteFeaturedVideo(id: number): Promise<void> {
  const res = await fetchLive(`/api/admin/featured-videos?id=${id}`, {
    ...ADMIN_FETCH,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

// ── Release countdown ─────────────────────────────────────────────────────────

export async function fetchReleaseCountdownAuth(req?: RequestInit): Promise<ReleaseCountdown> {
  const res = await fetchLive("/api/admin/release-countdown", { ...ADMIN_FETCH, ...req });
  return guardJson<ReleaseCountdown>(res, "release countdown");
}

export async function updateReleaseCountdown(
  body: Partial<Pick<ReleaseCountdown, "enabled" | "song_title" | "release_at" | "presave_url">>
): Promise<ReleaseCountdown> {
  const res = await fetchLive("/api/admin/release-countdown", {
    ...ADMIN_FETCH,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateHeroHeader(payload: {
  header_image_url?: string;
  header_image_crop?: ReleaseCountdown["header_image_crop"];
  header_image_focus_x?: number;
  header_image_focus_y?: number;
  header_image_file?: File | null;
  clear_header_image_file?: boolean;
  header_video_url?: string;
  header_video_file?: File | null;
  clear_header_video_file?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<ReleaseCountdown> {
  const patch: Record<string, unknown> = {};

  if (payload.header_image_url !== undefined) patch.header_image_url = payload.header_image_url;
  if (payload.header_image_crop !== undefined) patch.header_image_crop = payload.header_image_crop;
  if (payload.header_image_focus_x !== undefined) patch.header_image_focus_x = payload.header_image_focus_x;
  if (payload.header_image_focus_y !== undefined) patch.header_image_focus_y = payload.header_image_focus_y;
  if (payload.header_video_url !== undefined) patch.header_video_url = payload.header_video_url;

  if (payload.clear_header_image_file) patch.header_image_file_url = "";
  if (payload.clear_header_video_file) patch.header_video_file_url = "";

  if (payload.header_image_file) {
    patch.header_image_file_url = await uploadFile(payload.header_image_file, payload.onProgress);
  }
  if (payload.header_video_file) {
    patch.header_video_file_url = await uploadFile(payload.header_video_file, payload.onProgress);
  }

  const res = await fetchLive("/api/admin/release-countdown", {
    ...ADMIN_FETCH,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

// ── Gallery images ────────────────────────────────────────────────────────────

export async function fetchGalleryImagesAuth(req?: RequestInit): Promise<GalleryImage[]> {
  const res = await fetchLive("/api/admin/gallery-images", { ...ADMIN_FETCH, ...req });
  return guardJson<GalleryImage[]>(res, "gallery images");
}

export async function createGalleryImage(
  payload: { image: File; caption?: string; order?: number; onProgress?: (pct: number) => void }
): Promise<GalleryImage> {
  const image_url = await uploadFile(payload.image, payload.onProgress);
  const res = await fetchLive("/api/admin/gallery-images", {
    ...ADMIN_FETCH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url, caption: payload.caption ?? "", order: payload.order ?? 0 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateGalleryImage(
  id: number,
  payload: { image?: File | null; caption?: string; order?: number; onProgress?: (pct: number) => void }
): Promise<GalleryImage> {
  const body: Record<string, unknown> = {};
  if (payload.image) body.image_url = await uploadFile(payload.image, payload.onProgress);
  if (payload.caption !== undefined) body.caption = payload.caption;
  if (payload.order !== undefined) body.order = payload.order;

  const res = await fetchLive(`/api/admin/gallery-images?id=${id}`, {
    ...ADMIN_FETCH,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function deleteGalleryImage(id: number): Promise<void> {
  const res = await fetchLive(`/api/admin/gallery-images?id=${id}`, {
    ...ADMIN_FETCH,
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`);
}

/** Upload an image or video to Cloudinary and return its public URL. */
export async function uploadMedia(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return uploadFile(file, onProgress);
}

// ── Live shows ────────────────────────────────────────────────────────────────

export type LiveShowPayload = Pick<LiveShow, "starts_at" | "title" | "venue" | "city" | "ticket_url" | "note" | "is_sold_out" | "flyer_url">;

/** Prefer the server's { message } over a raw JSON dump. */
async function failMessage(res: Response, fallback: string): Promise<Error> {
  const err = (await res.json().catch(() => ({}))) as { message?: string };
  return new Error(err.message || `${fallback} (HTTP ${res.status})`);
}

export async function fetchShowsAuth(req?: RequestInit): Promise<LiveShow[]> {
  const res = await fetchLive("/api/admin/shows", { ...ADMIN_FETCH, ...req });
  return guardJson<LiveShow[]>(res, "shows");
}

export async function createShow(body: LiveShowPayload): Promise<LiveShow> {
  const res = await fetchLive("/api/admin/shows", {
    ...ADMIN_FETCH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failMessage(res, "Could not add show");
  return res.json();
}

export async function updateShow(id: number, body: Partial<LiveShowPayload>): Promise<LiveShow> {
  const res = await fetchLive(`/api/admin/shows?id=${id}`, {
    ...ADMIN_FETCH,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failMessage(res, "Could not update show");
  return res.json();
}

export async function deleteShow(id: number): Promise<void> {
  const res = await fetchLive(`/api/admin/shows?id=${id}`, { ...ADMIN_FETCH, method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`);
}

// ── About section ─────────────────────────────────────────────────────────────

export async function fetchAboutAuth(req?: RequestInit): Promise<AboutContent> {
  const res = await fetchLive("/api/admin/about", { ...ADMIN_FETCH, ...req });
  return guardJson<AboutContent>(res, "about content");
}

export async function updateAbout(payload: {
  heading: string;
  body: string;
  booking_email: string;
  portrait?: File | null;
  removePortrait?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<AboutContent> {
  const body: Record<string, unknown> = {
    heading: payload.heading,
    body: payload.body,
    booking_email: payload.booking_email,
  };
  if (payload.portrait) body.portrait_url = await uploadFile(payload.portrait, payload.onProgress);
  else if (payload.removePortrait) body.portrait_url = "";

  const res = await fetchLive("/api/admin/about", {
    ...ADMIN_FETCH,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failMessage(res, "Could not save About section");
  return res.json();
}

// ── Mailing list ──────────────────────────────────────────────────────────────

export type MailingListSubscriber = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  subscribed_at: string;
};

export async function fetchMailingListSubscribers(): Promise<{
  count: number;
  subscribers: MailingListSubscriber[];
}> {
  const res = await fetchLive("/api/admin/mailing-list", ADMIN_FETCH);
  return guardJson<{ count: number; subscribers: MailingListSubscriber[] }>(res, "subscribers");
}

export async function broadcastEmail(
  payload: { subject: string; html: string; text?: string }
): Promise<{ sent: number }> {
  const res = await fetchLive("/api/admin/mailing-list", {
    ...ADMIN_FETCH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Broadcast failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function deleteSubscriber(id: number): Promise<void> {
  const res = await fetchLive(`/api/admin/mailing-list?id=${id}`, {
    ...ADMIN_FETCH,
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`);
}

export async function fetchInsights(days: number): Promise<import("../types/insights").Insights> {
  const res = await fetchLive(`/api/admin/release-countdown?resource=insights&days=${days}&_=${Date.now()}`, { ...ADMIN_FETCH, cache: "no-store" });
  return guardJson(res, "insights");
}

// ── Home story order ─────────────────────────────────────────────────────────

export async function fetchStoryConfigAuth(): Promise<import("../utils/storySlides").StoryConfig> {
  const res = await fetchLive("/api/admin/story", ADMIN_FETCH);
  return guardJson(res, "story order");
}

export async function saveStoryConfig(
  cfg: import("../utils/storySlides").StoryConfig
): Promise<import("../utils/storySlides").StoryConfig> {
  const res = await fetchLive("/api/admin/story", {
    ...ADMIN_FETCH,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg),
  });
  if (!res.ok) throw await failMessage(res, "Could not save story order");
  return res.json();
}
