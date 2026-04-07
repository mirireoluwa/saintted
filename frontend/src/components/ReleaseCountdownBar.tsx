import { useEffect, useState } from "react";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import "./ReleaseCountdownBar.css";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatRemaining(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return { days, hours, minutes, seconds };
}

function compactTimer(r: { days: number; hours: number; minutes: number; seconds: number }) {
  if (r.days > 0) {
    return `${r.days}d ${pad2(r.hours)}:${pad2(r.minutes)}:${pad2(r.seconds)}`;
  }
  return `${pad2(r.hours)}:${pad2(r.minutes)}:${pad2(r.seconds)}`;
}

type Props = { config: ReleaseCountdown };

export function ReleaseCountdownBar({ config }: Props) {
  const [nowTick, setNowTick] = useState(() => Date.now());

  const targetMs = new Date(config.release_at!).getTime();
  const isLive = nowTick >= targetMs;
  const remaining = formatRemaining(targetMs - nowTick);
  const timeLabel = compactTimer(remaining);
  const presave = (config.presave_url || "").trim();
  const title = (config.song_title || "").trim();
  const heading = title || "new music soon";

  useEffect(() => {
    if (Date.now() >= targetMs) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  return (
    <div
      id="release-countdown-section"
      className="release-countdown-bar"
      role="region"
      aria-label="Release countdown"
    >
      <div className="release-countdown-bar__shell">
        <div className="release-countdown-bar__pill">
          <div className="release-countdown-bar__inner">
            <h2 className="release-countdown-bar__title">{heading}</h2>
            {!isLive ? (
              <p
                className="release-countdown-bar__time"
                role="timer"
                aria-live="polite"
                aria-atomic="true"
                aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds remaining`}
              >
                {timeLabel}
              </p>
            ) : (
              <p className="release-countdown-bar__live">out now</p>
            )}
            {presave ? (
              <a
                href={presave}
                target="_blank"
                rel="noopener noreferrer"
                className="release-countdown-bar__link"
              >
                {isLive ? "Listen / save" : "Pre-save"}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
