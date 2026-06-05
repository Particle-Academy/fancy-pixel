import type { PixelBeaconPayload } from "./types.js";

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

  const url = endpoint.replace(/\/+$/, "") + "/pixel";
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
