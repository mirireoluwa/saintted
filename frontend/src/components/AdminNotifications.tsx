import { useEffect, useState } from "react";
import { fetchInsights } from "../api/adminApi";
import type { Insights } from "../types/insights";
import { relative, type AdminNotice } from "./noticeRules";
import "./AdminInsights.css";

type Props = {
  notices: AdminNotice[];
  onOpen: (n: AdminNotice) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  subscriberTotal: number | null;
};

const LEVEL_LABEL: Record<AdminNotice["level"], string> = {
  action: "needs you",
  soon: "coming up",
  info: "heads up",
  ok: "all good",
};

export function AdminNotifications({ notices, onOpen, onDismiss, onMarkAllRead, subscriberTotal }: Props) {
  const [week, setWeek] = useState<Insights | null>(null);

  useEffect(() => {
    let live = true;
    fetchInsights(7)
      .then((d) => live && setWeek(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const top = week?.tracks.find((t) => t.clicks + t.views + t.listenTotal > 0);

  return (
    <>
      <div className="admin-card">
        <div className="notif__head">
          <h2 className="admin-card__title">what needs attention</h2>
          {notices.some((n) => n.unread) ? (
            <button type="button" className="admin-btn" onClick={onMarkAllRead}>
              Mark all as read
            </button>
          ) : null}
        </div>

        {notices.length === 0 ? (
          <p className="notif__empty">Nothing needs your attention right now.</p>
        ) : (
          <ul className="notif">
            {notices.map((n) => (
              <li key={n.id} className={`notif__item notif__item--${n.level}`}>
                <span className="notif__dot" aria-hidden />
                <div className="notif__body">
                  <p className="notif__meta">
                    {LEVEL_LABEL[n.level]}
                    {n.level !== "action" || n.id.startsWith("subs") || n.id.startsWith("dropped") ? ` · ${relative(n.at)}` : ""}
                    {n.unread ? <span className="notif__new">new</span> : null}
                  </p>
                  <p className="notif__title">{n.title}</p>
                  {n.detail ? <p className="notif__detail">{n.detail}</p> : null}
                </div>
                <div className="notif__actions">
                  {n.action ? (
                    <button type="button" className="admin-btn" onClick={() => onOpen(n)}>
                      {n.action.label}
                    </button>
                  ) : null}
                  <button type="button" className="notif__x" aria-label="Dismiss" onClick={() => onDismiss(n.id)}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">this week</h2>
        <div className="stat-grid">
          <div className="stat">
            <span className="stat__value">{week ? week.totals.visitors : "–"}</span>
            <span className="stat__label">visitors</span>
          </div>
          <div className="stat">
            <span className="stat__value">{week ? week.totals.trackClicks + week.totals.trackViews : "–"}</span>
            <span className="stat__label">track opens</span>
          </div>
          <div className="stat">
            <span className="stat__value">{week ? week.totals.subscribes : "–"}</span>
            <span className="stat__label">new signups</span>
          </div>
          <div className="stat">
            <span className="stat__value">{subscriberTotal ?? "–"}</span>
            <span className="stat__label">total subscribers</span>
          </div>
        </div>
        {top ? (
          <p className="notif__detail" style={{ marginTop: "1.25rem" }}>
            Most opened this week: <strong>{top.slug.replace(/-/g, " ")}</strong> ({top.clicks + top.views} opens
            {top.listenTotal ? `, ${top.listenTotal} listen clicks` : ""}).
          </p>
        ) : null}
      </div>
    </>
  );
}
