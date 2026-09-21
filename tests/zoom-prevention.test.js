import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = app.slice(app.indexOf("function setupZoomPrevention("), app.indexOf("function createPlaceholder("));
const finger = (identifier, clientX = 120, clientY = 240) => ({ identifier, clientX, clientY });
function fixture() {
  const listeners = {};
  assert.ok(setup.length > 0, "page-wide zoom prevention must be installed");
  runInNewContext(`${setup}\nsetupZoomPrevention();`, {
    document: { addEventListener(type, callback) { (listeners[type] ??= []).push(callback); } },
  });
  return (type, details = {}) => {
    const event = { cancelable: true, defaultPrevented: false, touches: [], changedTouches: [], timeStamp: 1000,
      preventDefault() { this.defaultPrevented = true; }, ...details };
    for (const callback of listeners[type] ?? []) callback(event);
    return event;
  };
}

test("page-wide zoom guard keeps single-finger scrolling and ordinary mouse/keyboard input", () => {
  const send = fixture();
  assert.equal(send("touchstart", { touches: [finger(1)] }).defaultPrevented, false);
  assert.equal(send("touchmove", { touches: [finger(1, 120, 100)] }).defaultPrevented, false);
  assert.equal(send("touchend", { changedTouches: [finger(1, 120, 100)] }).defaultPrevented, false);
  assert.equal(send("wheel", { ctrlKey: false }).defaultPrevented, false);
  assert.equal(send("keydown", { ctrlKey: true, key: "c" }).defaultPrevented, false);
  assert.equal(send("keydown", { key: "ArrowRight" }).defaultPrevented, false);
});

test("page-wide pinch lock stays active until all fingers lift and then releases", () => {
  const send = fixture();
  send("touchstart", { touches: [finger(1)] });
  assert.equal(send("touchstart", { touches: [finger(1), finger(2)] }).defaultPrevented, true);
  assert.equal(send("touchmove", { touches: [finger(1), finger(2)] }).defaultPrevented, true);
  assert.equal(send("touchend", { touches: [finger(2)], changedTouches: [finger(1)] }).defaultPrevented, true);
  assert.equal(send("touchend", { changedTouches: [finger(2)] }).defaultPrevented, true);
  assert.equal(send("touchstart", { touches: [finger(3)] }).defaultPrevented, false);
});

test("double-tap, Safari gestures, trackpad pinch and browser zoom shortcuts are prevented", () => {
  const send = fixture();
  send("touchstart", { touches: [finger(1)], timeStamp: 1000 });
  send("touchend", { changedTouches: [finger(1)], timeStamp: 1050 });
  send("touchstart", { touches: [finger(2)], timeStamp: 1100 });
  assert.equal(send("touchend", { changedTouches: [finger(2)], timeStamp: 1150 }).defaultPrevented, true);
  for (const type of ["gesturestart", "gesturechange", "gestureend", "dblclick"]) assert.equal(send(type).defaultPrevented, true);
  assert.equal(send("wheel", { ctrlKey: true }).defaultPrevented, true);
  for (const key of ["+", "=", "-", "0"]) {
    assert.equal(send("keydown", { ctrlKey: true, key }).defaultPrevented, true);
    assert.equal(send("keydown", { metaKey: true, key }).defaultPrevented, true);
  }
});

test("rapid repeat taps on interactive controls keep their normal click behavior", () => {
  const send = fixture();
  const button = { closest: (selector) => selector.includes("button") ? button : null };
  send("touchstart", { target: button, touches: [finger(1)], timeStamp: 1000 });
  assert.equal(send("touchend", { target: button, changedTouches: [finger(1)], timeStamp: 1050 }).defaultPrevented, false);
  send("touchstart", { target: button, touches: [finger(2)], timeStamp: 1220 });
  assert.equal(send("touchend", { target: button, changedTouches: [finger(2)], timeStamp: 1270 }).defaultPrevented, false);
});

test("viewport and shared styles disable zoom in both modes while retaining vertical panning", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /name="viewport"[^>]*maximum-scale=1[^>]*user-scalable=no/);
  assert.match(css, /html\s*\{[^}]*touch-action:\s*pan-y/s);
  assert.match(app, /\nsetupZoomPrevention\(\);/);
});
