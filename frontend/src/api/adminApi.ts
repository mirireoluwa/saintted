import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import type { GalleryImage } from "../types/galleryImage";
import type { ReleaseCountdown } from "../types/releaseCountdown";
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

/** Upload a File to Vercel Blob via /api/admin/upload. Returns the public URL. */
async function uploadFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const res = await fetchLive("/api/admin/upload", {
    ...ADMIN_FETCH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, dataUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Upload failed (HTTP ${res.status})`);
  }
  const data = await res.json() as { url: string };
  return data.url;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(password: string): Promise<void> {
  const res = await fetchLive("/api/admin/auth/login", {
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
  await fetchLive("/api/admin/auth/logout", { ...ADMIN_FETCH, method: "POST" });
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetchLive("/api/admin/auth/session", ADMIN_FETCH);
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
  const res = await fetchLive(`/api/admin/tracks/${encodeURIComponent(slug)}`, {
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

export async function patchTrackCoverArt(slug: string, file: File): Promise<Track> {
  const url = await uploadFile(file);
  return updateTrack(slug, { art_url: url });
}

export async function clearTrackCoverArt(slug: string): Promise<Track> {
  return updateTrack(slug, { art_url: "" });
}

export async function deleteTrack(slug: string): Promise<void> {
  const res = await fetchLive(`/api/admin/tracks/${encodeURIComponent(slug)}`, {
    ...ADMIN_FETCH,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
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
  const res = await fetchLive(`/api/admin/featured-videos/${id}`, {
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
  const res = await fetchLive(`/api/admin/featured-videos/${id}`, {
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
    patch.header_image_file_url = await uploadFile(payload.header_image_file);
  }
  if (payload.header_video_file) {
    patch.header_video_file_url = await uploadFile(payload.header_video_file);
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
  payload: { image: File; caption?: string; order?: number }
): Promise<GalleryImage> {
  const image_url = await uploadFile(payload.image);
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
  payload: { image?: File | null; caption?: string; order?: number }
): Promise<GalleryImage> {
  const body: Record<string, unknown> = {};
  if (payload.image) body.image_url = await uploadFile(payload.image);
  if (payload.caption !== undefined) body.caption = payload.caption;
  if (payload.order !== undefined) body.order = payload.order;

  const res = await fetchLive(`/api/admin/gallery-images/${id}`, {
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
  const res = await fetchLive(`/api/admin/gallery-images/${id}`, {
    ...ADMIN_FETCH,
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`);
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
  const res = await fetchLive("/api/admin/mailing-list/subscribers", ADMIN_FETCH);
  return guardJson<{ count: number; subscribers: MailingListSubscriber[] }>(res, "subscribers");
}

export async function broadcastEmail(
  payload: { subject: string; html: string; text?: string }
): Promise<{ sent: number }> {
  const res = await fetchLive("/api/admin/mailing-list/broadcast", {
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
  const res = await fetchLive(`/api/admin/mailing-list/subscribers/${id}`, {
    ...ADMIN_FETCH,
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`);
}
