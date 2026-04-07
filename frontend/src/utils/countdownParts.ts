export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export type RemainingParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function remainingPartsFromMs(ms: number): RemainingParts {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return { days, hours, minutes, seconds };
}

/** e.g. `7d 04:22:09` or `04:22:09` */
export function compactCountdownFromMs(ms: number): string {
  const r = remainingPartsFromMs(ms);
  if (r.days > 0) {
    return `${r.days}d ${pad2(r.hours)}:${pad2(r.minutes)}:${pad2(r.seconds)}`;
  }
  return `${pad2(r.hours)}:${pad2(r.minutes)}:${pad2(r.seconds)}`;
}
