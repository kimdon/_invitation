import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../src/venue-map.js", import.meta.url), "utf8").catch(() => "");

function fixture({ intersection = true, enabled = true } = {}) {
  const section = {};
  const frame = { dataset: {}, hidden: true, parentElement: section, clientWidth: 340, clientHeight: 280 };
  const canvas = { hidden: true };
  const fallback = { hidden: false };
  const status = { textContent: "", hidden: true };
  const nodes = { "venue-map-frame": frame, "venue-map": canvas, "venue-map-fallback": fallback, "venue-map-status": status };
  const scripts = [];
  const timers = new Map();
  const observations = {};
  const maps = [];
  const markers = [];
  let tilesLoaded;
  const window = {
    setTimeout(callback) { timers.set(1, callback); return 1; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener() {},
    ResizeObserver: class { constructor(callback) { observations.resize = callback; } observe() {} },
  };
  if (intersection) window.IntersectionObserver = class {
    constructor(callback) { observations.intersect = callback; }
    observe(target) { observations.target = target; }
    disconnect() { observations.disconnected = true; }
  };
  const document = {
    getElementById: (id) => nodes[id],
    createElement: () => ({ addEventListener(type, callback) { this[type] = callback; } }),
    head: { appendChild(script) { scripts.push(script); } },
  };
  assert.match(source, /export function setupVenueMap/, "venue map integration must exist");
  const setup = runInNewContext(`${source.replace("export function", "function")}\nsetupVenueMap;`, { document, window });
  if (enabled === "default") setup();
  else setup({ enabled });
  function installSdk() {
    window.naver = { maps: {
      LatLng: class { constructor(lat, lng) { this.lat = lat; this.lng = lng; } },
      Size: class { constructor(width, height) { this.width = width; this.height = height; } },
      Point: class { constructor(x, y) { this.x = x; this.y = y; } },
      Position: { TOP_RIGHT: 3 },
      Map: class {
        constructor(element, options) { this.element = element; this.options = options; maps.push(this); }
        setSize(size) { this.size = size; }
        setCenter(center) { this.center = center; }
      },
      Marker: class { constructor(options) { markers.push(options); } },
      Event: { once(map, event, callback) { assert.equal(event, "tilesloaded"); tilesLoaded = callback; } },
    } };
  }
  return { frame, canvas, fallback, section, status, scripts, timers, maps, markers, window, observations, installSdk, setup,
    approach() { observations.intersect?.([{ isIntersecting: true }]); },
    finish() { tilesLoaded(); },
  };
}

for (const intersection of [true, false]) {
  test(`map is paused by default without requesting the SDK (observer: ${intersection})`, () => {
    for (const enabled of ["default", false]) {
      const f = fixture({ intersection, enabled });
      f.approach();
      f.setup();
      assert.equal(f.scripts.length, 0);
      assert.equal(f.maps.length, 0);
      assert.equal(f.timers.size, 0);
      assert.equal(f.observations.intersect, undefined);
      assert.equal(f.observations.resize, undefined);
      assert.equal(f.frame.hidden, false);
      assert.equal(f.frame.dataset.mapState, "paused");
      assert.equal(f.canvas.hidden, true);
      assert.equal(f.fallback.hidden, false);
      assert.equal(f.status.hidden, true);
    }
  });
}

test("map SDK loads only near Location and is not requested again", () => {
  const f = fixture();
  assert.equal(f.scripts.length, 0);
  assert.equal(f.frame.hidden, true);
  assert.equal(f.fallback.hidden, true);
  assert.equal(f.observations.target, f.section, "observe the visible Location section, not the hidden map");
  const observer = f.observations.intersect;
  f.setup({ enabled: true });
  assert.equal(f.observations.intersect, observer, "duplicate setup must not install another observer");
  f.observations.intersect([{ isIntersecting: false }]);
  assert.equal(f.scripts.length, 0);
  f.approach();
  f.approach();
  assert.equal(f.scripts.length, 1);
  assert.equal(f.fallback.hidden, true);
  const url = new URL(f.scripts[0].src);
  assert.equal(url.origin, "https://oapi.map.naver.com");
  assert.equal(url.searchParams.get("ncpKeyId"), "sffg6ukgp6");
  assert.equal(f.scripts[0].async, true);
  assert.equal(f.observations.disconnected, true);
});

test("map marks the official venue and hides the image fallback when ready", () => {
  const f = fixture();
  f.approach();
  f.installSdk();
  f.scripts[0].load();
  assert.equal(f.maps.length, 1);
  assert.equal(f.maps[0].options.center.lat, 37.5673842);
  assert.equal(f.maps[0].options.center.lng, 126.827051);
  assert.equal(f.markers[0].title, "보타닉 웨딩파크");
  assert.equal(f.markers[0].position, f.maps[0].options.center);
  assert.equal(f.maps[0].options.scrollWheel, false);
  assert.equal(f.maps[0].options.draggable, false);
  assert.equal(f.maps[0].options.pinchZoom, false);
  assert.equal(f.frame.hidden, false);
  assert.equal(f.frame.dataset.mapState, "loading");
  f.finish();
  assert.equal(f.frame.dataset.mapState, "ready");
  assert.equal(f.frame.hidden, false);
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.fallback.hidden, true);
  assert.equal(f.status.hidden, true);
  assert.equal(f.timers.size, 0);
  f.scripts[0].load();
  assert.equal(f.maps.length, 1);
});

