import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { fetchShows } from "../api/client";
import { absoluteUrl } from "../utils/siteUrl";
import type { LiveShow } from "../types/liveShow";
import "./Shows.css";

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

export function Shows() {
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

  const eventsLd = upcoming.map((s) => ({
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: s.title || `Saintted live at ${s.venue}`,
    startDate: s.starts_at,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: s.venue, address: s.city || s.venue },
    performer: { "@type": "MusicGroup", name: "Saintted" },
    ...(s.flyer_url ? { image: [absoluteUrl(s.flyer_url)] } : {}),
    ...(s.ticket_url
      ? {
          offers: {
            "@type": "Offer",
            url: s.ticket_url,
            availability: s.is_sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          },
        }
      : {}),
  }));

  return (
    <section className="section section--tight shows" id="shows-section">
      {eventsLd.length ? (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(eventsLd).replace(/</g, "\\u003c")}</script>
        </Helmet>
      ) : null}
      <div className="wrap">
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
              <li className="shows__row" key={s.id}>
                <span className="shows__date">
                  <strong>{p.day}</strong>
                  {p.month} {p.year}
                </span>
                <span className="shows__where">
                  <span className="shows__venue">{s.title || s.venue}</span>
                  <span className="shows__city">
                    {[s.title ? s.venue : "", s.city, `${p.weekday} · ${p.time}`, s.note].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {s.is_sold_out ? (
                  <span className="shows__soldout">sold out</span>
                ) : s.ticket_url ? (
                  <a className="btn btn--sm" href={s.ticket_url} target="_blank" rel="noopener noreferrer">
                    tickets <span className="arrow" aria-hidden>↗</span>
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="shows__empty">
          <p className="shows__empty-title">no shows announced yet</p>
          <p className="shows__empty-sub">join the mailing list and you'll hear first when dates drop.</p>
          <a href="/#mailing-list-section" className="textlink">
            join the list <span className="arrow" aria-hidden>↓</span>
          </a>
        </div>
      )}
      </div>
    </section>
  );
}
