import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import { runInNewContext } from "node:vm";
import { buildGalleryPage } from "../src/invitation.js";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const gallerySetup = app.slice(app.indexOf("function setupGallery("), app.indexOf("function fallbackCopy("));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

function galleryFixture({ reducedMotion = false } = {}) {
  const animations = [];
  const images = [];
  class Element {
    children = [];
    attributes = {};
    handlers = {};
    className = "";
    classList = {
      add: (name) => { this.className += ` ${name}`; },
      toggle: (name, enabled) => {
        this.className = this.className.replace(name, "").trim();
        if (enabled) this.className += ` ${name}`;
      },
    };
    setAttribute(name, value) { this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    click() { if (!this.disabled) return this.handlers.click?.(); }
    append(...children) {
      children.forEach((child) => { child.parentElement = this; });
      this.children.push(...children);
    }
    appendChild(child) { this.append(child); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [
        ...(child.tagName === selector ? [child] : []), ...child.querySelectorAll(selector),
      ]);
    }
    cloneNode() {
      const clone = new Element();
      clone.className = this.className;
      return clone;
    }
    remove() { this.parentElement.children = this.parentElement.children.filter((child) => child !== this); }
    animate(keyframes, options) {
      const completion = deferred();
      animations.push({ ...completion, keyframes, options });
      return { finished: completion.promise };
    }
  }
  const ids = Object.fromEntries(["gallery-grid", "gallery-dots", "gallery-page", "gallery-prev", "gallery-next"]
    .map((id) => [id, new Element()]));
  const viewport = new Element();
  viewport.append(ids["gallery-grid"]);
  runInNewContext(`${gallerySetup}\nsetupGallery(() => {});`, {
    document: { getElementById: (id) => ids[id], createElement: () => new Element() },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    buildGalleryPage,
    GALLERY_SIZE: 17,
    GALLERY_PER_PAGE: 6,
    createGalleryItem: (number, _open, loading = "lazy") => {
      const item = new Element();
      item.number = number;
      const image = new Element();
      image.tagName = "img";
      image.loading = loading;
      const ready = deferred();
      if (number <= 6) ready.resolve();
      image.decode = () => ready.promise;
      images.push({ image, ready });
      item.append(image);
      return item;
    },
  });
  return { ids, viewport, animations, images };
}

test("gallery keeps the current photos until new thumbnails decode, then crossfades", async () => {
  const { ids, viewport, images, animations } = galleryFixture();
  const grid = ids["gallery-grid"];
  const original = grid.children;
  const originalDot = ids["gallery-dots"].children[1];
  ids["gallery-next"].click();
  assert.equal(grid.children, original, "old photos must remain visible during loading");
  assert.equal(grid.attributes["aria-busy"], "true");
  assert.equal(ids["gallery-page"].textContent, "1 / 3");
  images.forEach(({ ready }) => ready.resolve());
  await setImmediate();
  assert.deepEqual(grid.children.map((item) => item.number), [7, 8, 9, 10, 11, 12]);
  assert.equal(viewport.children.length, 2, "outgoing photos cover the ready incoming page");
  assert.equal(viewport.children[1].attributes["aria-hidden"], "true");
  assert.equal(viewport.children[1].inert, true);
  assert.equal(animations[0].options.duration, 260);
  animations[0].resolve();
  await setImmediate();
  assert.equal(viewport.children.length, 1);
  assert.equal(grid.attributes["aria-busy"], "false");
  assert.equal(ids["gallery-page"].textContent, "2 / 3");
  assert.equal(ids["gallery-dots"].children[1], originalDot, "pagination focus targets must stay mounted");
});

test("rapid clicks and failed images cannot overlap transitions or leave controls locked", async () => {
  const { ids, viewport, images, animations } = galleryFixture();
  ids["gallery-next"].click();
  ids["gallery-next"].click();
  ids["gallery-dots"].children[2].click();
  images.forEach(({ ready }, index) => index === 6 ? ready.reject(new Error("missing photo")) : ready.resolve());
  await setImmediate();
  assert.equal(ids["gallery-page"].textContent, "2 / 3");
  assert.equal(animations.length, 1);
  animations[0].reject(new Error("animation interrupted"));
  await setImmediate();
  assert.equal(viewport.children.length, 1);
  assert.equal(ids["gallery-grid"].attributes["aria-busy"], "false");
  assert.equal(ids["gallery-next"].disabled, false);
});

test("reduced motion skips animation, keeps six/six/five paging and reuses visited photos", async () => {
  const { ids, images, animations, viewport } = galleryFixture({ reducedMotion: true });
  const firstPhoto = ids["gallery-grid"].children[0];
  ids["gallery-dots"].children[2].click();
  images.forEach(({ ready }) => ready.resolve());
  await setImmediate();
  assert.equal(ids["gallery-page"].textContent, "3 / 3");
  assert.equal(ids["gallery-grid"].children.length, 5);
  assert.equal(ids["gallery-next"].disabled, true);
  assert.equal(animations.length, 0);
  assert.equal(viewport.children.length, 1);
  ids["gallery-dots"].children[0].click();
  await setImmediate();
  assert.equal(ids["gallery-grid"].children[0], firstPhoto);
  assert.equal(ids["gallery-prev"].disabled, true);
  const imageCount = images.length;
  ids["gallery-dots"].children[0].click();
  await setImmediate();
  assert.equal(images.length, imageCount, "clicking the active page must not recreate photos");
});
