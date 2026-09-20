import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fetchShows } from "../api/client";
import type { LiveShow } from "../types/liveShow";
import { SectionLabel } from "./SectionLabel";
import "./Shows.css";

type ShowsProps = {
  /** Render the ".shows" section label (off when the page supplies its own heading). */
  showLabel?: boolean;
};

function parts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-US", { day: "2-digit" }),
    month: d.toLocaleDateString("en-US", { month: "short" }).toLowerCase(),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase(),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase(),
    year: d.getFullYear(),
  };
}

export function Shows({ showLabel = true }: ShowsProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [shows, setShows] = useState<LiveShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchShows()
      .then((list) => {
        if (!cancelled) setShows(list);
      })
      .catch(() => {
        if (!cancelled) setShows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep tonight's show visible until the next morning.
  const upcoming = shows
    .filter((s) => new Date(s.starts_at).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <section className="shows" id="shows-section">
      {showLabel ? <SectionLabel text=".shows" /> : null}

      {loading ? (
        <ul className="shows__list" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="shows__row shows__row--skeleton" />
          ))}
        </ul>
      ) : upcoming.length > 0 ? (
        <ul className="shows__list">
          {upcoming.map((s) => {
            const p = parts(s.starts_at);
            return (
              <motion.li
                className="shows__row"
                key={s.id}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
              >
                <span className="shows__date">
                  <strong>{p.day}</strong>
                  {p.month} {p.year}
                </span>
                <span className="shows__where">
                  <span className="shows__venue">{s.venue}</span>
                  <span className="shows__city">
                    {[s.city, `${p.weekday} · ${p.time}`, s.note].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {s.is_sold_out ? (
                  <span className="shows__soldout">sold out</span>
                ) : s.ticket_url ? (
                  <a className="shows__cta" href={s.ticket_url} target="_blank" rel="noopener noreferrer">
                    tickets <span aria-hidden>↗</span>
                  </a>
                ) : null}
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <div className="shows__empty">
          <p className="shows__empty-title">no shows announced yet</p>
          <p className="shows__empty-sub">join the mailing list and you'll hear first when dates drop.</p>
          <a href="/#mailing-list-section" className="shows__empty-link">
            join the list <span aria-hidden>↓</span>
          </a>
        </div>
      )}
    </section>
  );
}
