/**
 * @particle-academy/fancy-pixel
 *
 * Embeddable Fancy UI verification badge + liveness/collection beacon.
 * Zero runtime dependencies. Renders inside an open Shadow DOM so host page
 * CSS cannot hide it — visibility is part of verification.
 *
 * @example Programmatic
 * ```ts
 * import { mountPixel } from "@particle-academy/fancy-pixel";
 * mountPixel({ style: "badge", mode: "floating", siteKey: "ACME",
 *              endpoint: "https://host/heuristics" });
 * ```
 *
 * @example Script tag (IIFE global build)
 * ```html
 * <script src=".../fancy-pixel.global.min.js"
 *         data-style="badge" data-mode="floating"
 *         data-site="ACME" data-endpoint="https://host/heuristics"></script>
 * ```
 */
export { mountPixel } from "./mount.js";
export { autoInit } from "./autoinit.js";
export { sendPixelBeacon } from "./beacon.js";
export { createPixelHost, hostStyleFor } from "./render.js";
export type {
  PixelStyle,
  PixelMode,
  MountPixelOptions,
  PixelHandle,
  PixelBeaconPayload,
  PixelShownEventDetail,
} from "./types.js";
