import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const gallerySetup = app.slice(app.indexOf("function setupGallery("), app.indexOf("function fallbackCopy("));

function galleryFixture({ reducedMotion = false, mode = "normal", size = 18, animate = true } = {}) {
  const animations = [], images = [], opened = [], scrolls = [];
  class Element {
    children = [];
    attributes = {};
    handlers = {};
    hidden = false;
    inert = false;
    textContent = "";
    scrollHeight = 900;
    classList = { toggle() {}, add() {} };
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(type, handler) { this.handlers[type] = handler; }
    click() { return this.handlers.click?.(); }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); }
    replaceChildren(...children) { this.children = [...children]; }
    getBoundingClientRect() { return { top: -500 }; }
    focus(options) { this.focusOptions = options; }
    animate(keyframes, options) {
      let resolve, reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      animations.push({ keyframes, options, resolve, reject });
      return { finished };
    }
  }
  const ids = Object.fromEntries([
    "gallery-grid", "gallery-more", "gallery-more-grid", "gallery-disclosure", "gallery-toggle-label", "gallery-announcement",
  ].map((id) => [id, new Element()]));
  const section = new Element();
  const invitation = { dataset: { mode } };
  if (!animate) ids["gallery-more"].animate = undefined;
  runInNewContext(gallerySetup + "\nsetupGallery(openViewer);", {
    document: {
      getElementById: (id) => ids[id], createElement: () => new Element(),
      querySelector: (selector) => selector === ".gallery-section" ? section : invitation,
    },
    window: { matchMedia: () => ({ matches: reducedMotion }), scrollY: 1000, scrollTo: (options) => scrolls.push(options) },
    GALLERY_SIZE: size, GALLERY_INITIAL_COUNT: 3,
    openViewer: (number) => opened.push(number),
    createGalleryItem: (number, openViewer, loading = "lazy") => {
      const item = new Element();
      item.number = number;
      item.addEventListener("click", () => openViewer(number));
      images.push({ number, loading });
      return item;
    },
  });
  return { ids, animations, images, opened, scrolls, mode: (value) => { invitation.dataset.mode = value; } };
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
    assert.equal(ids["gallery-toggle-label"].textContent, "사진 접기");
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

test("gallery expansion survives theme switching and keeps photo nodes", async () => {
  const f = galleryFixture({ reducedMotion: true });
  await f.ids["gallery-disclosure"].click();
  const fourth = f.ids["gallery-more-grid"].children[0];
  for (const mode of ["switching", "developer", "normal"]) f.mode(mode);
  assert.equal(f.ids["gallery-more"].hidden, false);
  assert.equal(f.ids["gallery-more-grid"].children[0], fourth);
  assert.equal(f.ids["gallery-disclosure"].attributes["aria-expanded"], "true");
  await f.ids["gallery-disclosure"].click();
  assert.equal(f.ids["gallery-more"].hidden, true);
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
  assert.equal(f.animations[1].options.duration, 280);
  f.animations[1].resolve();
  await closing;
  assert.equal(f.ids["gallery-more"].hidden, true);
  assert.equal(f.ids["gallery-disclosure"].attributes["aria-expanded"], "false");
  assert.ok(f.scrolls.length > 0, "collapse returns an off-screen gallery into view");
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
