import type { PixelMode, PixelStyle } from "./types.js";

/**
 * The Fancy UI logo glyph as an inline SVG string. A rounded-square mark with
 * an orbiting particle — self-contained, no external asset, scales cleanly.
 */
function logoGlyph(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" style="display:block;flex:0 0 auto;">
  <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#fp-grad)"/>
  <circle cx="9" cy="9" r="3" fill="#fff"/>
  <circle cx="16.5" cy="15" r="1.6" fill="#fff" opacity="0.85"/>
  <defs>
    <linearGradient id="fp-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7c5cff"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
</svg>`;
}

/**
 * Reset rules applied to the shadow root host's internal wrapper. Because we
 * render inside an open Shadow DOM, host page CSS cannot reach in to hide or
 * restyle these — visibility is part of the verification contract.
 */
const RESET = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .fp-root {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
  }
  .fp-link {
    text-decoration: none;
    color: inherit;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }
  @keyframes fp-pulse {
    0%   { transform: scale(0.85); opacity: 0.55; }
    50%  { transform: scale(1);    opacity: 1;    }
    100% { transform: scale(0.85); opacity: 0.55; }
  }
  @media (prefers-reduced-motion: reduce) {
    .fp-pulse, .fp-pulse-ring { animation: none !important; }
  }
`;

/** Positioning styles for the host element, by mode. */
export function hostStyleFor(mode: PixelMode): string {
  if (mode === "floating") {
    return [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:2147483647",
      // A fixed corner element must not capture clicks across the page; only
      // the chip itself is interactive (pointer-events re-enabled inside).
      "pointer-events:none",
    ].join(";");
  }
  // placed: inline, flows with the target. Stays interactive.
  return ["display:inline-block", "vertical-align:middle"].join(";");
}

/** Build the inner HTML of the shadow root for a given style. */
function innerFor(style: PixelStyle, href: string): string {
  const linkAttrs = `class="fp-link" href="${href}" target="_blank" rel="noopener noreferrer" part="link" data-fancy-pixel-link`;

  if (style === "mark") {
    return `<style>${RESET}
      .fp-mark {
        pointer-events:auto;
        display:inline-flex; align-items:center; justify-content:center;
        padding:6px; border-radius:10px;
        background:rgba(17,17,27,0.92);
        box-shadow:0 2px 10px rgba(0,0,0,0.25);
      }
    </style>
    <div class="fp-root" part="root">
      <a ${linkAttrs} aria-label="Powered by Fancy UI">
        <span class="fp-mark">${logoGlyph(22)}</span>
      </a>
    </div>`;
  }

  if (style === "beacon") {
    return `<style>${RESET}
      .fp-beacon {
        pointer-events:auto;
        position:relative; display:inline-flex;
        width:14px; height:14px;
      }
      .fp-dot {
        position:absolute; inset:3px;
        border-radius:50%;
        background:linear-gradient(135deg,#7c5cff,#22d3ee);
      }
      .fp-pulse-ring {
        position:absolute; inset:0;
        border-radius:50%;
        background:radial-gradient(circle,#22d3ee 0%,rgba(34,211,238,0) 70%);
        animation:fp-pulse 1.8s ease-in-out infinite;
      }
    </style>
    <div class="fp-root" part="root">
      <a ${linkAttrs} aria-label="Powered by Fancy UI">
        <span class="fp-beacon">
          <span class="fp-pulse-ring fp-pulse"></span>
          <span class="fp-dot"></span>
        </span>
      </a>
    </div>`;
  }

  // badge (default): wordmark + glyph chip.
  return `<style>${RESET}
    .fp-badge {
      pointer-events:auto;
      display:inline-flex; align-items:center; gap:8px;
      padding:7px 11px; border-radius:999px;
      background:rgba(17,17,27,0.92);
      color:#f5f5fa;
      font-size:12px; font-weight:600; letter-spacing:0.01em;
      box-shadow:0 2px 12px rgba(0,0,0,0.28);
      border:1px solid rgba(124,92,255,0.35);
      transition:transform 120ms ease;
    }
    .fp-badge:hover { transform:translateY(-1px); }
    .fp-by { opacity:0.7; font-weight:500; }
    .fp-name {
      background:linear-gradient(135deg,#a78bfa,#22d3ee);
      -webkit-background-clip:text; background-clip:text;
      -webkit-text-fill-color:transparent; color:transparent;
      font-weight:700;
    }
  </style>
  <div class="fp-root" part="root">
    <a ${linkAttrs} aria-label="Powered by Fancy UI">
      <span class="fp-badge">
        ${logoGlyph(16)}
        <span><span class="fp-by">Powered by</span> <span class="fp-name">Fancy UI</span></span>
      </span>
    </a>
  </div>`;
}

/**
 * Create the host element + open shadow root for a pixel.
 *
 * The host carries the stable, host-CSS-proof markers:
 *  - `data-fancy-pixel`        — the stable agent/scanner handle
 *  - `data-fancy-badge`        — the marker ScanShowcaseSubmission detects
 *  - `data-fancy-pixel-style`  — the active style
 *
 * @returns the host element (shadow root already populated).
 */
export function createPixelHost(
  style: PixelStyle,
  mode: PixelMode,
  href: string,
): HTMLElement {
  const host = document.createElement("div");
  host.setAttribute("data-fancy-pixel", "");
  host.setAttribute("data-fancy-badge", "");
  host.setAttribute("data-fancy-pixel-style", style);
  host.setAttribute("data-fancy-pixel-mode", mode);
  host.style.cssText = hostStyleFor(mode);

  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = innerFor(style, href);

  return host;
}
