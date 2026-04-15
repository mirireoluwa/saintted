import type { ReleaseCountdown } from "../types/releaseCountdown";

const KEY = "saintted_hero_config_v2";
const MAX_AGE_MS = 1000 * 60 * 30;

type Cached = {
  imageUrl: string;
  videoUrl: string;
  focus: { x: number; y: number };
  savedAt: number;
};

function focusFrom(config: ReleaseCountdown | null) {
  return {
    x: typeof config?.header_image_focus_x === "number" ? config.header_image_focus_x : 50,
    y: typeof config?.header_image_focus_y === "number" ? config.header_image_focus_y : 50,
  };
}

export function imageUrlFromCountdown(config: ReleaseCountdown | null, fallback = ""): string {
  const uploaded = (config?.header_image_file_url || "").trim();
  const custom = (config?.header_image_url || "").trim();
  return uploaded || custom || fallback;
}

export function videoUrlFromCountdown(config: ReleaseCountdown | null): string {
  const uploaded = (config?.header_video_file_url || "").trim();
  const custom = (config?.header_video_url || "").trim();
  return uploaded || custom || "";
}

export function readHeroCache():
  | { imageUrl: string; videoUrl: string; focus: { x: number; y: number } }
  | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Cached;
    if (
      typeof data?.imageUrl !== "string" ||
      typeof data?.videoUrl !== "string" ||
      typeof data.savedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return { imageUrl: data.imageUrl, videoUrl: data.videoUrl, focus: data.focus };
  } catch {
    return null;
  }
}

export function writeHeroCache(config: ReleaseCountdown | null, fallback = ""): void {
  try {
    const imageUrl = imageUrlFromCountdown(config, fallback);
    const videoUrl = videoUrlFromCountdown(config);
    const focus = focusFrom(config);
    const payload: Cached = { imageUrl, videoUrl, focus, savedAt: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}
