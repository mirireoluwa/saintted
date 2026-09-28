import { useEffect, useMemo, useState } from "react";
import { fetchInsights } from "../api/adminApi";
import type { Insights } from "../types/insights";
import "./AdminInsights.css";

const RANGES = [7, 30, 90] as const;
const PLATFORM_LABEL: Record<string, string> = { spotify: "Spotify", apple: "Apple Music", youtube: "YouTube" };
const nice = (slug: string) => slug.replace(/-/g, " ");
const fmt = (n: number) => n.toLocaleString("en-US");

export function AdminInsights({ trackTitles }: { trackTitles: Record<string, string> }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    fetchInsights(days)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [days]);

  const max = useMemo(() => Math.max(1, ...(data?.series.map((s) => Math.max(s.visitors, s.pageviews)) ?? [1])), [data]);
  const deviceTotal = data ? data.devices.mobile + data.devices.tablet + data.devices.desktop : 0;
  const topTrackMax = Math.max(1, ...(data?.tracks.map((t) => t.clicks + t.views) ?? [1]));

  const title = (slug: string) => trackTitles[slug] || nice(slug);
  const empty = data && data.totals.pageviews === 0;

  return (
    <>
      <div className="insights__bar">
        <div className="insights__ranges" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}>
              {r} days
            </button>
          ))}
        </div>
        <p className="insights__note">Anonymous counts only. Your own visits from this browser are not counted.</p>
      </div>

      {error ? <div className="admin-card"><p className="admin-form__hint admin-form__hint--error">{error}</p></div> : null}
      {loading && !data ? <p className="admin-page__loading">Loading…</p> : null}

      {data ? (
        <>
          <div className="admin-card">
            <div className="stat-grid stat-grid--6">
              <Stat label="visitors" value={data.totals.visitors} hint="unique per day, added up" />
              <Stat label="page views" value={data.totals.pageviews} />
              <Stat label="track clicks" value={data.totals.trackClicks} hint="from cards and buttons" />
              <Stat label="track pages opened" value={data.totals.trackViews} />
              <Stat label="listen clicks" value={data.totals.listens} hint="Spotify, Apple, YouTube" />
              <Stat label="pre-save clicks" value={data.totals.presaves} />
              <Stat label="new signups" value={data.totals.subscribes} />
              <Stat label="WhatsApp clicks" value={data.totals.whatsapp} />
            </div>
          </div>

          {empty ? (
            <div className="admin-card">
              <p className="notif__empty">
                No visits recorded in this period yet. Counting starts as soon as this version of the site is live,
                so numbers fill in over the next few days.
              </p>
            </div>
          ) : null}

          <div className="admin-card">
            <h2 className="admin-card__title">visitors per day</h2>
            <div className="chart" role="img" aria-label={`Visitors per day over the last ${days} days`}>
              {data.series.map((s) => (
                <div className="chart__col" key={s.date} title={`${s.date}: ${s.visitors} visitors, ${s.pageviews} page views`}>
                  <span className="chart__bar chart__bar--views" style={{ height: `${(s.pageviews / max) * 100}%` }} />
                  <span className="chart__bar chart__bar--visitors" style={{ height: `${(s.visitors / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="chart__axis">
              <span>{data.series[0]?.date}</span>
              <span className="chart__legend">
                <i className="chart__key chart__key--visitors" /> visitors
                <i className="chart__key chart__key--views" /> page views
              </span>
              <span>{data.series[data.series.length - 1]?.date}</span>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="admin-card__title">tracks</h2>
            {data.tracks.length === 0 ? (
              <p className="notif__empty">No track activity yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Track</th>
                      <th>Clicks</th>
                      <th>Page opens</th>
                      <th>Listens</th>
                      <th>Pre-saves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tracks.map((t) => (
                      <tr key={t.slug}>
                        <td>
                          <strong>{title(t.slug)}</strong>
                          <span className="meter">
                            <span style={{ width: `${((t.clicks + t.views) / topTrackMax) * 100}%` }} />
                          </span>
                        </td>
                        <td>{fmt(t.clicks)}</td>
                        <td>{fmt(t.views)}</td>
                        <td>
                          {fmt(t.listenTotal)}
                          {t.listenTotal ? (
                            <span className="insights__sub">
                              {Object.entries(t.listens)
                                .sort((a, b) => b[1] - a[1])
                                .map(([p, n]) => `${PLATFORM_LABEL[p] ?? p} ${n}`)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </td>
                        <td>{fmt(t.presaves)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="insights__split">
            <div className="admin-card">
              <h2 className="admin-card__title">top pages</h2>
              {data.pages.length === 0 ? (
                <p className="notif__empty">No page views yet.</p>
              ) : (
                <ul className="rank">
                  {data.pages.map((p) => (
                    <li key={p.path}>
                      <span>{p.path === "/" ? "home" : p.path}</span>
                      <strong>{fmt(p.views)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="admin-card">
              <h2 className="admin-card__title">devices</h2>
              {deviceTotal === 0 ? (
                <p className="notif__empty">No data yet.</p>
              ) : (
                <>
                  <div className="devices" aria-hidden>
                    <span className="devices__seg devices__seg--a" style={{ flex: data.devices.mobile }} />
                    <span className="devices__seg devices__seg--b" style={{ flex: data.devices.tablet }} />
                    <span className="devices__seg devices__seg--c" style={{ flex: data.devices.desktop }} />
                  </div>
                  <ul className="rank">
                    <li><span><i className="chart__key devices__seg--a" /> phone</span><strong>{Math.round((data.devices.mobile / deviceTotal) * 100)}%</strong></li>
                    <li><span><i className="chart__key devices__seg--b" /> tablet</span><strong>{Math.round((data.devices.tablet / deviceTotal) * 100)}%</strong></li>
                    <li><span><i className="chart__key devices__seg--c" /> computer</span><strong>{Math.round((data.devices.desktop / deviceTotal) * 100)}%</strong></li>
                  </ul>
                </>
              )}
              {data.social.length ? (
                <>
                  <h3 className="insights__h3">social clicks</h3>
                  <ul className="rank">
                    {data.social.map((s) => (
                      <li key={s.label}><span>{s.label}</span><strong>{fmt(s.clicks)}</strong></li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <span className="stat__value">{fmt(value)}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
