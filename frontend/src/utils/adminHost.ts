import { getSiteUrl } from "./siteUrl";

/**
 * Admin SPA is meant to be served from admin.saintted.com (same build as the public site).
 * See README: Vercel must attach this hostname to the same project without redirecting to the primary domain.
 */
export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.+$/u, "");
}

function stripLeadingWww(host: string): string {
  const h = normalizeHostname(host);
  return h.startsWith("www.") ? h.slice(4) : h;
}

const DEFAULT_ADMIN_HOSTS = new Set(["admin.saintted.com", "admin.localhost"]);

export function isAdminHostname(hostname: string): boolean {
  const h = normalizeHostname(hostname);
  if (DEFAULT_ADMIN_HOSTS.has(h)) return true;
  const extra = import.meta.env.VITE_ADMIN_HOSTS;
  if (typeof extra !== "string" || !extra.trim()) return false;
  const allowed = new Set(
    extra
      .split(",")
      .map((s) => normalizeHostname(s))
      .filter(Boolean),
  );
  return allowed.has(h);
}

/** Canonical admin UI origin (override with VITE_ADMIN_SITE_URL in Vercel). */
export function getAdminSiteOrigin(): string {
  const raw = import.meta.env.VITE_ADMIN_SITE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().replace(/\/+$/, "");
  }
  try {
    const u = new URL(getSiteUrl());
    const host = stripLeadingWww(u.hostname);
    if (host === "localhost" || host === "127.0.0.1") {
      u.hostname = "admin.localhost";
      return u.origin;
    }
    if (host.startsWith("admin.")) {
      u.hostname = host;
      return u.origin;
    }
    u.hostname = `admin.${host}`;
    return u.origin;
  } catch {
    return "https://admin.saintted.com";
  }
}

/** True when the user is on the public site hostname (e.g. saintted.com) but not the admin host. */
export function shouldSuggestAdminSubdomain(): boolean {
  if (typeof window === "undefined") return false;
  if (isAdminHostname(window.location.hostname)) return false;
  const current = stripLeadingWww(window.location.hostname);
  if (current === "localhost" || current === "127.0.0.1") return false;
  try {
    const siteHost = stripLeadingWww(new URL(getSiteUrl()).hostname);
    return current === siteHost;
  } catch {
    return false;
  }
}
