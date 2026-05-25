import type { Track } from "../types/track";
import type { FeaturedVideo } from "../types/featuredVideo";
import type { GalleryImage } from "../types/galleryImage";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import { fetchLive } from "./fetchLive";

export async function fetchTracks(): Promise<Track[]> {
  const res = await fetchLive("/api/tracks");
  if (!res.ok) throw new Error("Failed to fetch tracks");
  return res.json();
}

export async function fetchTrackBySlug(slug: string): Promise<Track> {
  const res = await fetchLive(`/api/tracks/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error("Track not found");
  return res.json();
}

export async function fetchFeaturedVideos(): Promise<FeaturedVideo[]> {
  const res = await fetchLive("/api/featured-videos");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchReleaseCountdown(): Promise<ReleaseCountdown | null> {
  const res = await fetchLive("/api/release-countdown");
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGalleryImages(): Promise<GalleryImage[]> {
  const res = await fetchLive("/api/gallery-images");
  if (!res.ok) return [];
  return res.json();
}

export type MailingListResult = {
  message: string;
  already_subscribed: boolean;
};

export async function subscribeToMailingList(data: {
  first_name: string;
  last_name: string;
  email: string;
}): Promise<MailingListResult> {
  const res = await fetch("/api/mailing-list/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const firstError = Object.values(json as Record<string, string[]>)[0]?.[0];
    throw new Error(firstError ?? "Something went wrong. Please try again.");
  }
  return json as MailingListResult;
}
