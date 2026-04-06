import type { ReleaseCountdown } from "../types/releaseCountdown";

const KEY = "saintted_hero_config_v1";
const MAX_AGE_MS = 1000 * 60 * 30;

type Cached = {
  url: string;
  focus: { x: number; y: number };
  savedAt: number;
};

function focusFrom(config: ReleaseCountdown | null) {
  return {
    x: typeof config?.header_image_focus_x === "number" ? config.header_image_focus_x : 50,
    y: typeof config?.header_image_focus_y === "number" ? config.header_image_focus_y : 50,
  };
}

export function urlFromCountdown(config: ReleaseCountdown | null, fallback: string): string {
  const uploaded = (config?.header_image_file_url || "").trim();
  const custom = (config?.header_image_url || "").trim();
  return uploaded || custom || fallback;
}

export function readHeroCache(): { url: string; focus: { x: number; y: number } } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Cached;
    if (!data?.url || typeof data.savedAt !== "number") return null;
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return { url: data.url, focus: data.focus };
  } catch {
    return null;
  }
}

export function writeHeroCache(config: ReleaseCountdown | null, fallback: string): void {
  try {
    const url = urlFromCountdown(config, fallback);
    const focus = focusFrom(config);
    const payload: Cached = { url, focus, savedAt: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}
