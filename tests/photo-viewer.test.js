import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import { runInNewContext } from "node:vm";
import { getGallerySources } from "../src/invitation.js";

const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = source.slice(source.indexOf("function setupPhotoViewer("), source.indexOf("function createGalleryItem("));
const legacyLoader = source.slice(source.indexOf("function loadOptionalImage("), source.indexOf("function renderCoverPhoto("));
const zoomSetup = source.slice(source.indexOf("function setupZoomPrevention("), source.indexOf("function createPlaceholder("));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

function fixture({ reducedMotion = false, saveData = true, effectiveType = "4g" } = {}) {
  const images = [];
  const animations = [];
  class Element {
    children = [];
    listeners = {};
    attributes = {};
    style = {};
    classes = new Set();
    classList = { add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name) };
    constructor(tag = "div") {
      this.tagName = tag;
      if (tag === "img") {
        this.ready = deferred();
        images.push(this);
      }
    }
    set textContent(value) { this.text = value; this.children = []; }
    get textContent() { return (this.text ?? "") + this.children.map((child) => child.textContent).join(""); }
    append(...children) {
      children.forEach((child) => { child.remove(); child.parentElement = this; this.children.push(child); });
    }
    replaceChildren(...children) { this.children.forEach((child) => { child.parentElement = null; }); this.children = []; this.text = ""; this.append(...children); }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this); this.parentElement = null; }
    contains(node) { return node === this || this.children.some((child) => child.contains(node)); }
    closest(selector) {
      for (let node = this; node; node = node.parentElement) if (selector.split(", ").includes(node.tagName)) return node;
      return null;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(type, callback, options = {}) { (this.listeners[type] ??= []).push({ callback, capture: !!options.capture }); }
    dispatch(type, details = {}) {
      const event = { type, target: this, cancelable: true, defaultPrevented: false, timeStamp: 1000,
        preventDefault() { this.defaultPrevented = true; }, ...details };
      const path = [];
      for (let node = this; node; node = node.parentElement) path.push(node);
      for (const node of [...path].reverse()) for (const listener of node.listeners[type] ?? []) if (listener.capture) listener.callback(event);
      for (const node of path) for (const listener of node.listeners[type] ?? []) if (!listener.capture) listener.callback(event);
      return event;
    }
    click() { if (!this.disabled) this.dispatch("click"); }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatch("close"); }
    decode() { return this.ready.promise; }
    animate(keyframes, options) {
      const done = deferred();
      const animation = { ...done, target: this, keyframes, options, finished: done.promise, cancel: () => done.reject(new Error("cancelled")) };
      animations.push(animation);
      return animation;
    }
  }
  const ids = Object.fromEntries(["photo-viewer", "photo-viewer-content", "photo-viewer-label", "photo-viewer-close", "photo-viewer-prev", "photo-viewer-next", "photo-viewer-status"]
    .map((id) => [id, new Element(/-(close|prev|next)$/.test(id) ? "button" : "div")]));
  const dialog = ids["photo-viewer"];
  dialog.append(...Object.entries(ids).filter(([id]) => id !== "photo-viewer").map(([, element]) => element));
  const body = new Element();
  const document = new Element();
  document.body = body;
  document.createElement = (tag) => new Element(tag);
  document.getElementById = (id) => ids[id];
  body.append(dialog);
  document.append(body);
  const show = runInNewContext(`${legacyLoader}\n${zoomSetup}\n${setup}\n${zoomSetup ? "setupZoomPrevention();" : ""}\nsetupPhotoViewer();`, {
    document, window: { matchMedia: () => ({ matches: reducedMotion }) }, getGallerySources, GALLERY_SIZE: 17,
    navigator: { connection: { saveData, effectiveType } },
  });
  const resolveImage = async (index) => { images[index].naturalWidth = 1200; images[index].dispatch("load"); images[index].ready.resolve(); await setImmediate(); };
  return { ids, images, animations, show, resolveImage, document };
}

