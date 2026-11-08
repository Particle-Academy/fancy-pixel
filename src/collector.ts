/**
 * Thin adapter over the bundled `@particle-academy/fancy-heuristics-js`
 * collector. fancy-pixel is an all-in-one embed: when mounted with an
 * `endpoint`, it ALSO starts this collector so a single <script> delivers the
 * badge + verification beacon AND interaction analytics (views, activations,
 * active time, scroll milestones, agent activity), keyed by `siteKey`.
 *
 * The factory is indirected through a module-level reference so the (very small)
 * surface can be swapped in tests without mocking the built bundle. The
 * dependency is bundled INTO every build — including the IIFE global — so there
 * is no separate install for consumers and no bare `import`/`require` of
 * fancy-heuristics-js survives in `dist/fancy-pixel.global.min.js`.
 */
import { createCollector as realCreateCollector } from "@particle-academy/fancy-heuristics-js";
import type { PixelCollectLevel, PixelCollector, PixelConsent, PixelRoute, PixelTrack } from "./types.js";

/** Options forwarded to the underlying collector. */
export interface PixelCollectorOptions {
  siteKey: string;
  endpoint: string;
  consent?: PixelConsent;
  collect?: PixelCollectLevel;
  track?: PixelTrack;
  route?: () => PixelRoute | undefined;
  labels?: "control" | "none";
}

/** The collector factory signature fancy-pixel relies on. */
export type CollectorFactory = (opts: PixelCollectorOptions) => PixelCollector;

const real: CollectorFactory = (opts) => {
  const o: Parameters<typeof realCreateCollector>[0] = { siteKey: opts.siteKey, endpoint: opts.endpoint };
  if (opts.consent !== undefined) o.consent = opts.consent;
  if (opts.collect !== undefined) o.collect = opts.collect;
  if (opts.track !== undefined) o.track = opts.track;
  if (opts.route !== undefined) o.route = opts.route;
  if (opts.labels !== undefined) o.labels = opts.labels;
  return realCreateCollector(o);
};

let factory: CollectorFactory = real;

/**
 * Create (but do not start) an interaction collector for the given site/endpoint.
 * Wraps the dependency so callers never touch its types directly.
 */
export function createPixelCollector(opts: PixelCollectorOptions): PixelCollector {
  return factory(opts);
}

/**
 * Test seam: override the collector factory. Exported from the package root so
 * the built bundle exposes it; pass `null` to restore the real implementation.
 * Not part of the supported public API — for tests and embedding hosts only.
 */
export function __setCollectorFactory(next: CollectorFactory | null): void {
  factory = next ?? real;
}
