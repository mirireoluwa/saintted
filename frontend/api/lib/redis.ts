import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Redis } from "@upstash/redis";

export const TRACKS_KEY = "saintted:tracks";
export const VIDEOS_KEY = "saintted:featured-videos";
export const GALLERY_KEY = "saintted:gallery-images";
export const COUNTDOWN_KEY = "saintted:release-countdown";
export const SUBSCRIBERS_KEY = "saintted:subscribers";

function ensureLocalEnvLoaded(): void {
  const hasPair = (url?: string, token?: string) =>
    Boolean(url?.trim() && token?.trim());

  if (
    hasPair(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN) ||
    hasPair(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN)
  ) {
    return;
  }

  let dir = process.cwd();
  for (let step = 0; step < 10; step++) {
    for (const name of [".env.local", ".env"] as const) {
      const p = resolve(dir, name);
      if (existsSync(p)) {
        config({ path: p });
        return;
      }
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
}

ensureLocalEnvLoaded();

export function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();

  if (!url || !token) return null;

  if (url.startsWith("redis://") || url.startsWith("rediss://")) {
    console.warn(
      "[saintted] UPSTASH_REDIS_REST_URL must be the https://… REST URL from Upstash console, not redis://"
    );
    return null;
  }

  return new Redis({ url, token });
}
