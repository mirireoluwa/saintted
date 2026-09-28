import { useEffect, useRef, useState } from "react";
import { relative, type AdminNotice } from "./noticeRules";
import "./AdminInsights.css";

type Props = {
  notices: AdminNotice[];
  unreadCount: number;
  onOpen: (n: AdminNotice) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
};

const LEVEL_LABEL: Record<AdminNotice["level"], string> = {
  action: "needs you",
  soon: "coming up",
  info: "heads up",
  ok: "all good",
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

/** The notification bell in the admin's top bar: a badge for what's unread, and a panel with the list. */
export function AdminBell({ notices, unreadCount, onOpen, onDismiss, onMarkAllRead }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="bell" ref={rootRef}>
      <button
        type="button"
        className={`bell__btn${open ? " bell__btn--open" : ""}`}
        aria-expanded={open}
        aria-controls="bell-panel"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon />
        {unreadCount > 0 ? <span className="bell__badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="bell__panel" id="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell__head">
            <h2>notifications</h2>
            {notices.some((n) => n.unread) ? (
              <button type="button" className="bell__mark" onClick={onMarkAllRead}>
                mark all as read
              </button>
            ) : null}
          </div>

          {notices.length === 0 ? (
            <p className="notif__empty bell__empty">Nothing needs your attention right now.</p>
          ) : (
            <ul className="notif bell__list">
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
                    {n.action ? (
                      <button
                        type="button"
                        className="bell__act"
                        onClick={() => {
                          setOpen(false);
                          onOpen(n);
                        }}
                      >
                        {n.action.label} →
                      </button>
                    ) : null}
                  </div>
                  <button type="button" className="notif__x" aria-label="Dismiss" onClick={() => onDismiss(n.id)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
