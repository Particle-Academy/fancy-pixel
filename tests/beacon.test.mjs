/**
 * sendPixelBeacon URL building. Runs against the built bundle (`pretest`
 * builds first). The long-input case is a regression test for a
 * polynomial-time trailing-slash trim: it must finish in linear time.
 */
import assert from "node:assert/strict";
import test from "node:test";

const sent = [];

Object.defineProperty(globalThis, "navigator", {
  value: {
    sendBeacon: (url) => {
      sent.push(url);
      return true;
    },
  },
  configurable: true,
  writable: true,
});

const { sendPixelBeacon } = await import("../dist/index.js");

const payload = { siteKey: "K", style: "badge", mode: "floating", visible: false, path: "/", ts: 0 };

function urlFor(endpoint) {
  sent.length = 0;
  sendPixelBeacon(endpoint, payload);
  return sent[0];
}

test("appends /pixel to an endpoint with no trailing slash", () => {
  assert.equal(urlFor("https://host/heuristics"), "https://host/heuristics/pixel");
});

test("strips one or many trailing slashes", () => {
  assert.equal(urlFor("https://host/heuristics/"), "https://host/heuristics/pixel");
  assert.equal(urlFor("https://host/heuristics///"), "https://host/heuristics/pixel");
});

test("keeps interior slashes untouched", () => {
  assert.equal(urlFor("https://host//a//b"), "https://host//a//b/pixel");
});

test("an endpoint made only of slashes becomes /pixel", () => {
  assert.equal(urlFor("////"), "/pixel");
});

test("an empty endpoint sends nothing", () => {
  sent.length = 0;
  assert.equal(sendPixelBeacon("", payload), false);
  assert.equal(sent.length, 0);
});

test("a long run of slashes that does not end the string is handled in linear time", () => {
  const endpoint = "/".repeat(50_000) + "x";
  const started = performance.now();
  const url = urlFor(endpoint);
  const elapsed = performance.now() - started;
  assert.equal(url, endpoint + "/pixel");
  assert.ok(elapsed < 100, `took ${elapsed.toFixed(1)} ms; expected well under 100 ms`);
});
