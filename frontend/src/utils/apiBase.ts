/**
 * Django serves the REST app under `/api/` (see backend `config/urls.py`).
 * Vercel env **VITE_API_URL** must be a full absolute URL including `/api`, e.g.
 * `https://your-api.up.railway.app/api` — **no trailing slash**.
 *
 * Safari/WebKit throws `SyntaxError: The string did not match the expected pattern`
 * when `fetch()` is given a malformed URL. We normalize input but **never throw**
 * from this module: throwing here runs during `import` of `adminApi` / `client` and
 * would blank the whole site before React mounts.
 */

function stripInvisible(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/** Trim wrapping quotes / backticks often pasted from docs or chat. */
function stripWrappingQuotes(s: string): string {
  return s.replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/gu, "");
}

function normalizeApiBase(raw: unknown): string {
  if (raw == null || raw === "") {
    return "http://localhost:8000/api";
  }
  let s = typeof raw === "string" ? raw : String(raw);
  s = stripInvisible(stripWrappingQuotes(s.trim()));
  if (s === "undefined" || s === "null") {
    s = "";
  }
  if (!s) {
    if (import.meta.env.PROD) {
      console.error(
        "[saintted] VITE_API_URL is empty. Set it in Vercel to https://YOUR-SERVICE.up.railway.app/api and redeploy.",
      );
    }
    return "http://localhost:8000/api";
  }

  s = s.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, "")}`;
  }

  const u = new URL(s);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("bad protocol");
  }

  const path = (u.pathname || "").replace(/\/+$/, "");
  return `${u.origin}${path}`.replace(/\/+$/, "");
}

export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  try {
    const base = normalizeApiBase(raw);
    if (import.meta.env.PROD && base.length > 0 && !/\/api$/.test(base)) {
      console.warn(
        "[saintted] VITE_API_URL should end with /api (example: https://your-api.up.railway.app/api). Current value:",
        base,
      );
    }
    return base;
  } catch {
    console.error(
      "[saintted] Invalid VITE_API_URL — fix in Vercel (plain https URL ending in /api, no smart quotes). Raw:",
      raw,
    );
    if (typeof raw === "string" && raw.trim()) {
      let s = stripInvisible(stripWrappingQuotes(raw.trim())).replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
      return s;
    }
    return "http://localhost:8000/api";
  }
}
