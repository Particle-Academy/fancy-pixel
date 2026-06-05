/**
 * Tests for the built ESM bundle (dist/index.js). Runs on `node --test` with
 * a tiny hand-rolled DOM/beacon shim — no runtime test-lib dependency.
 *
 * Run after `npm run build`.
 */
import assert from "node:assert/strict";
import test from "node:test";

// --- Minimal DOM shim -------------------------------------------------------
// Just enough surface for mountPixel: element creation, attachShadow, append,
// data markers, CustomEvent dispatch, and a capturing IntersectionObserver.

const beacons = [];
let lastIO = null;

// --- Collector stub ---------------------------------------------------------
// fancy-pixel bundles @particle-academy/fancy-heuristics-js and starts a real
// collector (timers + listeners) whenever an endpoint is set. We swap in a stub
// via the exported __setCollectorFactory test seam so tests stay hermetic — no
// open setInterval handles, no network — and we can assert start/stop wiring.

const collectors = [];

function makeCollectorStub(opts) {
  const stub = {
    opts,
    started: false,
    stopped: false,
    flushed: 0,
    start() {
      this.started = true;
    },
    stop() {
      this.stopped = true;
    },
    flush() {
      this.flushed++;
    },
  };
  collectors.push(stub);
  return stub;
}

class FakeClassList {
  add() {}
}
class FakeStyle {
  cssText = "";
}
class FakeShadowRoot {
  innerHTML = "";
  mode = "open";
}
class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.attributes = {};
    this.children = [];
    this.style = new FakeStyle();
    this.classList = new FakeClassList();
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
  attachShadow({ mode }) {
    this.shadowRoot = new FakeShadowRoot();
    this.shadowRoot.mode = mode;
    return this.shadowRoot;
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentNode) {
      const i = this.parentNode.children.indexOf(this);
      if (i >= 0) this.parentNode.children.splice(i, 1);
      this.parentNode = null;
    }
  }
}

class FakeCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

function installDom() {
  beacons.length = 0;
  lastIO = null;
  collectors.length = 0;
  // Every mount goes through the stub factory unless a test overrides it.
  __setCollectorFactory(makeCollectorStub);

  const docListeners = {};
  const body = new FakeElement("body");

  const define = (name, value) =>
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });

  define("document", {
    body,
    readyState: "complete",
    createElement: (tag) => new FakeElement(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, cb) => {
      (docListeners[type] ||= []).push(cb);
    },
    dispatchEvent: (ev) => {
      (docListeners[ev.type] || []).forEach((cb) => cb(ev));
      return true;
    },
    currentScript: null,
  });

  define("Element", FakeElement);
  define("location", { pathname: "/demo" });
  define("CustomEvent", FakeCustomEvent);
  define(
    "Blob",
    class {
      constructor(parts) {
        this.parts = parts;
      }
    },
  );
  define("navigator", {
    sendBeacon: (url, blob) => {
      beacons.push({ url, body: blob.parts.join(""), via: "sendBeacon" });
      return true;
    },
  });

  define(
    "IntersectionObserver",
    class {
    constructor(cb, opts) {
      this.cb = cb;
      this.opts = opts;
      this.targets = [];
      lastIO = this;
    }
    observe(el) {
      this.targets.push(el);
    }
    disconnect() {
      this.targets = [];
    }
    // Test helper: simulate an intersection report.
    fire(isIntersecting, ratio, width, height) {
      this.cb(
        [
          {
            isIntersecting,
            intersectionRatio: ratio,
            boundingClientRect: { width, height },
            target: this.targets[0],
          },
        ],
        this,
      );
    }
    },
  );

  return { body };
}

const mod = await import("../dist/index.js");
const { mountPixel, __setCollectorFactory } = mod;

test("mountPixel renders an open shadow root with the required markers", () => {
  const { body } = installDom();
  const handle = mountPixel({
    style: "badge",
    mode: "floating",
    siteKey: "ACME",
    endpoint: "https://host/heuristics",
  });

  const host = handle.host;
  assert.equal(host.parentNode, body, "floating mounts on document.body");
  assert.ok(host.hasAttribute("data-fancy-pixel"), "stable handle present");
  assert.ok(host.hasAttribute("data-fancy-badge"), "scanner marker present");
  assert.equal(host.getAttribute("data-fancy-pixel-style"), "badge");
  assert.ok(host.shadowRoot, "shadow root attached");
  assert.equal(host.shadowRoot.mode, "open", "shadow root is open");
  assert.match(host.shadowRoot.innerHTML, /Powered by/, "badge wordmark rendered");
  handle.destroy();
});

test("mark + beacon styles render their glyph/dot", () => {
  installDom();
  const mark = mountPixel({ style: "mark", mode: "placed" });
  assert.equal(mark.host.getAttribute("data-fancy-pixel-style"), "mark");
  assert.match(mark.host.shadowRoot.innerHTML, /fp-mark/);
  // No *visible* wordmark element (aria-label still says "Powered by" for a11y).
  assert.doesNotMatch(mark.host.shadowRoot.innerHTML, /fp-name/);
  assert.doesNotMatch(mark.host.shadowRoot.innerHTML, /fp-by/);

  const beacon = mountPixel({ style: "beacon", mode: "floating" });
  assert.match(beacon.host.shadowRoot.innerHTML, /fp-pulse/);
});

