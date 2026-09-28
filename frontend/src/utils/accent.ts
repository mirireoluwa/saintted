import type { CSSProperties } from "react";

const HEX = /^#[0-9a-f]{6}$/i;

/** Readable text colour (near-black or white) for a #rrggbb fill. */
function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.38 ? "#0b1620" : "#ffffff";
}

/** Inline CSS variables that re-tint one component tree with a track's own accent. */
export function accentVars(hex: string | undefined | null): CSSProperties | undefined {
  const c = (hex || "").trim();
  if (!HEX.test(c)) return undefined;
  return {
    "--accent": c,
    "--accent-text": c,
    "--on-accent": onColor(c),
  } as CSSProperties;
}
