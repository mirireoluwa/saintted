/**
 * Django serves the REST app under `/api/` (see backend `config/urls.py`).
 * Vercel env **VITE_API_URL** must be a full absolute URL including `/api`, e.g.
 * `https://your-api.up.railway.app/api` — **no trailing slash**.
 *
 * Safari/WebKit throws `SyntaxError: The string did not match the expected pattern`
 * when `fetch()` is given a malformed URL (smart quotes, missing scheme, etc.).
 */

function stripInvisible(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/** Trim wrapping quotes / backticks often pasted from docs or chat. */
function stripWrappingQuotes(s: string): string {
  return s.replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/gu, "");
}

export function getApiBase(): string {
  let raw: unknown = import.meta.env.VITE_API_URL;
  if (raw == null || raw === "") {
    return "http://localhost:8000/api";
  }
  if (typeof raw !== "string") raw = String(raw);
  let s = stripInvisible(stripWrappingQuotes(String(raw).trim()));

  if (s === "undefined" || s === "null") {
    s = "";
  }
  if (!s) {
    if (import.meta.env.PROD) {
      throw new Error(
        "VITE_API_URL is missing. In Vercel → Environment Variables, set it to https://YOUR-SERVICE.up.railway.app/api and redeploy.",
      );
    }
    return "http://localhost:8000/api";
  }

  s = s.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, "")}`;
  }

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    console.error(
      "[saintted] Invalid VITE_API_URL (must be absolute https URL, no smart quotes or line breaks):",
      import.meta.env.VITE_API_URL,
    );
    throw new Error(
      "Invalid VITE_API_URL. In Vercel, set it to your API base, e.g. https://YOUR-SERVICE.up.railway.app/api (plain ASCII, no quotes in the value).",
    );
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("VITE_API_URL must start with http:// or https://.");
  }

  const path = (u.pathname || "").replace(/\/+$/, "");
  const base = `${u.origin}${path}`.replace(/\/+$/, "");

  if (import.meta.env.PROD && base.length > 0 && !/\/api$/.test(base)) {
    console.warn(
      "[saintted] VITE_API_URL should end with /api (example: https://your-api.up.railway.app/api). Current value:",
      base,
    );
  }
  return base;
}
