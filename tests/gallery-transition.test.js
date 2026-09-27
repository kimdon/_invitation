import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const gallerySetup = app.slice(app.indexOf("function setupGallery("), app.indexOf("function fallbackCopy("));

function galleryFixture({ reducedMotion = false, mode = "normal", size = 18, developerSize = size, animate = true, sectionTop = -500 } = {}) {
  const animations = [], images = [], opened = [], scrolls = [];
  const observers = [];
  const frames = new Map();
  let frameId = 0;
  class Element {
    children = [];
    attributes = {};
    handlers = {};
    hidden = false;
    inert = false;
    textContent = "";
    scrollHeight = 900;
    classes = new Set();
    classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
    };
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    click() { return this.handlers.click?.(); }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); }
    replaceChildren(...children) { this.children = [...children]; }
    getBoundingClientRect() { return { top: sectionTop }; }
    focus(options) { this.focusOptions = options; }
    animate(keyframes, options) {
      let resolve, reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      const animation = {
        keyframes, options, resolve, reject, finished, progress: 0,
        effect: { getComputedTiming: () => ({ progress: animation.progress }) },
        cancel() { this.cancelled = true; reject(new Error("animation cancelled")); },
      };
      animations.push(animation);
      return animation;
    }
  }
  const ids = Object.fromEntries([
    "gallery-grid", "gallery-more", "gallery-more-grid", "gallery-disclosure", "gallery-toggle-label", "gallery-announcement",
  ].map((id) => [id, new Element()]));
  const section = new Element();
  const root = new Element();
  const invitation = { dataset: { mode } };
  const window = {
    matchMedia: () => ({ matches: reducedMotion }), scrollY: 1000,
    scrollTo: (options) => { scrolls.push(options); window.scrollY = options.top; },
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  if (!animate) ids["gallery-more"].animate = undefined;
  runInNewContext(gallerySetup + "\nsetupGallery(openViewer);", {
    document: {
      documentElement: root,
      getElementById: (id) => ids[id], createElement: () => new Element(),
      querySelector: (selector) => selector === ".gallery-section" ? section : invitation,
    },
    window,
    GALLERY_INITIAL_COUNT: 3,
    getGalleryPhotos: (mode) => Array(mode === "developer" ? developerSize : size),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { observers.push(this.callback); }
    },
    openViewer: (number) => opened.push(number),
    createGalleryItem: (number, openViewer, loading = "lazy", mode = "normal") => {
      const item = new Element();
      item.number = number;
      item.mode = mode;
      item.addEventListener("click", () => openViewer(number));
      images.push({ number, loading, mode });
      return item;
    },
  });
  return {
    ids, animations, images, opened, scrolls, frames, root, window,
    frame(progress) {
      animations.at(-1).progress = progress;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
    },
    mode: (value) => { invitation.dataset.mode = value; observers.forEach((callback) => callback()); },
  };
}

test("the entire gallery photo is an accessible button without a separate expand arrow", () => {
  const opened = [];
  const image = { tagName: "img" };
  const createItem = app.slice(app.indexOf("function createGalleryItem("), app.indexOf("function setupGallery("));
  const item = runInNewContext(createItem + "\ncreateGalleryItem(4, openViewer);", {
    document: { createElement: (tagName) => ({
      tagName, children: [], attributes: {}, handlers: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, handler) { this.handlers[name] = handler; },
      append(...children) { this.children.push(...children); },
    }) },
    createPlaceholder: () => ({}), loadOptionalImage: () => image,
    getGallerySources: () => ({ thumbnail: "photo.webp" }), openViewer: (number) => opened.push(number),
  });
  assert.equal(item.tagName, "button");
  assert.equal(item.type, "button");
  assert.equal(item.attributes["aria-label"], "사진 4 크게 보기");
  assert.ok(item.children.includes(image));
  assert.equal(item.children.some((child) => child.tagName === "button"), false);
  item.handlers.click();
  assert.deepEqual(opened, [4]);
});

