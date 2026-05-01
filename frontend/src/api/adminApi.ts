import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import type { GalleryImage } from "../types/galleryImage";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import { getApiBase } from "../utils/apiBase";
import { fetchLive } from "./fetchLive";

const API_BASE = getApiBase();

const TOKEN_KEY = "saintted_admin_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Token ${token}`,
  };
}

/** Parse list/detail responses; surface HTTP status (e.g. 401 stale token after DB reset). */
async function guardAuthJson<T>(res: Response, resource: string): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  const text = (await res.text()).trim();
  let detail = text.slice(0, 400);
  try {
    const j = JSON.parse(text) as { detail?: string };
    if (typeof j.detail === "string" && j.detail) detail = j.detail;
  } catch {
    /* keep slice */
  }
  if (res.status === 401) {
    throw new Error(
      `Unauthorized (HTTP 401) loading ${resource}. Your saved token is no longer valid (common after a database reset or migrate). Use Log out, then sign in again.`,
    );
  }
  throw new Error(`Failed to load ${resource} (HTTP ${res.status}): ${detail || res.statusText}`);
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetchLive(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { non_field_errors?: string[] }).non_field_errors?.[0];
    throw new Error(
      msg || `Login failed (HTTP ${res.status}). Check VITE_API_URL ends with /api and matches your deployed API base URL.`,
    );
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function resetAdminPassword(
  username: string,
  resetSecret?: string
): Promise<{ username: string; new_password: string; detail: string }> {
  const res = await fetchLive(`${API_BASE}/auth/reset-password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      ...(resetSecret ? { reset_secret: resetSecret } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      (err as { detail?: string }).detail || `Password reset failed (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchTracksAuth(token: string, req?: RequestInit): Promise<Track[]> {
  const res = await fetchLive(`${API_BASE}/tracks/`, {
    ...req,
    headers: authHeaders(token),
  });
  return guardAuthJson<Track[]>(res, "tracks");
}

export async function createTrack(token: string, body: Partial<Track>): Promise<Track> {
  const res = await fetchLive(`${API_BASE}/tracks/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateTrack(
  token: string,
  slug: string,
  body: Partial<Track>
): Promise<Track> {
  const res = await fetchLive(`${API_BASE}/tracks/${encodeURIComponent(slug)}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

/** PATCH cover only (multipart). Call after JSON create/update for metadata. */
export async function patchTrackCoverArt(token: string, slug: string, file: File): Promise<Track> {
  const body = new FormData();
  body.set("art_file", file);
  const res = await fetchLive(`${API_BASE}/tracks/${encodeURIComponent(slug)}/`, {
    method: "PATCH",
    headers: { Authorization: `Token ${token}` },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function clearTrackCoverArt(token: string, slug: string): Promise<Track> {
  const body = new FormData();
  body.set("clear_art_file", "true");
  const res = await fetchLive(`${API_BASE}/tracks/${encodeURIComponent(slug)}/`, {
    method: "PATCH",
    headers: { Authorization: `Token ${token}` },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function deleteTrack(token: string, slug: string): Promise<void> {
  const res = await fetchLive(`${API_BASE}/tracks/${encodeURIComponent(slug)}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function fetchFeaturedVideosAuth(
  token: string,
  req?: RequestInit,
): Promise<FeaturedVideo[]> {
  const res = await fetchLive(`${API_BASE}/featured-videos/`, {
    ...req,
    headers: authHeaders(token),
  });
  return guardAuthJson<FeaturedVideo[]>(res, "featured videos");
}

export async function createFeaturedVideo(
  token: string,
  body: Pick<FeaturedVideo, "title" | "youtube_id" | "order">
): Promise<FeaturedVideo> {
  const res = await fetchLive(`${API_BASE}/featured-videos/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateFeaturedVideo(
  token: string,
  id: number,
  body: Partial<Pick<FeaturedVideo, "title" | "youtube_id" | "order">>
): Promise<FeaturedVideo> {
  const res = await fetchLive(`${API_BASE}/featured-videos/${id}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function deleteFeaturedVideo(token: string, id: number): Promise<void> {
  const res = await fetchLive(`${API_BASE}/featured-videos/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function fetchReleaseCountdownAuth(
  token: string,
  req?: RequestInit,
): Promise<ReleaseCountdown> {
  const res = await fetchLive(`${API_BASE}/release-countdown/`, {
    ...req,
    headers: authHeaders(token),
  });
  return guardAuthJson<ReleaseCountdown>(res, "release countdown");
}

export async function fetchGalleryImagesAuth(
  token: string,
  req?: RequestInit,
): Promise<GalleryImage[]> {
  const res = await fetchLive(`${API_BASE}/gallery-images/`, {
    ...req,
    headers: authHeaders(token),
  });
  return guardAuthJson<GalleryImage[]>(res, "gallery images");
}

export async function updateReleaseCountdown(
  token: string,
  body: Partial<Pick<ReleaseCountdown, "enabled" | "song_title" | "release_at" | "presave_url">>
): Promise<ReleaseCountdown> {
  const res = await fetchLive(`${API_BASE}/release-countdown/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateHeroHeader(
  token: string,
  payload: {
    header_image_url?: string;
    header_image_crop?: ReleaseCountdown["header_image_crop"];
    header_image_focus_x?: number;
    header_image_focus_y?: number;
    header_image_file?: File | null;
    clear_header_image_file?: boolean;
    header_video_url?: string;
    header_video_file?: File | null;
    clear_header_video_file?: boolean;
  }
): Promise<ReleaseCountdown> {
  const body = new FormData();
  if (payload.header_image_url !== undefined) {
    body.set("header_image_url", payload.header_image_url);
  }
  if (payload.header_image_crop !== undefined) {
    body.set("header_image_crop", payload.header_image_crop);
  }
  if (payload.header_image_focus_x !== undefined) {
    body.set("header_image_focus_x", String(payload.header_image_focus_x));
  }
  if (payload.header_image_focus_y !== undefined) {
    body.set("header_image_focus_y", String(payload.header_image_focus_y));
  }
  if (payload.header_image_file) {
    body.set("header_image_file", payload.header_image_file);
  }
  if (payload.clear_header_image_file) {
    body.set("clear_header_image_file", "true");
  }
  if (payload.header_video_url !== undefined) {
    body.set("header_video_url", payload.header_video_url);
  }
  if (payload.header_video_file) {
    body.set("header_video_file", payload.header_video_file);
  }
  if (payload.clear_header_video_file) {
    body.set("clear_header_video_file", "true");
  }

  const res = await fetchLive(`${API_BASE}/release-countdown/`, {
    method: "PATCH",
    headers: { Authorization: `Token ${token}` },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function createGalleryImage(
  token: string,
  payload: { image: File; caption?: string; order?: number }
): Promise<GalleryImage> {
  const body = new FormData();
  body.set("image", payload.image);
  body.set("caption", payload.caption ?? "");
  body.set("order", String(payload.order ?? 0));
  const res = await fetchLive(`${API_BASE}/gallery-images/`, {
    method: "POST",
    headers: { Authorization: `Token ${token}` },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateGalleryImage(
  token: string,
  id: number,
  payload: { image?: File | null; caption?: string; order?: number }
): Promise<GalleryImage> {
  const body = new FormData();
  if (payload.image) body.set("image", payload.image);
  if (payload.caption !== undefined) body.set("caption", payload.caption);
  if (payload.order !== undefined) body.set("order", String(payload.order));
  const res = await fetchLive(`${API_BASE}/gallery-images/${id}/`, {
    method: "PATCH",
    headers: { Authorization: `Token ${token}` },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function deleteGalleryImage(token: string, id: number): Promise<void> {
  const res = await fetchLive(`${API_BASE}/gallery-images/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}

export type MailingListSubscriber = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  subscribed_at: string;
};

export async function fetchMailingListSubscribers(
  token: string,
): Promise<{ count: number; subscribers: MailingListSubscriber[] }> {
  const res = await fetchLive(`${API_BASE}/mailing-list/subscribers/`, {
    headers: authHeaders(token),
  });
  return guardAuthJson<{ count: number; subscribers: MailingListSubscriber[] }>(res, "subscribers");
}

export async function broadcastEmail(
  token: string,
  payload: { subject: string; html: string; text?: string },
): Promise<{ sent: number }> {
  const res = await fetchLive(`${API_BASE}/mailing-list/broadcast/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: string }).error || `Broadcast failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteSubscriber(token: string, id: number): Promise<void> {
  const res = await fetchLive(`${API_BASE}/mailing-list/subscribers/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`);
}