for (const failure of ["authentication", "network", "timeout", "sdk-unavailable"]) {
  test(`${failure} failure shows the local venue image and does not retry`, () => {
    const f = fixture();
    f.approach();
    if (failure === "authentication") f.window.navermap_authFailure();
    if (failure === "network") f.scripts[0].error();
    if (failure === "timeout") [...f.timers.values()][0]();
    if (failure === "sdk-unavailable") f.scripts[0].load();
    assert.equal(f.frame.dataset.mapState, "error");
    assert.equal(f.frame.dataset.mapError, failure);
    assert.equal(f.frame.hidden, false);
    assert.equal(f.canvas.hidden, true);
    assert.equal(f.fallback.hidden, false);
    assert.equal(f.status.hidden, true);
    assert.equal(f.timers.size, 0);
    f.installSdk();
    f.scripts[0].load();
    f.approach();
    f.setup({ enabled: true });
    assert.equal(f.scripts.length, 1);
    assert.equal(f.maps.length, 0, "a late SDK callback must not reopen the map");
    assert.equal(f.fallback.hidden, false);
  });
}

test("map resizes and recenters after mode changes without another SDK load", () => {
  const f = fixture({ intersection: false });
  assert.equal(f.scripts.length, 1);
  f.installSdk();
  f.scripts[0].load();
  f.finish();
  f.frame.clientWidth = 0;
  f.observations.resize();
  assert.equal(f.maps[0].size, undefined);
  f.frame.clientWidth = 390;
  f.observations.resize();
  assert.equal(f.maps[0].size.width, 390);
  assert.equal(f.maps[0].center, f.maps[0].options.center);
  assert.equal(f.scripts.length, 1);
});

test("a late authentication rejection replaces the map with the local venue image", () => {
  const f = fixture();
  f.approach();
  f.installSdk();
  f.scripts[0].load();
  f.finish();
  f.window.navermap_authFailure();
  assert.equal(f.frame.dataset.mapState, "error");
  assert.equal(f.frame.hidden, false);
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.fallback.hidden, false);
  assert.equal(f.status.hidden, true);
  f.finish();
  assert.equal(f.frame.dataset.mapState, "error", "late tiles must not bring a rejected map back");
  f.observations.resize();
  f.setup({ enabled: true });
  f.approach();
  assert.equal(f.scripts.length, 1);
  assert.equal(f.maps.length, 1);
  assert.equal(f.fallback.hidden, false);
});

test("tiles arriving after the loading timeout do not hide the fallback image", () => {
  const f = fixture();
  f.approach();
  f.installSdk();
  f.scripts[0].load();
  [...f.timers.values()][0]();
  f.finish();
  assert.equal(f.frame.dataset.mapState, "error");
  assert.equal(f.frame.dataset.mapError, "timeout");
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.fallback.hidden, false);
  assert.equal(f.status.hidden, true);
  assert.equal(f.scripts.length, 1);
});