test("viewer keeps the visible photo while decoding and slides separate panes without opacity", async () => {
  const { ids, images, animations, show, resolveImage } = fixture();
  show(1);
  assert.doesNotMatch(ids["photo-viewer-content"].textContent, /사진이 없습니다/);
  assert.equal(ids["photo-viewer-status"].textContent, "", "initial loading is silent too");
  await resolveImage(0);
  const first = ids["photo-viewer-content"].children[0];
  ids["photo-viewer-next"].click();
  assert.equal(ids["photo-viewer-status"].textContent, "", "loading copy must never appear during navigation");
  assert.equal(ids["photo-viewer-content"].children[0], first);
  assert.equal(ids["photo-viewer-label"].textContent, "1 / 17");
  assert.equal(ids["photo-viewer-content"].attributes["aria-busy"], "true");
  ids["photo-viewer-next"].click();
  assert.equal(images.length, 2, "rapid navigation must not start overlapping requests");
  await resolveImage(1);
  assert.equal(animations.length, 1);
  assert.equal(animations[0].options.duration, 160);
  assert.equal(animations[0].target.children.length, 2);
  assert.equal(animations[0].keyframes[1].transform, "translateX(-100%)");
  assert.ok(animations[0].keyframes.every((frame) => !("opacity" in frame)));
  animations[0].resolve();
  await setImmediate();
  assert.equal(ids["photo-viewer-label"].textContent, "2 / 17");
  assert.equal(ids["photo-viewer-content"].children.length, 1);
  assert.equal(ids["photo-viewer-content"].attributes["aria-busy"], "false");
  ids["photo-viewer-prev"].click();
  await setImmediate();
  assert.equal(images.length, 2, "the previous decoded photo is reused");
  assert.equal(animations[1].keyframes[0].transform, "translateX(-100%)");
  assert.equal(animations[1].keyframes[1].transform, "translateX(0)");
  animations[1].resolve();
  await setImmediate();
  assert.equal(ids["photo-viewer-label"].textContent, "1 / 17");
});

test("viewer warms only adjacent photos and reuses them on navigation", async () => {
  const { ids, images, show, resolveImage } = fixture({ saveData: false, reducedMotion: true });
  assert.equal(images.length, 0, "no full photos load before the viewer opens");
  show(1);
  assert.equal(images.length, 1);
  await resolveImage(0);
  assert.deepEqual(images.map(image => image.alt), ["사진 1", "사진 2", "사진 17"]);
  await resolveImage(1);
  await resolveImage(2);
  ids["photo-viewer-next"].click();
  await setImmediate();
  assert.equal(ids["photo-viewer-label"].textContent, "2 / 17");
  assert.equal(ids["photo-viewer-content"].children[0].children[0], images[1]);
  assert.equal(images.length, 4, "only the next new neighbor is prefetched");
  assert.equal(images[3].alt, "사진 3");
  ids["photo-viewer-prev"].click();
  await setImmediate();
  assert.equal(ids["photo-viewer-label"].textContent, "1 / 17");
  assert.equal(images.length, 5, "the distant cached photo was evicted instead of retaining all photos");
  assert.equal(images[4].alt, "사진 17");
});

test("prefetch failures remain silent and can be retried by navigation", async () => {
  const { ids, images, show, resolveImage } = fixture({ saveData: false, reducedMotion: true });
  show(1);
  await resolveImage(0);
  assert.equal(images.length, 3, "adjacent prefetch requests should exist");
  images[1].ready.reject(new Error("prefetch failed"));
  await setImmediate();
  assert.equal(ids["photo-viewer-status"].textContent, "");
  ids["photo-viewer-next"].click();
  assert.equal(images[3].alt, "사진 2");
  await resolveImage(3);
  assert.equal(ids["photo-viewer-label"].textContent, "2 / 17");
});

test("data-saving or slow connections do not preload full photos", async () => {
  for (const options of [{ saveData: true }, { saveData: false, effectiveType: "2g" }]) {
    const { images, show, resolveImage } = fixture(options);
    show(1);
    await resolveImage(0);
    assert.equal(images.length, 1);
  }
});

test("failed loads retain the current photo and show an error only after failure", async () => {
  const { ids, images, show, resolveImage } = fixture();
  show(1);
  await resolveImage(0);
  const first = ids["photo-viewer-content"].children[0];
  ids["photo-viewer-next"].click();
  assert.doesNotMatch(ids["photo-viewer-status"].textContent, /불러오지 못/);
  images[1].ready.reject(new Error("404"));
  await setImmediate();
  assert.equal(ids["photo-viewer-content"].children[0], first);
  assert.match(ids["photo-viewer-status"].textContent, /불러오지 못/);
  assert.equal(ids["photo-viewer-label"].textContent, "1 / 17");
  assert.equal(ids["photo-viewer-next"].disabled, false);
});

