import { useEffect, useMemo, useState } from "react";
import type { Track } from "../types/track";

export function releaseMs(track: Track): number | null {
  const iso = (track.release_at || "").trim();
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Splits tracks into upcoming drops and released ones (a drop whose time has passed counts as
 * released and auto-highlighted). `now` ticks each second while a drop is still pending.
 */
export function useReleaseGroups(tracks: Track[]) {
  const [now, setNow] = useState(() => Date.now());

  const upcoming = useMemo(
    () =>
      tracks.filter((t) => {
        if (!t.is_unreleased) return false;
        const ms = releaseMs(t);
        return ms == null || ms > now;
      }),
    [tracks, now]
  );

  const released = useMemo(() => {
    const isHighlighted = (t: Track) => {
      const ms = releaseMs(t);
      return !!t.is_highlighted || (!!t.is_unreleased && ms != null && ms <= now);
    };
    const isReleased = (t: Track) => {
      if (!t.is_unreleased) return true;
      const ms = releaseMs(t);
      return ms != null && ms <= now;
    };
    const list = tracks.filter(isReleased);
    // highlighted first (stable), then the admin's ordering
    return [...list.filter(isHighlighted), ...list.filter((t) => !isHighlighted(t))].map((track) => ({
      track,
      highlighted: isHighlighted(track),
    }));
  }, [tracks, now]);

  useEffect(() => {
    const pending = upcoming.some((t) => {
      const ms = releaseMs(t);
      return ms != null && Date.now() < ms;
    });
    if (!pending) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [upcoming]);

  return { upcoming, released, now };
}
