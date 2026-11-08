/**
 * The command queue: `window.fancyPixelQ`.
 *
 * A page (or a Google Tag Manager template, which cannot set `data-*` on the
 * script it injects) can configure the pixel before the bundle has loaded:
 *
 *   window.fancyPixelQ = window.fancyPixelQ || [];
 *   fancyPixelQ.push(["init", { siteKey: "KEY", endpoint: "https://host/heuristics", consent: "denied" }]);
 *   fancyPixelQ.push(["consent", { analytics: true }]);
 *   fancyPixelQ.push(["route", location.href]);
 *
 * On load the queued commands run in order. The array is then replaced by an
 * object whose `push` runs each command at once, so code that keeps pushing
 * after load needs no change. Commands:
 *
 *   init     — mount a pixel (a second init for the same site key reuses it)
 *   consent  — `{ analytics: boolean, siteKey? }`, every pixel when no key
 *   route    — a navigation finished: record a view
 *   features — reserved for a later release; ignored
 *
 * Unknown or malformed commands are ignored. Nothing here can throw into the
 * host page.
 */
import { mountPixel } from "./mount.js";
import type { MountPixelOptions, PixelHandle } from "./types.js";

export type PixelCommand =
  | ["init", MountPixelOptions]
  | ["consent", { analytics: boolean; siteKey?: string }]
  | ["route", string?]
  | ["features", unknown];

interface QueueHolder {
  fancyPixelQ?: unknown;
  __fancyPixel?: Record<string, PixelHandle>;
}

function handles(siteKey?: string): PixelHandle[] {
  const all = (globalThis as QueueHolder).__fancyPixel ?? {};
  if (siteKey) return all[siteKey] ? [all[siteKey]] : [];
  return Object.values(all);
}

export function runCommand(cmd: unknown): void {
  if (!Array.isArray(cmd) || typeof cmd[0] !== "string") return;
  const [name, arg] = cmd as [string, unknown];
  try {
    switch (name) {
      case "init":
        if (arg && typeof arg === "object") mountPixel(arg as MountPixelOptions);
        return;
      case "consent": {
        if (!arg || typeof arg !== "object") return;
        const { analytics, siteKey } = arg as { analytics?: unknown; siteKey?: unknown };
        if (typeof analytics !== "boolean") return;
        for (const h of handles(typeof siteKey === "string" ? siteKey : undefined)) h.setConsent(analytics);
        return;
      }
      case "route":
        for (const h of handles()) h.view();
        return;
      default:
        // "features" and anything unknown: ignored.
        return;
    }
  } catch {
    /* never break the host page */
  }
}

/**
 * Run every queued command, then make later pushes run immediately.
 * Safe to call more than once.
 */
export function processQueue(): void {
  const g = globalThis as QueueHolder;
  const q = g.fancyPixelQ;
  if (Array.isArray(q)) {
    for (const cmd of q.splice(0)) runCommand(cmd);
  }
  if (!q || Array.isArray(q)) {
    g.fancyPixelQ = {
      push: (...cmds: unknown[]): number => {
        for (const c of cmds) runCommand(c);
        return 0;
      },
    };
  }
}
