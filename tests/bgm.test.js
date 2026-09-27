import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { setImmediate } from "node:timers/promises";

const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = source.slice(source.indexOf("function setupBackgroundMusic("), source.indexOf("function setupZoomPrevention("));
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const audioTag = html.match(/<audio\b[^>]*>/)?.[0];

function fixture(outcomes = []) {
  class Element {
    listeners = new Map();
    attributes = {};
    dataset = {};
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(callback);
    }
    removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
    dispatch(type, properties = {}) {
      for (const callback of this.listeners.get(type) ?? []) callback({ type, target: this, ...properties });
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    contains(target) { return target === this; }
  }
  const audio = new Element();
  audio.paused = true;
  audio.currentTime = 0;
  audio.volume = 1;
  audio.loop = /\bloop\b/.test(audioTag);
  audio.ended = false;
  Object.defineProperty(audio, "src", {
    get: () => audio.getAttribute("src"),
    set: (value) => {
      audio.setAttribute("src", value);
      audio.currentTime = 0;
      audio.ended = false;
      audio.paused = true;
    },
  });
  audio.src = audioTag.match(/src="([^"]+)"/)[1];
  let playCalls = 0;
  audio.play = async () => {
    const outcome = outcomes[playCalls++];
    if (outcome instanceof Error) throw outcome;
    audio.paused = false;
    await outcome;
    if (!audio.paused) audio.dispatch("playing");
  };
  audio.pause = () => { audio.paused = true; audio.dispatch("pause"); };
  const button = new Element();
  const document = new Element();
  document.getElementById = (id) => ({ "bgm-audio": audio, "bgm-toggle": button })[id];
  assert.match(setup, /function setupBackgroundMusic/, "background music setup must exist");
  runInNewContext(`${setup}\nsetupBackgroundMusic();`, { document });
  return {
    audio, button, document, playCalls: () => playCalls,
    endTrack: () => {
      audio.ended = true;
      audio.paused = true;
      audio.dispatch("pause");
      audio.dispatch("ended");
    },
  };
}

test("page starts with the adventure track on one shared audio without single-track looping", async () => {
  const audios = html.match(/<audio\b[^>]*>/g) ?? [];
  assert.equal(audios.length, 1);
  assert.match(audios[0], /\bid="bgm-audio"/);
  assert.match(audios[0], /\bautoplay\b/);
  assert.doesNotMatch(audios[0], /\bloop\b/);
  assert.match(audios[0], /src="\.\/bgm\/adventure\.mp3"/);
  assert.ok((await stat(new URL("../bgm/adventure.mp3", import.meta.url))).size > 0);
  assert.ok((await stat(new URL("../bgm/wedding.mp3", import.meta.url))).size > 0);
  assert.equal((source.match(/^setupBackgroundMusic\(\);$/gm) ?? []).length, 1);
  assert.match(html, /id="bgm-toggle"[^>]*aria-label="배경음악 재생"/);
});

test("entry attempts audible playback and updates the pause control after it starts", async () => {
  const f = fixture();
  await setImmediate();
  assert.equal(f.playCalls(), 1);
  assert.equal(f.audio.src, "./bgm/adventure.mp3");
  assert.equal(f.audio.volume, 0.35);
  assert.equal(f.button.dataset.state, "playing");
  assert.equal(f.button.getAttribute("aria-label"), "배경음악 일시정지");
});

test("tracks play in order and wrap back to adventure after the second track", async () => {
  const f = fixture();
  await setImmediate();
  f.audio.currentTime = 170;
  f.endTrack();
  await setImmediate();
  assert.equal(f.audio.src, "./bgm/wedding.mp3");
  assert.equal(f.audio.currentTime, 0);
  assert.equal(f.playCalls(), 2);
  assert.equal(f.button.dataset.state, "playing");
  f.audio.currentTime = 101;
  f.endTrack();
  await setImmediate();
  assert.equal(f.audio.src, "./bgm/adventure.mp3");
  assert.equal(f.audio.currentTime, 0);
  assert.equal(f.playCalls(), 3);
  f.endTrack();
  await setImmediate();
  assert.equal(f.audio.src, "./bgm/wedding.mp3");
});

