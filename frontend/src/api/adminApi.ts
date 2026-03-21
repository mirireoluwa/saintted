import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

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

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { non_field_errors?: string[] }).non_field_errors?.[0] || "Login failed");
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function fetchTracksAuth(token: string): Promise<Track[]> {
  const res = await fetch(`${API_BASE}/tracks/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load tracks");
  return res.json();
}

export async function createTrack(token: string, body: Partial<Track>): Promise<Track> {
  const res = await fetch(`${API_BASE}/tracks/`, {
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
  const res = await fetch(`${API_BASE}/tracks/${encodeURIComponent(slug)}/`, {
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

export async function deleteTrack(token: string, slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tracks/${encodeURIComponent(slug)}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function fetchFeaturedVideosAuth(token: string): Promise<FeaturedVideo[]> {
  const res = await fetch(`${API_BASE}/featured-videos/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load featured videos");
  return res.json();
}

export async function createFeaturedVideo(
  token: string,
  body: Pick<FeaturedVideo, "title" | "youtube_id" | "order">
): Promise<FeaturedVideo> {
  const res = await fetch(`${API_BASE}/featured-videos/`, {
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
  const res = await fetch(`${API_BASE}/featured-videos/${id}/`, {
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
  const res = await fetch(`${API_BASE}/featured-videos/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}
