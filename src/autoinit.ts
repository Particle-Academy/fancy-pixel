import { mountPixel } from "./mount.js";
import type { MountPixelOptions, PixelHandle } from "./types.js";

/**
 * Read pixel config off the currently-executing <script> element's data-*
 * attributes. Used by the IIFE global bundle so a single <script> tag both
 * loads and auto-mounts the pixel:
 *
 *   <script src=".../fancy-pixel.global.min.js"
 *           data-style="badge" data-mode="floating"
 *           data-site="KEY" data-endpoint="https://host/heuristics"></script>
 *
 * Add `data-collect="false"` to render the badge + liveness beacon only and
 * suppress the interaction-analytics collector (on by default when an endpoint
 * is present).
 */
function readScriptConfig(): MountPixelOptions | null {
  if (typeof document === "undefined") return null;

  // `document.currentScript` is the running script during initial parse.
  // Fall back to the last <script> carrying our data-site marker.
  let el = document.currentScript as HTMLScriptElement | null;
  if (!el || !el.dataset || el.dataset.site === undefined) {
    const candidates = document.querySelectorAll<HTMLScriptElement>(
      "script[data-site][src*='fancy-pixel'], script[data-fancy-pixel]",
    );
    el = candidates[candidates.length - 1] ?? null;
  }
  if (!el) return null;

  const ds = el.dataset;
  // Only auto-init if at least one fancy-pixel attribute is present.
  if (
    ds.style === undefined &&
    ds.mode === undefined &&
    ds.site === undefined &&
    ds.endpoint === undefined &&
    ds.collect === undefined &&
    ds.fancyPixel === undefined
  ) {
    return null;
  }

  // `data-collect="false"` opts out of analytics; absent/anything-else = default on.
  const collect =
    ds.collect !== undefined ? ds.collect !== "false" : undefined;

  return {
    style: ds.style as MountPixelOptions["style"],
    mode: ds.mode as MountPixelOptions["mode"],
    siteKey: ds.site,
    endpoint: ds.endpoint,
    collect,
    target: ds.target ?? null,
    href: ds.href,
  };
}

/**
 * Auto-mount from the script tag's data-* attributes if present.
 * Safe to call multiple times; mounts at most once per call when config exists.
 */
export function autoInit(): PixelHandle | null {
  const config = readScriptConfig();
  if (!config) return null;

  const run = (): PixelHandle => mountPixel(config);

  if (typeof document !== "undefined" && document.readyState === "loading") {
    // Defer to DOMContentLoaded so `placed` targets exist.
    let handle: PixelHandle | null = null;
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        handle = run();
      },
      { once: true },
    );
    // Return null now; the handle resolves after DOMContentLoaded.
    return handle;
  }

  return run();
}
