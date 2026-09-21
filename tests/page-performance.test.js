import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = app.slice(app.indexOf("function setupRevealAnimations("), app.indexOf("function addPetals("));

test("sections reveal through an observer without per-scroll layout scans", () => {
  let callback;
  let options;
  const listeners = [];
  const sections = Array.from({ length: 3 }, () => ({
    visible: false,
    classList: { add() { this.visible = true; }, contains() { return false; } },
    getBoundingClientRect: () => ({ top: 2000 }),
  }));
  const watched = new Set();
  class Observer {
    constructor(handler, settings) { callback = handler; options = settings; }
    observe(section) { watched.add(section); }
    unobserve(section) { watched.delete(section); }
  }
  runInNewContext(`${setup}\nsetupRevealAnimations();`, {
    document: { querySelectorAll: () => sections }, IntersectionObserver: Observer,
    window: { matchMedia: () => ({ matches: false }), IntersectionObserver: Observer, innerHeight: 800,
      addEventListener: (type) => listeners.push(type) },
  });
  assert.equal(listeners.includes("scroll"), false);
  assert.equal(options.rootMargin, "0px 0px 120px");
  callback([{ target: sections[0], isIntersecting: true }]);
  assert.equal(sections[0].classList.visible, true);
  assert.equal(watched.has(sections[0]), false);
});

test("the cover is discovered early and decorative transitions have shorter delays", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /<link rel="preload" as="image" href="\.\/images\/cover\.webp" fetchpriority="high">/);
  assert.match(css, /\.fade-section\s*\{[^}]*transition:\s*opacity 0\.3s/s);
  assert.match(css, /\.account-dialog\[open\]\s*\{[^}]*animation:\s*dialog-up 0\.18s/s);
});
