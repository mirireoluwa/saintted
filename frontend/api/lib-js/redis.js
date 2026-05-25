import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Redis } from "@upstash/redis";
const TRACKS_KEY = "saintted:tracks";
const VIDEOS_KEY = "saintted:featured-videos";
const GALLERY_KEY = "saintted:gallery-images";
const COUNTDOWN_KEY = "saintted:release-countdown";
const SUBSCRIBERS_KEY = "saintted:subscribers";
function ensureLocalEnvLoaded() {
  const hasPair = (url, token) => Boolean(url?.trim() && token?.trim());
  if (hasPair(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN) || hasPair(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN)) {
    return;
  }
  let dir = process.cwd();
  for (let step = 0; step < 10; step++) {
    for (const name of [".env.local", ".env"]) {
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
function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  if (url.startsWith("redis://") || url.startsWith("rediss://")) {
    console.warn(
      "[saintted] UPSTASH_REDIS_REST_URL must be the https://\u2026 REST URL from Upstash console, not redis://"
    );
    return null;
  }
  return new Redis({ url, token });
}
export {
  COUNTDOWN_KEY,
  GALLERY_KEY,
  SUBSCRIBERS_KEY,
  TRACKS_KEY,
  VIDEOS_KEY,
  getRedis
};
