/**
 * Anonymous, first-party analytics. Sends tiny events to /api/event; a random id kept in
 * localStorage counts unique visitors. Nothing personal is collected, and the admin's own
 * browsing is never counted (see markAdminBrowser).
 */

type EventType =
  | "pageview"
  | "track_view"
  | "track_click"
  | "listen"
  | "presave"
  | "whatsapp"
  | "social"
  | "subscribe";

const VISITOR_KEY = "saintted:vid";
const ADMIN_KEY = "saintted:admin-browser";

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function deviceKind(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 700) return "mobile";
  if (w < 1100) return "tablet";
  return "desktop";
}

/** Call once from the admin so this browser's visits stop counting toward the site's numbers. */
export function markAdminBrowser() {
  try {
    localStorage.setItem(ADMIN_KEY, "1");
  } catch {
    /* ignore */
  }
}

function skip(): boolean {
  try {
    if (localStorage.getItem(ADMIN_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined" && (navigator as Navigator & { doNotTrack?: string }).doNotTrack === "1") return true;
  return false;
}

export function trackEvent(type: EventType, data: { slug?: string; platform?: string; path?: string } = {}) {
  if (typeof window === "undefined" || skip()) return;
  const payload = JSON.stringify({ type, visitor: visitorId(), device: deviceKind(), ...data });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/event", blob)) return;
  } catch {
    /* fall through */
  }
  void fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
}
