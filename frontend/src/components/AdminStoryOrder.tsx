import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchShowsAuth, fetchStoryConfigAuth, saveStoryConfig } from "../api/adminApi";
import type { LiveShow } from "../types/liveShow";
import type { Track } from "../types/track";
import { buildSlides, EMPTY_STORY_CONFIG, orderSlides, type Slide, type StoryConfig } from "../utils/storySlides";
import { getTrackArtUrl } from "../utils/trackArt";
import { AdminSortableList } from "./AdminSortableList";

type Notify = (type: "ok" | "error", text: string) => void;

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

const KIND_LABEL: Record<Slide["kind"], string> = { show: "live show", soon: "coming soon", new: "new music" };

function describe(s: Slide): { title: string; sub: string; img?: string } {
  if (s.kind === "show") {
    const d = new Date(s.show.starts_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return {
      title: s.show.title || s.show.venue,
      sub: [s.show.title ? s.show.venue : "", s.show.city, d].filter(Boolean).join(" · "),
      img: s.show.flyer_url || undefined,
    };
  }
  const at = s.track.release_at ? new Date(s.track.release_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  return { title: s.track.title, sub: s.kind === "soon" ? `drops ${at}` : `out ${at}`, img: getTrackArtUrl(s.track) || undefined };
}

/**
 * The home hero plays as a story: the main hero first, then these frames. Drag (or use the arrows) to
 * change their order; the eye hides a frame without deleting the show or track behind it.
 */
export function AdminStoryOrder({ tracks, notify }: { tracks: Track[]; notify: Notify }) {
  const [shows, setShows] = useState<LiveShow[]>([]);
  const [cfg, setCfg] = useState<StoryConfig>(EMPTY_STORY_CONFIG);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([fetchShowsAuth().catch(() => [] as LiveShow[]), fetchStoryConfigAuth().catch(() => EMPTY_STORY_CONFIG)]);
      setShows(s);
      setCfg(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slides = useMemo(() => orderSlides(buildSlides(tracks, shows), cfg), [tracks, shows, cfg]);
  const hidden = new Set(cfg.hidden);

  async function persist(next: StoryConfig, message: string) {
    const previous = cfg;
    setCfg(next);
    try {
      await saveStoryConfig(next);
      notify("ok", message);
    } catch (err) {
      setCfg(previous);
      notify("error", err instanceof Error ? err.message : String(err));
    }
  }

  function move(from: number, to: number) {
    if (from === to) return;
    const ids = slides.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    void persist({ order: ids, hidden: cfg.hidden }, "Story order saved.");
  }

  function toggle(id: string) {
    const next = hidden.has(id) ? cfg.hidden.filter((x) => x !== id) : [...cfg.hidden, id];
    void persist({ order: slides.map((s) => s.id), hidden: next }, hidden.has(id) ? "Frame shown." : "Frame hidden.");
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">hero story</h2>
      <p className="admin-card__lead">
        The home hero plays as a story. The main hero always comes first, then the frames below, in this order. Frames
        appear on their own from your upcoming shows, your next unreleased track and any release from the last two
        weeks. Drag to reorder, or hide one with the eye. If nothing qualifies, visitors just see the normal hero.
      </p>

      <div className="story-order__main">
        <span className="sortable__chip sortable__chip--accent">always first</span>
        <span>main hero</span>
      </div>

      {loading ? (
        <p className="sortable__empty">Loading…</p>
      ) : (
        <AdminSortableList
          items={slides}
          getKey={(s) => s.id}
          getLabel={(s) => describe(s).title}
          onMove={move}
          renderItem={(s) => {
            const d = describe(s);
            return (
              <>
                {d.img ? <img className="sortable__thumb" src={d.img} alt="" loading="lazy" /> : <span className="sortable__thumb" />}
                <div className="sortable__text" style={hidden.has(s.id) ? { opacity: 0.45 } : undefined}>
                  <span className="sortable__title">{d.title}</span>
                  <div className="sortable__sub">
                    <span className="sortable__chip sortable__chip--accent">{KIND_LABEL[s.kind]}</span>
                    {hidden.has(s.id) ? <span className="sortable__chip sortable__chip--warn">hidden</span> : null}
                    <span>{d.sub}</span>
                  </div>
                </div>
              </>
            );
          }}
          renderActions={(s) => (
            <button
              type="button"
              className="admin-btn"
              aria-label={hidden.has(s.id) ? `Show ${describe(s).title}` : `Hide ${describe(s).title}`}
              onClick={() => toggle(s.id)}
            >
              <span className="admin-btn__icon"><EyeIcon off={hidden.has(s.id)} /></span>
              <span className="admin-btn__label">{hidden.has(s.id) ? "Show" : "Hide"}</span>
            </button>
          )}
          empty={
            <p className="sortable__empty">
              Nothing to put in the story right now. Add an upcoming show or an unreleased track and it will appear here.
            </p>
          }
        />
      )}
    </div>
  );
}
