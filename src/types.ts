/**
 * Public types for @particle-academy/fancy-pixel.
 *
 * The pixel is an embeddable verification badge + liveness beacon. Three
 * visual styles, two placement modes. All styles emit the same
 * `data-fancy-badge` marker the showcase scanner already detects.
 */

/** Visual style of the pixel. */
export type PixelStyle = "badge" | "mark" | "beacon";

/** Placement mode. `placed` mounts inline at a target; `floating` pins a fixed corner. */
export type PixelMode = "placed" | "floating";

/** Options accepted by {@link mountPixel}. */
export interface MountPixelOptions {
  /** Visual style. Default `"badge"`. */
  style?: PixelStyle;
  /** Placement mode. Default `"floating"`. */
  mode?: PixelMode;
  /**
   * For `placed` mode: a CSS selector string or an Element to mount inside.
   * Ignored in `floating` mode. Defaults to `document.body`.
   */
  target?: string | Element | null;
  /** Site identifier sent with every beacon. Required for meaningful beacons. */
  siteKey?: string;
  /**
   * Base URL of the fancy-heuristics ingestion host. The pixel POSTs to
   * `${endpoint}/pixel`. If omitted, no beacon is sent.
   */
  endpoint?: string;
  /**
   * Wordmark/link target. Defaults to `https://particle.academy`.
   * Applies to `badge` (whole chip) and `mark` (glyph).
   */
  href?: string;
}

/** The payload POSTed to `${endpoint}/pixel`. Matches the frozen wire contract. */
export interface PixelBeaconPayload {
  siteKey: string;
  style: PixelStyle;
  mode: PixelMode;
  visible: boolean;
  path: string;
  ts: number;
}

/** Handle returned by {@link mountPixel} for programmatic control. */
export interface PixelHandle {
  /** The host element carrying the open shadow root and data markers. */
  readonly host: HTMLElement;
  /** Whether the pixel is currently confirmed visible by the IntersectionObserver. */
  readonly visible: boolean;
  /** Resolved options. */
  readonly options: Required<Omit<MountPixelOptions, "target">> & {
    target: string | Element | null;
  };
  /** Tear down observers and remove the host element. */
  destroy(): void;
}

/** Detail of the `fancy-pixel:shown` CustomEvent dispatched on `document`. */
export interface PixelShownEventDetail {
  style: PixelStyle;
  mode: PixelMode;
  siteKey: string;
  host: HTMLElement;
}