test("closing and reopening ignores old requests and reduced motion swaps without sliding", async () => {
  const { ids, animations, show, resolveImage } = fixture({ reducedMotion: true });
  show(1);
  ids["photo-viewer-close"].click();
  show(9);
  await resolveImage(0);
  assert.equal(ids["photo-viewer-label"].textContent, "9 / 17");
  assert.equal(ids["photo-viewer-content"].children.length, 0);
  await resolveImage(1);
  ids["photo-viewer-next"].click();
  await resolveImage(2);
  assert.equal(ids["photo-viewer-label"].textContent, "10 / 17");
  assert.equal(animations.length, 0);
});

test("closing mid-slide cancels it without corrupting a new viewer session", async () => {
  const { ids, animations, show, resolveImage } = fixture();
  show(1);
  await resolveImage(0);
  ids["photo-viewer-next"].click();
  await resolveImage(1);
  ids["photo-viewer-close"].click();
  show(5);
  await resolveImage(2);
  assert.equal(animations.length, 1);
  assert.equal(ids["photo-viewer-label"].textContent, "5 / 17");
  assert.equal(ids["photo-viewer-content"].children.length, 1);
});

const finger = (identifier, clientX, clientY = 200) => ({ identifier, clientX, clientY });
function touch(target, type, touches, changedTouches, timeStamp = 1000) {
  return target.dispatch(type, { touches, changedTouches, timeStamp });
}

test("a multi-touch gesture stays ignored until every finger lifts, including outside the photo", async () => {
  const { ids, images, show, resolveImage } = fixture();
  show(1);
  await resolveImage(0);
  const content = ids["photo-viewer-content"];
  const next = ids["photo-viewer-next"];
  touch(content, "touchstart", [finger(1, 250)], [finger(1, 250)]);
  const second = touch(next, "touchstart", [finger(1, 250), finger(2, 280)], [finger(2, 280)]);
  assert.equal(second.defaultPrevented, true);
  touch(content, "touchend", [finger(2, 150)], [finger(1, 50)]);
  const last = touch(next, "touchend", [], [finger(2, 50)]);
  assert.equal(last.defaultPrevented, true);
  assert.equal(images.length, 1);
  assert.equal(ids["photo-viewer-label"].textContent, "1 / 17");
  touch(content, "touchstart", [finger(3, 250)], [finger(3, 250)], 2000);
  touch(content, "touchend", [], [finger(3, 50)], 2300);
  assert.equal(images.length, 2, "a new single-finger swipe still works");
});

test("viewer blocks zoom defaults without swallowing rapid control taps", async () => {
  const { ids, show, resolveImage } = fixture();
  show(1);
  await resolveImage(0);
  for (const key of ["photo-viewer-label", "photo-viewer-next", "photo-viewer-prev", "photo-viewer"]) {
    const target = ids[key];
    touch(target, "touchstart", [finger(1, 20)], [finger(1, 20)], 3000);
    touch(target, "touchend", [], [finger(1, 20)], 3050);
    touch(target, "touchstart", [finger(1, 20)], [finger(1, 20)], 3100);
    assert.equal(touch(target, "touchend", [], [finger(1, 20)], 3150).defaultPrevented, target.tagName !== "button", key);
    assert.equal(target.dispatch("dblclick").defaultPrevented, true, key);
    assert.equal(target.dispatch("gesturestart").defaultPrevented, true, key);
    assert.equal(target.dispatch("gesturechange").defaultPrevented, true, key);
    touch(target, "touchend", [], [finger(1, 20)], 4000);
  }
});

test("late gestureend and trackpad gestures never lock subsequent single-finger navigation", async () => {
  const { ids, images, show, resolveImage } = fixture({ reducedMotion: true });
  show(1);
  await resolveImage(0);
  const content = ids["photo-viewer-content"];
  touch(content, "touchstart", [finger(1, 250), finger(2, 280)], [finger(1, 250), finger(2, 280)]);
  content.dispatch("gesturestart");
  touch(content, "touchend", [], [finger(1, 50), finger(2, 80)]);
  content.dispatch("gestureend");
  touch(content, "touchstart", [finger(3, 250)], [finger(3, 250)], 2000);
  touch(content, "touchend", [], [finger(3, 50)], 2300);
  assert.equal(images.length, 2);
  await resolveImage(1);
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) content.dispatch(type);
  ids["photo-viewer-next"].click();
  assert.equal(images.length, 3, "trackpad-only gestures must not leave the touch lock on");
});