test("theme switches reset to three photos while reusing each mode's cached items", async () => {
  const f = galleryFixture({ reducedMotion: true, developerSize: 9 });
  const normalFirst = f.ids["gallery-grid"].children[0];
  assert.ok(f.images.every((item) => item.mode === "normal"));
  f.mode("switching");
  assert.equal(f.images.length, 3);
  f.mode("developer");
  assert.ok(f.ids["gallery-grid"].children.every((item) => item.mode === "developer"));
  assert.equal(f.images.length, 6, "only three developer thumbnails load on entry");
  await f.ids["gallery-disclosure"].click();
  assert.equal(f.ids["gallery-more-grid"].children.length, 6);
  assert.equal(f.ids["gallery-announcement"].textContent, "전체 사진 9장 표시");
  const developerFirst = f.ids["gallery-grid"].children[0];
  f.mode("normal");
  assert.equal(f.ids["gallery-grid"].children[0], normalFirst);
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.ids["gallery-more"].inert, true);
  assert.equal(f.ids["gallery-toggle-label"].textContent, "더 보기");
  assert.equal(f.ids["gallery-announcement"].textContent, "전체 18장 중 3장 표시");
  await f.ids["gallery-disclosure"].click();
  assert.equal(f.ids["gallery-more-grid"].children.length, 15);
  assert.ok(f.ids["gallery-more-grid"].children.every((item) => item.mode === "normal"));
  f.mode("developer");
  assert.equal(f.ids["gallery-grid"].children[0], developerFirst);
  assert.equal(f.images.length, 27, "mode switching reuses each mode's existing image nodes");
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.ids["gallery-toggle-label"].textContent, "더 보기");
  assert.equal(f.ids["gallery-announcement"].textContent, "전체 9장 중 3장 표시");
  await f.ids["gallery-disclosure"].click();
  assert.equal(f.ids["gallery-more"].hidden, false);
  assert.equal(f.images.length, 27);
});

test("photo buttons pass their own gallery mode to the full-size viewer", () => {
  const createItem = app.slice(app.indexOf("function createGalleryItem("), app.indexOf("function setupGallery("));
  const calls = [];
  const item = runInNewContext(createItem + '\ncreateGalleryItem(2, openViewer, "lazy", "developer");', {
    document: { createElement: () => ({ handlers: {}, setAttribute() {}, append() {},
      addEventListener(name, callback) { this.handlers[name] = callback; },
    }) },
    createPlaceholder: () => ({}), loadOptionalImage: () => ({}),
    getGallerySources: (number, mode) => { calls.push(["source", number, mode]); return {}; },
    openViewer: (number, mode) => calls.push(["open", number, mode]),
  });
  item.handlers.click();
  assert.deepEqual(calls, [["source", 2, "developer"], ["open", 2, "developer"]]);
});

test("a mode change during collapse waits for cleanup before replacing the photos", async () => {
  const f = galleryFixture({ developerSize: 9 });
  const opening = f.ids["gallery-disclosure"].click();
  f.animations[0].resolve();
  await opening;
  const closing = f.ids["gallery-disclosure"].click();
  f.mode("developer");
  assert.ok(f.ids["gallery-grid"].children.every((item) => item.mode === "normal"));
  f.animations[1].resolve();
  await closing;
  assert.ok(f.ids["gallery-grid"].children.every((item) => item.mode === "developer"));
  assert.equal(f.ids["gallery-grid"].children.length, 3);
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.frames.size, 0);
});

for (const mode of ["normal", "developer"]) {
  test(mode + ": three initial photos expand to all and collapse without recreating items", async () => {
    const f = galleryFixture({ mode, reducedMotion: true });
    const { ids } = f;
    assert.deepEqual(ids["gallery-grid"].children.map((item) => item.number), [1, 2, 3]);
    assert.equal(ids["gallery-more"].hidden, true);
    assert.equal(ids["gallery-more"].inert, true);
    assert.equal(ids["gallery-more-grid"].children.length, 0, "hidden thumbnails are not requested on entry");
    assert.equal(ids["gallery-toggle-label"].textContent, "더 보기");
    const first = ids["gallery-grid"].children[0];
    await ids["gallery-disclosure"].click();
    assert.equal(ids["gallery-more"].hidden, false);
    assert.equal(ids["gallery-more"].inert, false);
    assert.equal(ids["gallery-disclosure"].attributes["aria-expanded"], "true");
    assert.deepEqual(ids["gallery-more-grid"].children.map((item) => item.number), Array.from({ length: 15 }, (_, i) => i + 4));
    assert.equal(ids["gallery-toggle-label"].textContent, "접기");
    ids["gallery-more-grid"].children[14].click();
    assert.deepEqual(f.opened, [18]);
    await ids["gallery-disclosure"].click();
    assert.equal(ids["gallery-more"].hidden, true);
    assert.equal(ids["gallery-more"].inert, true);
    assert.equal(ids["gallery-disclosure"].attributes["aria-expanded"], "false");
    assert.equal(ids["gallery-toggle-label"].textContent, "더 보기");
    assert.equal(ids["gallery-grid"].children[0], first);
    await ids["gallery-disclosure"].click();
    assert.equal(f.images.length, 18);
    assert.ok(f.images.every((image) => image.loading === "lazy"));
    assert.equal(f.animations.length, 0);
  });
}

test("returning to a mode collapses its gallery but keeps cached photo nodes", async () => {
  const f = galleryFixture({ reducedMotion: true });
  await f.ids["gallery-disclosure"].click();
  const fourth = f.ids["gallery-more-grid"].children[0];
  for (const mode of ["switching", "developer", "normal"]) f.mode(mode);
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.ids["gallery-more-grid"].children[0], fourth);
  assert.equal(f.ids["gallery-disclosure"].attributes["aria-expanded"], "false");
  await f.ids["gallery-disclosure"].click();
  assert.equal(f.ids["gallery-more"].hidden, false);
  assert.equal(f.ids["gallery-more-grid"].children[0], fourth);
});

