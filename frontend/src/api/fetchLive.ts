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
    throw new Error(`Network error (${msg}) for ${String(input)}.`);
  }
}
