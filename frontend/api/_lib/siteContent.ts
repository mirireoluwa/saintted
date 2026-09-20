// Pure helpers for the Shows + About content (no I/O). Shared by the public and admin handlers.
import type { AboutContent, LiveShow } from "./types.js";
import { DEFAULT_ABOUT } from "./types.js";

type Obj = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const isHttpUrl = (v: string): boolean => /^https?:\/\/\S+$/i.test(v);
const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export type Validated<T> = { ok: true; value: T } | { ok: false; message: string };

export function parseList<T>(raw: unknown): T[] {
  if (!raw) return [];
  const v = typeof raw === "string" ? JSON.parse(raw) : raw;
  return Array.isArray(v) ? (v as T[]) : [];
}

export function sortShows(shows: LiveShow[]): LiveShow[] {
  return [...shows].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() || a.id - b.id,
  );
}

/** Validate a create body, or a partial update merged onto `existing`. */
export function validateShow(body: Obj, existing?: LiveShow): Validated<Omit<LiveShow, "id" | "created_at">> {
  const has = (k: string) => k in body;
  const venue = has("venue") ? str(body.venue) : (existing?.venue ?? "");
  const city = has("city") ? str(body.city) : (existing?.city ?? "");
  const note = has("note") ? str(body.note) : (existing?.note ?? "");
  const ticket_url = has("ticket_url") ? str(body.ticket_url) : (existing?.ticket_url ?? "");
  const is_sold_out = has("is_sold_out") ? Boolean(body.is_sold_out) : (existing?.is_sold_out ?? false);
  const startsRaw = has("starts_at") ? str(body.starts_at) : (existing?.starts_at ?? "");

  if (!venue) return { ok: false, message: "venue is required" };
  if (venue.length > 255 || city.length > 255 || note.length > 255) {
    return { ok: false, message: "venue, city and note must be 255 characters or fewer" };
  }
  const t = new Date(startsRaw).getTime();
  if (!startsRaw || Number.isNaN(t)) return { ok: false, message: "starts_at must be a valid date/time" };
  if (ticket_url && !isHttpUrl(ticket_url)) return { ok: false, message: "ticket_url must start with http:// or https://" };

  return { ok: true, value: { starts_at: new Date(t).toISOString(), venue, city, ticket_url, note, is_sold_out } };
}

/** Validate an About update (partial) merged onto `current`. */
export function validateAbout(body: Obj, current: AboutContent): Validated<AboutContent> {
  const has = (k: string) => k in body;
  const heading = has("heading") ? str(body.heading) : current.heading;
  const bio = has("body") ? (typeof body.body === "string" ? body.body.trim() : "") : current.body;
  const booking_email = has("booking_email") ? str(body.booking_email) : current.booking_email;
  const portrait_url = has("portrait_url") ? str(body.portrait_url) : current.portrait_url;

  if (!heading) return { ok: false, message: "heading can't be empty" };
  if (heading.length > 255) return { ok: false, message: "heading must be 255 characters or fewer" };
  if (bio.length > 5000) return { ok: false, message: "bio must be 5000 characters or fewer" };
  if (booking_email && !isEmail(booking_email)) return { ok: false, message: "booking_email must be a valid email" };
  if (portrait_url && !isHttpUrl(portrait_url)) return { ok: false, message: "portrait_url must start with http:// or https://" };

  return {
    ok: true,
    value: { ...current, id: 1, heading, body: bio, booking_email, portrait_url, updated_at: new Date().toISOString() },
  };
}

export function aboutOrDefault(raw: unknown): AboutContent {
  if (!raw) return { ...DEFAULT_ABOUT };
  const v = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<AboutContent>;
  return { ...DEFAULT_ABOUT, ...v, id: 1 };
}