test("a mode change during expansion still enters the next mode with three photos", async () => {
  const f = galleryFixture({ developerSize: 9 });
  const opening = f.ids["gallery-disclosure"].click();
  f.mode("developer");
  f.animations[0].resolve();
  await opening;
  assert.equal(f.ids["gallery-grid"].children.length, 3);
  assert.ok(f.ids["gallery-grid"].children.every((item) => item.mode === "developer"));
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.ids["gallery-more"].inert, true);
  assert.equal(f.ids["gallery-disclosure"].attributes["aria-expanded"], "false");
  assert.equal(f.ids["gallery-more-grid"].children.length, 0);
});

test("rapid clicks and cancelled animations cannot leave the disclosure locked", async () => {
  const f = galleryFixture();
  const opening = f.ids["gallery-disclosure"].click();
  f.ids["gallery-disclosure"].click();
  assert.equal(f.animations.length, 1);
  assert.equal(f.animations[0].options.duration, 360);
  f.animations[0].reject(new Error("animation cancelled"));
  await opening;
  assert.equal(f.ids["gallery-more"].hidden, false);
  const closing = f.ids["gallery-disclosure"].click();
  assert.equal(f.ids["gallery-more"].inert, true, "closing content leaves keyboard navigation immediately");
  assert.equal(f.animations[1].options.duration, 480);
  f.animations[1].resolve();
  await closing;
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.ids["gallery-disclosure"].attributes["aria-expanded"], "false");
  assert.ok(f.scrolls.length > 0, "collapse returns an off-screen gallery into view");
});

for (const mode of ["normal", "developer"]) {
  test(mode + ": collapse moves the viewport with the shrinking photos, not before them", async () => {
    const f = galleryFixture({ mode });
    const opening = f.ids["gallery-disclosure"].click();
    f.animations[0].resolve();
    await opening;
    const closing = f.ids["gallery-disclosure"].click();
    assert.equal(f.scrolls.length, 0, "no initial jump to the gallery heading");
    assert.equal(f.root.classList.contains("is-gallery-collapsing"), true);
    f.frame(0.25);
    assert.equal(f.window.scrollY, 871, "scroll follows one quarter of the animation progress");
    f.frame(0.75);
    assert.equal(f.window.scrollY, 613);
    f.animations[1].resolve();
    await closing;
    assert.equal(f.window.scrollY, 484);
    assert.equal(f.ids["gallery-more"].hidden, true);
    assert.equal(f.root.classList.contains("is-gallery-collapsing"), false);
    assert.equal(f.frames.size, 0);
    assert.equal(f.animations[1].cancelled, true, "release the animation after hiding its content");
  });
}

for (const sectionTop of [0, 8, 15, 80]) {
  test("collapse does not move a visible gallery at " + sectionTop + "px", async () => {
    const f = galleryFixture({ sectionTop });
    const opening = f.ids["gallery-disclosure"].click();
    f.animations[0].resolve();
    await opening;
    const closing = f.ids["gallery-disclosure"].click();
    f.frame(0.5);
    f.animations[1].resolve();
    await closing;
    assert.equal(f.scrolls.length, 0);
  });
}

test("cancelled collapse releases scrolling and allows the next expansion", async () => {
  const f = galleryFixture();
  const opening = f.ids["gallery-disclosure"].click();
  f.animations[0].resolve();
  await opening;
  const closing = f.ids["gallery-disclosure"].click();
  f.frame(0.4);
  f.animations[1].reject(new Error("animation interrupted"));
  await closing;
  assert.equal(f.frames.size, 0);
  assert.equal(f.root.classList.contains("is-gallery-collapsing"), false);
  assert.equal(f.ids["gallery-more"].hidden, true);
  const reopening = f.ids["gallery-disclosure"].click();
  f.animations[2].resolve();
  await reopening;
  assert.equal(f.ids["gallery-more"].hidden, false);
});

test("no animation API still supports opening and collapsing", async () => {
  const f = galleryFixture({ animate: false });
  await f.ids["gallery-disclosure"].click();
  await f.ids["gallery-disclosure"].click();
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.animations.length, 0);
});

test("small galleries omit an unnecessary disclosure button", () => {
  for (const size of [0, 1, 3]) {
    const f = galleryFixture({ size });
    assert.equal(f.ids["gallery-grid"].children.length, size);
    assert.equal(f.ids["gallery-disclosure"].hidden, true);
  }
});

test("gallery markup has one shared disclosure, no pagination or visible counts", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="gallery-disclosure"[^>]*aria-expanded="false"[^>]*aria-controls="gallery-more"/);
  assert.match(html, /id="gallery-more" hidden inert/);
  assert.doesNotMatch(html, /id="gallery-(?:prev|next|dots|page)"|gallery-disclosure__count/);
});
