import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function fetchTracks(): Promise<Track[]> {
  const res = await fetch(`${API_BASE}/tracks/`);
  if (!res.ok) throw new Error("Failed to fetch tracks");
  const data = await res.json();
  return data;
}

export async function fetchTrackBySlug(slug: string): Promise<Track> {
  const res = await fetch(`${API_BASE}/tracks/${encodeURIComponent(slug)}/`);
  if (!res.ok) throw new Error("Track not found");
  const data = await res.json();
  return data;
}

export async function fetchFeaturedVideos(): Promise<FeaturedVideo[]> {
  const res = await fetch(`${API_BASE}/featured-videos/`);
  if (!res.ok) return [];
  const data = await res.json();
  return data;
}
