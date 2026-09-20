import { motion, useReducedMotion } from "framer-motion";
import { SectionLabel } from "./SectionLabel";
import "./Shows.css";

export type Show = {
  date: string; // ISO date
  city: string;
  venue: string;
  ticketUrl?: string;
};

// Add upcoming dates here. Past dates are hidden automatically.
const SHOWS: Show[] = [];

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-US", { day: "2-digit" }),
    month: d.toLocaleDateString("en-US", { month: "short" }).toLowerCase(),
  };
}

export function Shows() {
  const reduceMotion = useReducedMotion() ?? false;
  const upcoming = SHOWS.filter((s) => new Date(s.date).getTime() >= Date.now() - 86400000);

  return (
    <section className="shows" id="shows-section">
      <SectionLabel text=".shows" />
      {upcoming.length > 0 ? (
        <ul className="shows__list">
          {upcoming.map((s) => {
            const { day, month } = fmt(s.date);
            return (
              <motion.li
                className="shows__row"
                key={s.date + s.venue}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5 }}
              >
                <span className="shows__date">
                  <strong>{day}</strong>
                  {month}
                </span>
                <span className="shows__where">
                  <span className="shows__venue">{s.venue}</span>
                  <span className="shows__city">{s.city}</span>
                </span>
                {s.ticketUrl ? (
                  <a className="shows__cta" href={s.ticketUrl} target="_blank" rel="noopener noreferrer">
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
