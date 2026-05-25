/**
 * API is co-located with the frontend as Vercel Serverless Functions under /api/.
 * No external backend URL needed — all calls are same-origin.
 */
export function getApiBase(): string {
  return "/api";
}
