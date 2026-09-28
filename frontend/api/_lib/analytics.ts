/**
 * First-party, cookie-free site analytics. Each public event bumps a counter in a per-day Redis hash
 * (`saintted:analytics:day:YYYY-MM-DD`) and adds a random, anonymous visitor id to that day's set.
 * No IP addresses, no user agents and no personal data are stored.
 */

export const EVENT_TYPES = [
  "pageview", // any page (path)
  "track_view", // a track's own page opened (slug)
  "track_click", // a track was clicked from a card / hero / feature (slug)
  "listen", // a streaming button was clicked on a track page (slug, platform)
  "presave", // a pre-save button was clicked (slug)
  "whatsapp", // the WhatsApp button was clicked
  "social", // a footer social link was clicked (platform)
  "subscribe", // a mailing-list signup succeeded
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface SiteEvent {
  type: EventType;
  visitor: string;
  device: "mobile" | "tablet" | "desktop";
  slug?: string;
  platform?: string;
  path?: string;
}

export const dayKey = (d: Date = new Date()) => `saintted:analytics:day:${d.toISOString().slice(0, 10)}`;
export const visitorsKey = (d: Date = new Date()) => `saintted:analytics:vis:${d.toISOString().slice(0, 10)}`;

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const PLATFORM = /^[a-z0-9 ._-]{1,32}$/i;
const VISITOR = /^[a-z0-9-]{8,64}$/i;

/** Returns a clean event, or null if the payload is not something we accept. */
export function parseEvent(body: unknown): SiteEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const type = b.type;
  if (typeof type !== "string" || !(EVENT_TYPES as readonly string[]).includes(type)) return null;
  const visitor = typeof b.visitor === "string" && VISITOR.test(b.visitor) ? b.visitor : "";
  if (!visitor) return null;
  const device = b.device === "mobile" || b.device === "tablet" ? b.device : "desktop";
  const ev: SiteEvent = { type: type as EventType, visitor, device };
  if (typeof b.slug === "string" && SLUG.test(b.slug)) ev.slug = b.slug;
  if (typeof b.platform === "string" && PLATFORM.test(b.platform)) ev.platform = b.platform.toLowerCase();
  if (typeof b.path === "string") {
    const p = b.path.split("?")[0].split("#")[0].slice(0, 80);
    if (p.startsWith("/")) ev.path = p.replace(/\/+$/, "") || "/";
  }
  return ev;
}

/** Which hash fields one event increments. */
export function fieldsFor(ev: SiteEvent): string[] {
  switch (ev.type) {
    case "pageview":
      return ["pv", `dev:${ev.device}`, ...(ev.path ? [`page:${ev.path}`] : [])];
    case "track_view":
      return ev.slug ? [`tv:${ev.slug}`] : [];
    case "track_click":
      return ev.slug ? [`tc:${ev.slug}`] : [];
    case "listen":
      return ev.slug ? [`l:${ev.slug}:${ev.platform || "other"}`] : [];
    case "presave":
      return ev.slug ? [`ps:${ev.slug}`] : [];
    case "whatsapp":
      return ["wa"];
    case "social":
      return [`soc:${ev.platform || "other"}`];
    case "subscribe":
      return ["sub"];
  }
}

export interface InsightsDay {
  date: string;
  visitors: number;
  pageviews: number;
}
export interface TrackInsight {
  slug: string;
  views: number;
  clicks: number;
  listens: Record<string, number>;
  listenTotal: number;
  presaves: number;
}
export interface Insights {
  days: number;
  series: InsightsDay[];
  totals: {
    visitors: number;
    pageviews: number;
    trackViews: number;
    trackClicks: number;
    listens: number;
    presaves: number;
    whatsapp: number;
    subscribes: number;
  };
  tracks: TrackInsight[];
  pages: { path: string; views: number }[];
  devices: { mobile: number; tablet: number; desktop: number };
  social: { label: string; clicks: number }[];
}

/** Fold the per-day hashes (oldest first) and visitor counts into one report. */
export function buildInsights(
  dates: string[],
  hashes: Array<Record<string, string | number> | null>,
  visitors: number[]
): Insights {
  const n = (v: unknown) => (typeof v === "number" ? v : parseInt(String(v ?? "0"), 10) || 0);
  const out: Insights = {
    days: dates.length,
    series: [],
    totals: { visitors: 0, pageviews: 0, trackViews: 0, trackClicks: 0, listens: 0, presaves: 0, whatsapp: 0, subscribes: 0 },
    tracks: [],
    pages: [],
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    social: [],
  };
  const tracks = new Map<string, TrackInsight>();
  const pages = new Map<string, number>();
  const social = new Map<string, number>();
  const track = (slug: string) => {
    let t = tracks.get(slug);
    if (!t) tracks.set(slug, (t = { slug, views: 0, clicks: 0, listens: {}, listenTotal: 0, presaves: 0 }));
    return t;
  };

  dates.forEach((date, i) => {
    const h = hashes[i] ?? {};
    const pv = n(h.pv);
    out.series.push({ date, visitors: visitors[i] ?? 0, pageviews: pv });
    out.totals.visitors += visitors[i] ?? 0;
    out.totals.pageviews += pv;
    out.totals.whatsapp += n(h.wa);
    out.totals.subscribes += n(h.sub);
    for (const [field, raw] of Object.entries(h)) {
      const v = n(raw);
      if (field.startsWith("tv:")) {
        track(field.slice(3)).views += v;
        out.totals.trackViews += v;
      } else if (field.startsWith("tc:")) {
        track(field.slice(3)).clicks += v;
        out.totals.trackClicks += v;
      } else if (field.startsWith("ps:")) {
        track(field.slice(3)).presaves += v;
        out.totals.presaves += v;
      } else if (field.startsWith("l:")) {
        const [, slug, platform] = field.split(":");
        const t = track(slug);
        t.listens[platform] = (t.listens[platform] ?? 0) + v;
        t.listenTotal += v;
        out.totals.listens += v;
      } else if (field.startsWith("page:")) {
        pages.set(field.slice(5), (pages.get(field.slice(5)) ?? 0) + v);
      } else if (field.startsWith("dev:")) {
        const d = field.slice(4) as keyof Insights["devices"];
        if (d in out.devices) out.devices[d] += v;
      } else if (field.startsWith("soc:")) {
        social.set(field.slice(4), (social.get(field.slice(4)) ?? 0) + v);
      }
    }
  });

  out.tracks = [...tracks.values()].sort((a, b) => b.clicks + b.views + b.listenTotal - (a.clicks + a.views + a.listenTotal));
  out.pages = [...pages.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 12);
  out.social = [...social.entries()].map(([label, clicks]) => ({ label, clicks })).sort((a, b) => b.clicks - a.clicks);
  return out;
}
