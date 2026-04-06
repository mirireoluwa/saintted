import { getApiBase } from "../utils/apiBase";

/** Fire-and-forget: warms release-countdown JSON cache while the bundle loads. */
export function prefetchReleaseCountdown(): void {
  try {
    const base = getApiBase();
    void fetch(`${base}/release-countdown/`, {
      credentials: "omit",
      priority: "high",
    } as RequestInit).catch(() => {});
  } catch {
    /* ignore */
  }
}
