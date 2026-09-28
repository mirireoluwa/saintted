import type { Track } from "../types/track";
import type { MailingListSubscriber } from "../api/adminApi";

export type NoticeLevel = "action" | "soon" | "info" | "ok";

export interface AdminNotice {
  id: string;
  level: NoticeLevel;
  title: string;
  detail?: string;
  /** ms timestamp used for ordering and "time ago". */
  at: number;
  /** Jump target inside the admin. */
  action?: { label: string; section: "music" | "audience" | "media" | "home" | "insights"; trackSlug?: string };
  /** Counts toward the sidebar badge. */
  unread: boolean;
}

const DAY = 86400000;

export function relative(ms: number, now = Date.now()): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const h = Math.round(abs / 3600000);
  const d = Math.floor(abs / DAY);
  const text = abs < 3600000 ? `${Math.max(m, 1)} min` : abs < DAY ? `${h} h` : d < 60 ? `${d} day${d === 1 ? "" : "s"}` : `${Math.round(d / 30)} months`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** Everything worth the admin's attention, computed from data the admin already loads. */
export function buildNotices(
  tracks: Track[],
  subscribers: MailingListSubscriber[],
  lastSeen: number,
  now = Date.now()
): AdminNotice[] {
  const out: AdminNotice[] = [];

  // ---- new subscribers ----
  const fresh = subscribers
    .map((s) => ({ s, at: new Date(s.subscribed_at).getTime() }))
    .filter((x) => Number.isFinite(x.at) && now - x.at < 14 * DAY)
    .sort((a, b) => b.at - a.at);
  if (fresh.length) {
    const unseen = fresh.filter((x) => x.at > lastSeen);
    const names = fresh.slice(0, 3).map((x) => `${x.s.first_name} ${x.s.last_name}`.trim() || x.s.email);
    out.push({
      id: "subs-recent",
      level: unseen.length ? "action" : "info",
      title: unseen.length
        ? `${unseen.length} new subscriber${unseen.length === 1 ? "" : "s"} since you last looked`
        : `${fresh.length} new subscriber${fresh.length === 1 ? "" : "s"} in the last 2 weeks`,
      detail: `${names.join(", ")}${fresh.length > 3 ? ` and ${fresh.length - 3} more` : ""}`,
      at: fresh[0].at,
      action: { label: "View subscribers", section: "audience" },
      unread: unseen.length > 0,
    });
  }

  // ---- upcoming / unreleased tracks ----
  for (const t of tracks.filter((x) => x.is_unreleased)) {
    const at = t.release_at ? new Date(t.release_at).getTime() : NaN;
    const edit = { label: "Edit track", section: "music" as const, trackSlug: t.slug };

    if (!Number.isFinite(at)) {
      out.push({ id: `nodate:${t.slug}`, level: "action", title: `“${t.title}” is upcoming but has no release date`, detail: "Set a date so the countdown can start.", at: now, action: edit, unread: true });
      continue;
    }
    if (at <= now) {
      out.push({
        id: `dropped:${t.slug}`,
        level: "action",
        title: `“${t.title}” has dropped`,
        detail: "It now shows as a released track. Untick “Upcoming” and feature it on the home page.",
        at,
        action: edit,
        unread: true,
      });
      continue;
    }
    const hours = (at - now) / 3600000;
    out.push({
      id: `drops:${t.slug}`,
      level: hours <= 48 ? "soon" : "info",
      title: `“${t.title}” drops ${relative(at, now)}`,
      detail: new Date(at).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
      at,
      action: edit,
      unread: hours <= 48,
    });
    const gaps: string[] = [];
    if (!(t.presave_url || "").trim()) gaps.push("no pre-save link");
    if (!(t.art_url || "").trim()) gaps.push("no cover art");
    if (t.is_published === false) gaps.push("still a draft, so it is hidden on the site");
    if (gaps.length) {
      out.push({
        id: `gaps:${t.slug}:${gaps.join("|")}`,
        level: "action",
        title: `“${t.title}” is missing something`,
        detail: gaps.join(" · "),
        at: now,
        action: edit,
        unread: true,
      });
    }
  }

  // ---- scheduled publishing and expiring badges ----
  for (const t of tracks) {
    const pub = t.publish_at ? new Date(t.publish_at).getTime() : NaN;
    if (t.is_published === false && Number.isFinite(pub) && pub > now) {
      out.push({ id: `publish:${t.slug}`, level: "info", title: `“${t.title}” goes live ${relative(pub, now)}`, at: pub, action: { label: "Edit track", section: "music", trackSlug: t.slug }, unread: false });
    }
    const until = t.highlighted_until ? new Date(t.highlighted_until).getTime() : NaN;
    if (t.is_highlighted && Number.isFinite(until) && until > now && until - now < 3 * DAY) {
      out.push({ id: `badge:${t.slug}`, level: "soon", title: `The “new” tag on “${t.title}” expires ${relative(until, now)}`, at: until, action: { label: "Edit track", section: "music", trackSlug: t.slug }, unread: false });
    }
  }

  const rank: Record<NoticeLevel, number> = { action: 0, soon: 1, info: 2, ok: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level] || b.at - a.at);
}