test("pausing the second track resumes that same track and position", async () => {
  const f = fixture();
  await setImmediate();
  f.endTrack();
  await setImmediate();
  f.audio.currentTime = 31;
  f.button.dispatch("click");
  assert.equal(f.audio.paused, true);
  f.document.dispatch("pointerup");
  assert.equal(f.playCalls(), 2);
  f.button.dispatch("click");
  await setImmediate();
  assert.equal(f.audio.src, "./bgm/wedding.mp3");
  assert.equal(f.audio.currentTime, 31);
  assert.equal(f.button.dataset.state, "playing");
});

test("blocked playback on a track change retries that track without skipping ahead", async () => {
  const blocked = Object.assign(new Error("User gesture required"), { name: "NotAllowedError" });
  const f = fixture([undefined, blocked]);
  await setImmediate();
  f.endTrack();
  await setImmediate();
  assert.equal(f.button.dataset.state, "blocked");
  assert.equal(f.audio.src, "./bgm/wedding.mp3");
  f.document.dispatch("pointerup");
  await setImmediate();
  assert.equal(f.audio.src, "./bgm/wedding.mp3");
  assert.equal(f.button.dataset.state, "playing");
});

test("blocked autoplay waits for a user gesture without an unhandled rejection", async () => {
  const blocked = Object.assign(new Error("User gesture required"), { name: "NotAllowedError" });
  const f = fixture([blocked]);
  await setImmediate();
  assert.equal(f.button.dataset.state, "blocked");
  assert.equal(f.button.getAttribute("aria-label"), "배경음악 재생");
  f.document.dispatch("pointerup");
  await setImmediate();
  assert.equal(f.playCalls(), 2);
  assert.equal(f.button.dataset.state, "playing");
  f.document.dispatch("pointerup");
  assert.equal(f.playCalls(), 2);
});

test("the music button does not compete with the blocked-autoplay gesture retry", async () => {
  const blocked = Object.assign(new Error("Blocked"), { name: "NotAllowedError" });
  const f = fixture([blocked]);
  await setImmediate();
  f.document.dispatch("pointerup", { target: f.button });
  assert.equal(f.playCalls(), 1);
  f.button.dispatch("click");
  await setImmediate();
  assert.equal(f.playCalls(), 2);
  assert.equal(f.button.dataset.state, "playing");
});

test("manual pause stays paused on later taps and resumes from the same position", async () => {
  const f = fixture();
  await setImmediate();
  f.audio.currentTime = 42;
  f.button.dispatch("click");
  assert.equal(f.audio.paused, true);
  assert.equal(f.button.dataset.state, "paused");
  f.document.dispatch("pointerup");
  f.document.dispatch("keydown", { key: "Enter" });
  assert.equal(f.playCalls(), 1);
  f.button.dispatch("click");
  await setImmediate();
  assert.equal(f.audio.currentTime, 42);
  assert.equal(f.button.dataset.state, "playing");
});

test("a pending play request cannot overwrite a later pause", async () => {
  let resolvePlay;
  const pending = new Promise((resolve) => { resolvePlay = resolve; });
  const f = fixture([pending]);
  f.button.dispatch("click");
  assert.equal(f.audio.paused, true);
  resolvePlay();
  await setImmediate();
  assert.equal(f.button.dataset.state, "paused");
  assert.equal(f.button.getAttribute("aria-label"), "배경음악 재생");
});

test("keyboard activation retries blocked playback but ordinary keys do not", async () => {
  const blocked = Object.assign(new Error("Blocked"), { name: "NotAllowedError" });
  const f = fixture([blocked]);
  await setImmediate();
  f.document.dispatch("keydown", { key: "ArrowDown" });
  assert.equal(f.playCalls(), 1);
  f.document.dispatch("keydown", { key: "Enter" });
  await setImmediate();
  assert.equal(f.button.dataset.state, "playing");
});

test("an unavailable track leaves the rest of the invitation usable without retrying on taps", async () => {
  const error = Object.assign(new Error("Missing media"), { name: "NotSupportedError" });
  const f = fixture([error]);
  await setImmediate();
  assert.equal(f.button.dataset.state, "error");
  assert.equal(f.button.getAttribute("aria-label"), "배경음악 다시 재생");
  f.document.dispatch("pointerup");
  assert.equal(f.playCalls(), 1);
});