test("emits a mount beacon and a visibility beacon on intersection", () => {
  installDom();
  const handle = mountPixel({
    style: "badge",
    mode: "floating",
    siteKey: "ACME",
    endpoint: "https://host/heuristics/",
  });

  // Mount beacon fired with visible:false.
  assert.equal(beacons.length, 1, "one beacon on mount");
  assert.equal(beacons[0].url, "https://host/heuristics/pixel", "trailing slash normalised");
  const mountPayload = JSON.parse(beacons[0].body);
  assert.equal(mountPayload.siteKey, "ACME");
  assert.equal(mountPayload.style, "badge");
  assert.equal(mountPayload.mode, "floating");
  assert.equal(mountPayload.visible, false);
  assert.equal(mountPayload.path, "/demo");
  assert.equal(typeof mountPayload.ts, "number");

  // Simulate becoming visible.
  lastIO.fire(true, 0.9, 120, 32);
  assert.equal(beacons.length, 2, "visibility change fires a second beacon");
  assert.equal(JSON.parse(beacons[1].body).visible, true);

  // Same visibility state again -> no duplicate beacon.
  lastIO.fire(true, 1, 120, 32);
  assert.equal(beacons.length, 2, "no beacon when visibility is unchanged");

  handle.destroy();
});

test("dispatches fancy-pixel:shown once on first visibility", () => {
  installDom();
  const seen = [];
  document.addEventListener("fancy-pixel:shown", (ev) => seen.push(ev.detail));

  mountPixel({ style: "mark", mode: "floating", siteKey: "K", endpoint: "https://h/heuristics" });
  lastIO.fire(true, 1, 22, 22);
  lastIO.fire(false, 0, 22, 22);
  lastIO.fire(true, 1, 22, 22);

  assert.equal(seen.length, 1, "shown dispatched exactly once");
  assert.equal(seen[0].style, "mark");
  assert.equal(seen[0].siteKey, "K");
});

test("zero-size intersection counts as not visible", () => {
  installDom();
  mountPixel({ style: "badge", mode: "floating", siteKey: "K", endpoint: "https://h/heuristics" });
  // isIntersecting true but 0x0 (e.g. display:none ancestor) -> not visible.
  lastIO.fire(true, 1, 0, 0);
  // Only the mount beacon; no visibility-true beacon emitted.
  assert.equal(beacons.length, 1);
  assert.equal(JSON.parse(beacons[0].body).visible, false);
});

test("no beacon when endpoint omitted", () => {
  installDom();
  mountPixel({ style: "badge", mode: "floating", siteKey: "K" });
  assert.equal(beacons.length, 0, "no endpoint => no network");
});

test("invalid style/mode fall back to badge/floating", () => {
  const { body } = installDom();
  const handle = mountPixel({ style: "nope", mode: "bogus", endpoint: "" });
  assert.equal(handle.options.style, "badge");
  assert.equal(handle.options.mode, "floating");
  assert.equal(handle.host.parentNode, body);
});

// --- All-in-one collector wiring -------------------------------------------

test("starts the interaction collector when an endpoint is set", () => {
  installDom();
  const handle = mountPixel({
    style: "badge",
    mode: "floating",
    siteKey: "ACME",
    endpoint: "https://host/heuristics",
  });

  assert.equal(collectors.length, 1, "exactly one collector created");
  assert.equal(collectors[0].started, true, "collector started");
  // siteKey + endpoint flow through to the collector (the /collect contract).
  assert.equal(collectors[0].opts.siteKey, "ACME");
  assert.equal(collectors[0].opts.endpoint, "https://host/heuristics");
  assert.equal(handle.collector, collectors[0], "handle exposes the live collector");
  assert.equal(handle.options.collect, true, "collect resolves on by default");
  handle.destroy();
});

test("does NOT start the collector when no endpoint is given (badge only)", () => {
  installDom();
  const handle = mountPixel({ style: "badge", mode: "floating", siteKey: "K" });
  assert.equal(collectors.length, 0, "no endpoint => no collector, no network");
  assert.equal(handle.collector, null, "handle.collector is null");
  handle.destroy();
});

test("destroy() stops the collector", () => {
  installDom();
  const handle = mountPixel({
    siteKey: "K",
    endpoint: "https://h/heuristics",
  });
  const c = collectors[0];
  assert.equal(c.started, true);
  assert.equal(c.stopped, false);

  handle.destroy();
  assert.equal(c.stopped, true, "destroy() stopped the collector");
  assert.equal(handle.collector, null, "collector cleared after destroy");

  // Idempotent: a second destroy must not throw or double-stop.
  handle.destroy();
  assert.equal(collectors.length, 1, "no extra collector spawned");
});

test("collect:false suppresses the collector (beacon still fires)", () => {
  installDom();
  const handle = mountPixel({
    siteKey: "K",
    endpoint: "https://h/heuristics",
    collect: false,
  });
  assert.equal(collectors.length, 0, "collect:false => collector never created");
  assert.equal(handle.collector, null, "no collector handle");
  assert.equal(handle.options.collect, false, "collect:false reflected in options");
  // The liveness beacon is independent of analytics collection.
  assert.equal(beacons.length, 1, "mount beacon still sent");
  handle.destroy();
});

test("a collector failure never breaks the mount (badge survives)", () => {
  installDom();
  __setCollectorFactory(() => {
    throw new Error("boom");
  });
  const handle = mountPixel({ siteKey: "K", endpoint: "https://h/heuristics" });
  assert.equal(handle.collector, null, "failed collector => null handle");
  assert.ok(handle.host.hasAttribute("data-fancy-badge"), "badge still rendered");
  // destroy() must be safe even with no collector.
  handle.destroy();
});
