import type { LiveShow } from "../types/liveShow";
import type { Track } from "../types/track";
import { releaseMs } from "./releaseGroups";

export type Slide =
  | { kind: "show"; id: string; show: LiveShow }
  | { kind: "new"; id: string; track: Track }
  | { kind: "soon"; id: string; track: Track };

/** Admin-chosen order and visibility for the story frames after the main hero. */
export interface StoryConfig {
  order: string[];
  hidden: string[];
}

export const EMPTY_STORY_CONFIG: StoryConfig = { order: [], hidden: [] };

const NEW_WINDOW_DAYS = 14; // a release counts as "new music" for two weeks

/** Everything that qualifies for a story right now, in the default order (shows, the next drop, a fresh release). */
export function buildSlides(tracks: Track[], shows: LiveShow[], now = Date.now()): Slide[] {
  const out: Slide[] = [];

  shows
    .filter((s) => new Date(s.starts_at).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 3)
    .forEach((show) => out.push({ kind: "show", id: `show-${show.id}`, show }));

  const soon = tracks
    .filter((t) => t.is_unreleased && (releaseMs(t) ?? 0) > now)
    .sort((a, b) => (releaseMs(a) ?? 0) - (releaseMs(b) ?? 0))[0];
  if (soon) out.push({ kind: "soon", id: `soon-${soon.slug}`, track: soon });

  const fresh = tracks.find((t) => {
    const at = releaseMs(t);
    return at != null && at <= now && now - at < NEW_WINDOW_DAYS * 86400000;
  });
  if (fresh) out.push({ kind: "new", id: `new-${fresh.slug}`, track: fresh });

  return out;
}

/** Put slides in the admin's order; frames the admin hasn't placed yet keep their default order at the end. */
export function orderSlides(slides: Slide[], cfg: StoryConfig): Slide[] {
  const rank = new Map(cfg.order.map((id, i) => [id, i]));
  return slides
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (rank.get(a.s.id) ?? 1e6 + a.i) - (rank.get(b.s.id) ?? 1e6 + b.i))
    .map((x) => x.s);
}

export function visibleSlides(slides: Slide[], cfg: StoryConfig): Slide[] {
  const hidden = new Set(cfg.hidden);
  return orderSlides(slides, cfg).filter((s) => !hidden.has(s.id));
}
