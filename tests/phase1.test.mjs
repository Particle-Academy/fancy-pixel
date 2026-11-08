/**
 * Phase 1: the pixel forwards collection options and consent to the bundled
 * collector, mounts once per site key, and accepts a command queue
 * (`window.fancyPixelQ`) so GTM, async loaders and SPA hosts share one path.
 * Runs against the built bundle (`pretest` builds first).
 */
import assert from "node:assert/strict";
import test from "node:test";

const beacons = [];
const collectors = [];
const warnings = [];

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.attributes = {};
    this.children = [];
    this.style = { cssText: "" };
    this.shadowRoot = null;
    this.parentNode = null;
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }
  getAttribute(k) {
    return k in this.attributes ? this.attributes[k] : null;
  }
  hasAttribute(k) {
    return k in this.attributes;
  }
  attachShadow() {
    this.shadowRoot = { innerHTML: "", mode: "open" };
    return this.shadowRoot;
  }
  appendChild(c) {
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  remove() {
    if (!this.parentNode) return;
    const i = this.parentNode.children.indexOf(this);
    if (i >= 0) this.parentNode.children.splice(i, 1);
    this.parentNode = null;
  }
}

function define(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

const body = new FakeElement("body");
const listeners = {};
define("document", {
  body,
  readyState: "complete",
  title: "Home",
  visibilityState: "visible",
  referrer: "",
  createElement: (t) => new FakeElement(t),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: (t, cb) => (listeners[t] ||= []).push(cb),
  removeEventListener: () => {},
  dispatchEvent: () => true,
  currentScript: null,
});
define("Element", FakeElement);
define("location", { pathname: "/demo", search: "" });
define("CustomEvent", class {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
});
define("Blob", class {
  constructor(parts) {
    this.parts = parts;
  }
});
define("navigator", {
  sendBeacon: (url, blob) => {
    beacons.push({ url, body: blob.parts.join("") });
    return true;
  },
});
define("IntersectionObserver", class {
  observe() {}
  disconnect() {}
});
const realWarn = console.warn;
console.warn = (...args) => warnings.push(args.join(" "));

const { mountPixel, processQueue, __setCollectorFactory } = await import("../dist/index.js");

function stubFactory(opts) {
  const stub = {
    opts,
    started: 0,
    stopped: 0,
    consent: [],
    views: 0,
    start() {
      this.started++;
    },
    stop() {
      this.stopped++;
    },
    flush() {},
    setConsent(g) {
      this.consent.push(g);
    },
    view() {
      this.views++;
    },
  };
  collectors.push(stub);
  return stub;
}

function reset() {
  beacons.length = 0;
  collectors.length = 0;
  warnings.length = 0;
  body.children.length = 0;
  __setCollectorFactory(stubFactory);
  delete globalThis.__fancyPixel;
  delete globalThis.fancyPixelQ;
}

test("forwards consent, collection level, track, route and labels to the collector", () => {
  reset();
  const route = () => ({ name: "home" });
  const h = mountPixel({
    siteKey: "A",
    endpoint: "https://h/heuristics",
    consent: "denied",
    collectLevel: "research",
    track: { agent: false },
    route,
    labels: "none",
  });
  const o = collectors[0].opts;
  assert.equal(o.siteKey, "A");
  assert.equal(o.endpoint, "https://h/heuristics");
  assert.equal(o.consent, "denied");
  assert.equal(o.collect, "research");
  assert.deepEqual(o.track, { agent: false });
  assert.equal(o.route, route);
  assert.equal(o.labels, "none");
  h.destroy();
});

test("handle.setConsent and handle.view reach the collector", () => {
  reset();
  const h = mountPixel({ siteKey: "B", endpoint: "https://h/heuristics", consent: "denied" });
  h.setConsent(true);
  h.view();
  assert.deepEqual(collectors[0].consent, [true]);
  assert.equal(collectors[0].views, 1);
  h.destroy();
});

test("a second mount with the same site key reuses the first: one pill, one collector, one warning", () => {
  reset();
  const a = mountPixel({ siteKey: "SAME", endpoint: "https://h/heuristics" });
  const b = mountPixel({ siteKey: "SAME", endpoint: "https://h/heuristics", consent: "granted" });
  assert.equal(b, a);
  assert.equal(body.children.length, 1);
  assert.equal(collectors.length, 1);
  assert.equal(warnings.length, 1);
  assert.deepEqual(collectors[0].consent, [true], "the second init's consent updates the first");

  a.destroy();
  const c = mountPixel({ siteKey: "SAME", endpoint: "https://h/heuristics" });
  assert.notEqual(c, a, "after destroy a fresh mount is allowed");
  c.destroy();
});

test("the command queue mounts, forwards consent and route, and keeps working after load", () => {
  reset();
  globalThis.fancyPixelQ = [
    ["init", { siteKey: "Q", endpoint: "https://h/heuristics", consent: "denied" }],
    ["consent", { analytics: true }],
  ];
  processQueue();
  assert.equal(collectors.length, 1);
  assert.deepEqual(collectors[0].consent, [true]);

  // After load, push runs commands immediately.
  globalThis.fancyPixelQ.push(["route", "/next"]);
  assert.equal(collectors[0].views, 1);
  globalThis.fancyPixelQ.push(["init", { siteKey: "Q", endpoint: "https://h/heuristics" }]);
  assert.equal(collectors.length, 1, "a repeated init does not mount twice");
  globalThis.fancyPixelQ.push(["consent", { analytics: false }]);
  assert.deepEqual(collectors[0].consent, [true, false]);
  globalThis.__fancyPixel.Q.destroy();
});

test("unknown queue commands are ignored without throwing", () => {
  reset();
  globalThis.fancyPixelQ = [["features", { plan: "pro" }], ["nonsense"], "garbage"];
  assert.doesNotThrow(() => processQueue());
  assert.equal(collectors.length, 0);
});

test("the bundled collector is the v2 one: consent denied sends nothing, granting sends a v2 view", () => {
  reset();
  __setCollectorFactory(null); // the real bundled collector
  const h = mountPixel({ siteKey: "REAL", endpoint: "https://h/heuristics", consent: "denied" });
  h.collector.flush();
  assert.equal(beacons.filter((b) => b.url.endsWith("/collect")).length, 0);

  h.setConsent(true);
  h.destroy(); // stop() flushes
  const collects = beacons.filter((b) => b.url.endsWith("/collect")).map((b) => JSON.parse(b.body));
  assert.equal(collects.length, 1);
  assert.equal(collects[0].schemaVersion, 2);
  assert.equal(collects[0].events[0].name, "ui.view");
  assert.equal(collects[0].events[0].title, "Home");
});

test.after(() => {
  console.warn = realWarn;
});

// ── consent is denied by default (owner ruling, 2026-11-08) ─────────────────────

test("a pixel with no consent option collects and sends nothing", () => {
  reset();
  __setCollectorFactory(null); // the real bundled collector
  const h = mountPixel({ siteKey: "NOCONSENT", endpoint: "https://h/heuristics" });
  h.collector.flush();
  h.destroy();
  assert.equal(beacons.filter((b) => b.url.endsWith("/collect")).length, 0, "nothing sent to /collect");
  assert.equal(beacons.filter((b) => b.url.endsWith("/pixel")).length, 1, "the liveness beacon still fires");
});

test("a pixel with an explicit grant collects", () => {
  for (const consent of [true, "granted", () => true]) {
    reset();
    __setCollectorFactory(null);
    const h = mountPixel({ siteKey: "GRANTED", endpoint: "https://h/heuristics", consent });
    h.destroy();
    const collects = beacons.filter((b) => b.url.endsWith("/collect")).map((b) => JSON.parse(b.body));
    assert.equal(collects.length, 1, `consent ${String(consent)}`);
    assert.equal(collects[0].events[0].name, "ui.view");
  }
});
