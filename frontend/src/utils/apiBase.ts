/**
 * Django serves the REST app under `/api/` (see backend `config/urls.py`).
 * Vercel env **VITE_API_URL** must be the full base including `/api`, e.g.
 * `https://your-api-host.example.com/api` — **no trailing slash**.
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const base = String(raw).trim().replace(/\/+$/, "");
  if (import.meta.env.PROD && base.length > 0 && !/\/api$/.test(base)) {
    console.warn(
      "[saintted] VITE_API_URL should end with /api (example: https://your-api.up.railway.app/api). Current value:",
      base,
    );
  }
  return base;
}
