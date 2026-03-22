import { useEffect, useState } from "react";
import { fetchReleaseCountdown } from "../api/client";
import type { ReleaseCountdown } from "../types/releaseCountdown";
import "./ReleaseCountdownBanner.css";

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

export function ReleaseCountdownBanner() {
  const [config, setConfig] = useState<ReleaseCountdown | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchReleaseCountdown()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.release_at) return;
    const target = new Date(config.release_at).getTime();
    if (Number.isNaN(target)) return;
    if (Date.now() >= target) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [config?.enabled, config?.release_at]);

  if (!config?.enabled || !config.release_at) return null;

  const target = new Date(config.release_at).getTime();
  if (Number.isNaN(target)) return null;

  const now = Date.now();
  const isLive = now >= target;
  const remaining = formatRemaining(target - now);
  const presave = config.presave_url?.trim();
  const title = config.song_title?.trim();

  return (
    <div className="release-countdown" role="region" aria-label="Release countdown">
      <div className="release-countdown__inner">
        {title ? <p className="release-countdown__kicker">New music</p> : null}
        {title ? <h2 className="release-countdown__title">{title}</h2> : null}
        {!title ? <h2 className="release-countdown__title">New music dropping soon</h2> : null}

        {!isLive ? (
          <div className="release-countdown__grid" key={tick}>
            <div className="release-countdown__unit">
              <span className="release-countdown__num">{remaining.days}</span>
              <span className="release-countdown__label">days</span>
            </div>
            <div className="release-countdown__unit">
              <span className="release-countdown__num">{pad2(remaining.hours)}</span>
              <span className="release-countdown__label">hours</span>
            </div>
            <div className="release-countdown__unit">
              <span className="release-countdown__num">{pad2(remaining.minutes)}</span>
              <span className="release-countdown__label">min</span>
            </div>
            <div className="release-countdown__unit">
              <span className="release-countdown__num">{pad2(remaining.seconds)}</span>
              <span className="release-countdown__label">sec</span>
            </div>
          </div>
        ) : (
          <p className="release-countdown__live">Out now</p>
        )}

        {presave ? (
          <a
            href={presave}
            target="_blank"
            rel="noopener noreferrer"
            className="release-countdown__cta"
          >
            {isLive ? "Listen / save" : "Pre-save"}
          </a>
        ) : null}
      </div>
    </div>
  );
}
