/**
 * Wraps fetch so Safari's opaque "TypeError: Load failed" includes an actionable CORS hint.
 */
export function crossOriginApiHint(): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return ` On Railway, add ${origin} to CORS_ORIGINS and CSRF_TRUSTED_ORIGINS (comma-separated, no spaces after commas), redeploy the API, then hard-refresh.`;
}

function isAbortError(e: unknown): boolean {
  if (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") {
    return true;
  }
  return e instanceof Error && e.name === "AbortError";
}

export async function fetchLive(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const merged: RequestInit = {
    cache: "no-store",
    credentials: "omit",
    ...init,
  };
  try {
    return await fetch(input, merged);
  } catch (e) {
    if (isAbortError(e)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Network error (${msg}) for ${String(input)}.${crossOriginApiHint()}`);
  }
}
