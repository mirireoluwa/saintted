import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchShows, fetchStoryConfig } from "../api/client";
import type { LiveShow } from "../types/liveShow";
import type { Track } from "../types/track";
import { trackEvent } from "../utils/analytics";
import { compactCountdownFromMs } from "../utils/countdownParts";
import { releaseMs } from "../utils/releaseGroups";
import { buildSlides, EMPTY_STORY_CONFIG, visibleSlides, type Slide, type StoryConfig } from "../utils/storySlides";
import { getTrackArtUrl } from "../utils/trackArt";
import "./HeroStories.css";

const SLIDE_MS = 7000;

/**
 * What is worth a story right now, in the admin's chosen order (shows, the next drop and fresh releases by
 * default). With none of these the normal hero is used. `ready` turns true once shows and the story
 * settings have loaded (or failed to), so the hero picks one layout instead of flashing between two.
 */
export function useStorySlides(tracks: Track[], tracksReady: boolean): { slides: Slide[]; ready: boolean } {
  const [shows, setShows] = useState<LiveShow[]>([]);
  const [cfg, setCfg] = useState<StoryConfig>(EMPTY_STORY_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchShows().catch(() => [] as LiveShow[]), fetchStoryConfig().catch(() => EMPTY_STORY_CONFIG)]).then(
      ([list, config]) => {
        if (!live) return;
        setShows(list);
        setCfg(config);
        setLoaded(true);
      }
    );
    return () => {
      live = false;
    };
  }, []);

  const slides = useMemo(() => visibleSlides(buildSlides(tracks, shows), cfg), [tracks, shows, cfg]);

  return { slides, ready: loaded && tracksReady };
}

function showDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-US", { day: "numeric" }),
    month: d.toLocaleDateString("en-US", { month: "short" }).toLowerCase(),
    monthLong: d.toLocaleDateString("en-US", { month: "long" }).toLowerCase(),
    year: d.getFullYear(),
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase(),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase(),
  };
}

function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="story__count">{compactCountdownFromMs(Math.max(0, to - now))}</span>;
}

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.kind === "show") {
    const sh = slide.show;
    const d = showDate(sh.starts_at);
    return (
      <div className="story__slide story__slide--show">
        <div className="story__text">
          <p className="story__kicker">live show{sh.flyer_url ? ` · ${d.weekday}` : ""}</p>
          <h2 className="story__title">{sh.title || sh.venue}</h2>
          {(sh.title ? [sh.venue, sh.city] : [sh.city]).filter(Boolean).length ? (
            <p className="story__place">{(sh.title ? [sh.venue, sh.city] : [sh.city]).filter(Boolean).join(", ")}</p>
          ) : null}
          {sh.flyer_url ? (
            <div className="story__when">
              <span className="story__tile" aria-hidden>
                <em>{d.month}</em>
                <strong>{d.day}</strong>
              </span>
              <span className="story__when-text">
                <b>{d.weekday}</b>
                <span>{d.monthLong} {d.day}, {d.year} · {d.time}</span>
              </span>
            </div>
          ) : null}
          {sh.note ? <p className="story__sub">{sh.note}</p> : null}
          {sh.is_sold_out ? (
            <span className="story__soldout">sold out</span>
          ) : sh.ticket_url ? (
            <a className="story__cta" href={sh.ticket_url} target="_blank" rel="noopener noreferrer">
              get tickets <span aria-hidden>↗</span>
            </a>
          ) : (
            <Link className="story__cta" to="/shows">
              see shows <span aria-hidden>→</span>
            </Link>
          )}
        </div>
        {sh.flyer_url ? (
          <div className="story__media story__media--flyer" aria-hidden>
            <img src={sh.flyer_url} alt="" draggable={false} />
          </div>
        ) : (
          <div className="story__media story__media--date" aria-hidden>
            <small>{d.weekday}</small>
            <strong>{d.day}</strong>
            <span>{d.monthLong} {d.year}</span>
            <i />
            <b>{d.time}</b>
          </div>
        )}
      </div>
    );
  }

  const t = slide.track;
  const art = getTrackArtUrl(t);
  const isSoon = slide.kind === "soon";
  const presave = (t.presave_url || "").trim();
  const at = releaseMs(t);
  return (
    <div className="story__slide story__slide--song">
      <div className="story__text">
        <p className="story__kicker">{isSoon ? "coming soon" : "new music"}</p>
        <h2 className="story__title">{t.title}</h2>
        {isSoon && at ? (
          <p className="story__sub">
            drops in <Countdown to={at} />
          </p>
        ) : (
          <p className="story__sub">{[t.year, (t.meta || "").toLowerCase()].filter(Boolean).join(" · ")}</p>
        )}
        {isSoon && presave ? (
          <a
            className="story__cta"
            href={presave}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("presave", { slug: t.slug })}
          >
            pre-save <span aria-hidden>↗</span>
          </a>
        ) : (
          <Link className="story__cta" to={`/music/${t.slug}`} onClick={() => trackEvent("track_click", { slug: t.slug })}>
            {isSoon ? "details" : "listen now"} <span aria-hidden>{isSoon ? "→" : "↗"}</span>
          </Link>
        )}
      </div>
      <div className="story__media story__media--cover" aria-hidden>
        {art ? <img src={art} alt="" draggable={false} /> : <span className="story__cover-empty" />}
      </div>
    </div>
  );
}

const LABEL: Record<Slide["kind"], string> = { show: "live show", new: "new music", soon: "coming soon" };

const MAIN_MS = 8000;

/**
 * The hero as a story. The first frame is the normal hero; the frames after it (shows, the next drop,
 * a fresh release) slide in as it plays. No buttons: tap the right side to go forward, the left third
 * to go back, hold to pause. Progress runs along the bottom.
 */
export function HeroStories({ slides, main }: { slides: Slide[]; main: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const down = useRef<{ t: number } | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const count = slides.length + 1; // the main hero is frame 0
  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const at = Math.min(index, count - 1);
  const slide = at === 0 ? null : slides[at - 1];
  const paused = held || reduced;
  const duration = at === 0 ? MAIN_MS : SLIDE_MS;

  const onPointerDown = () => {
    down.current = { t: Date.now() };
    setHeld(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setHeld(false);
    const d = down.current;
    down.current = null;
    if (!d || Date.now() - d.t > 260) return; // a long press only pauses
    if ((e.target as Element).closest("a, button, input")) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left < r.width / 3) prev();
    else next();
  };

  return (
    <section
      className="story"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Home"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        down.current = null;
        setHeld(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }}
    >
      <div className="story__viewport">
        {slide ? (
          <SlideBody key={slide.id} slide={slide} />
        ) : (
          <div className="story__main" key="main">{main}</div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {slide ? `${LABEL[slide.kind]}, slide ${at + 1} of ${count}` : `Slide 1 of ${count}`}
      </p>

      <div className="story__bars" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <span className="story__bar" key={i}>
            {i < at ? (
              <b className="story__fill story__fill--done" />
            ) : i === at ? (
              <b
                key={`${at}`}
                className="story__fill story__fill--run"
                style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? "paused" : "running" }}
                onAnimationEnd={next}
              />
            ) : null}
          </span>
        ))}
      </div>
    </section>
  );
}
