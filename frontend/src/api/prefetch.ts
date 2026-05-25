/** Fire-and-forget: warms release-countdown cache while the bundle loads. */
export function prefetchReleaseCountdown(): void {
  try {
    void fetch("/api/release-countdown", {
      credentials: "omit",
      priority: "high",
    } as RequestInit).catch(() => {});
  } catch {
    /* ignore */
  }
}
