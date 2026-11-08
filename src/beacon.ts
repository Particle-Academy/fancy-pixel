import type { PixelBeaconPayload } from "./types.js";

/**
 * Drop every trailing `/` from an endpoint.
 *
 * Trimmed by index rather than with a trailing-slash regex. A regex of the
 * form "one or more slashes, then end of string" is retried from every
 * position, so a long run of slashes that does not end the string costs
 * quadratic time on the page's main thread. The endpoint is host input, so it
 * is not automatically trustworthy. This loop is linear and needs no regex
 * engine. It matches `joinCollect` in fancy-heuristics-js.
 */
export function trimTrailingSlashes(endpoint: string): string {
  const SLASH = 47; // '/'
  let end = endpoint.length;
  while (end > 0 && endpoint.charCodeAt(end - 1) === SLASH) end--;
  return endpoint.slice(0, end);
}

/**
 * Send a pixel liveness/visibility beacon to `${endpoint}/pixel`.
 *
 * Prefers `navigator.sendBeacon` (survives page unload, non-blocking),
 * falling back to `fetch(..., { keepalive: true })`. Both paths POST JSON.
 * Failures are swallowed — a missing beacon must never break the host page.
 *
 * @returns `true` if the beacon was handed off to the transport.
 */
export function sendPixelBeacon(
  endpoint: string,
  payload: PixelBeaconPayload,
): boolean {
  if (!endpoint) return false;

  const url = trimTrailingSlashes(endpoint) + "/pixel";
  const body = JSON.stringify(payload);

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      // sendBeacon with a Blob preserves the JSON content type for the server.
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return true;
      // sendBeacon returns false if the UA refused to queue it — fall through.
    }
  } catch {
    /* fall through to fetch */
  }

  try {
    if (typeof fetch === "function") {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        // Cross-origin ingestion: we never read the response, so opaque is fine.
        mode: "cors",
        credentials: "omit",
      }).catch(() => {
        /* swallow */
      });
      return true;
    }
  } catch {
    /* swallow */
  }

  return false;
}
