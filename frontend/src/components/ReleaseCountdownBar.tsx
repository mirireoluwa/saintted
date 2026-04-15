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
  const actionText = isLive ? "tap to listen now" : "tap to pre-save";
  const marqueeText = `${heading} · ${isLive ? "out now" : `${timeLabel} left`} · ${actionText} ·`;

  useEffect(() => {
    if (Date.now() >= targetMs) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  const tickerLabel = `${heading}. ${
    isLive
      ? "Out now."
      : `${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds remaining.`
  } ${actionText}.`;

  return (
    <div id="release-countdown-section" className="release-countdown-bar" role="region" aria-label="Release ticker">
      <div className="release-countdown-bar__shell">
        <div className="release-countdown-bar__ticker-wrap">
          {presave ? (
            <a
              href={presave}
              target="_blank"
              rel="noopener noreferrer"
              className="release-countdown-bar__ticker release-countdown-bar__ticker--link"
              aria-label={tickerLabel}
            >
              <span className="release-countdown-bar__ticker-track" aria-hidden>
                <span>{marqueeText}</span>
                <span>{marqueeText}</span>
                <span>{marqueeText}</span>
                <span>{marqueeText}</span>
                <span>{marqueeText}</span>
              </span>
            </a>
          ) : (
            <div className="release-countdown-bar__ticker" aria-label={tickerLabel}>
              <span className="release-countdown-bar__ticker-track" aria-hidden>
                <span>{marqueeText}</span>
                <span>{marqueeText}</span>
                <span>{marqueeText}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
