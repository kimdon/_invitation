import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { setImmediate } from "node:timers/promises";
import { AI_GUEST_MESSAGES, DEVELOPER_TRANSITION_COMMANDS, buildDeveloperSequence } from "../src/invitation.js";

const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = source.slice(source.indexOf("function setupDeveloperMode("), source.indexOf("function setupRevealAnimations("));

function fixture({ reducedMotion = false } = {}) {
  class Element {
    constructor(tagName = "div") { this.tagName = tagName; }
    children = [];
    attributes = {};
    dataset = {};
    listeners = {};
    hidden = false;
    disabled = false;
    className = "";
    ownText = "";
    style = { setProperty() {} };
    classList = {
      contains: (name) => this.className.split(" ").includes(name),
      add: (name) => { if (!this.classList.contains(name)) this.className = `${this.className} ${name}`.trim(); },
      remove: (name) => { this.className = this.className.split(" ").filter((item) => item !== name).join(" "); },
      toggle: (name, force) => { if (force) this.classList.add(name); else this.classList.remove(name); },
    };
    get textContent() { return this.ownText + this.children.map((child) => typeof child === "string" ? child : child.textContent).join(""); }
    set textContent(value) { this.ownText = value; this.children = []; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); }
    replaceChildren(...children) { this.ownText = ""; this.children = children; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    querySelectorAll() { return this.children.filter((child) => child.tagName === "button"); }
    scrollTo() {}
    getContext() { return null; }
    click() { if (!this.disabled) for (const callback of this.listeners.click ?? []) callback(); }
  }

  const ids = Object.fromEntries([
    "developer-toggle", "developer-transition", "developer-intro", "developer-transition-brand", "developer-transition-lines",
    "ai-agent-selector", "ai-agent-card", "ai-agent-icon", "ai-agent-name", "ai-agent-handle", "ai-agent-request",
    "ai-agent-approved", "developer-congratulations", "developer-response", "developer-particle-layer",
  ].map((id) => [id, new Element()]));
  ids["developer-transition"].hidden = true;
  ids["developer-intro"].hidden = true;
  ids["developer-transition-brand"].hidden = true;
  const sections = Array.from({ length: 7 }, () => new Element());
  const invitation = new Element();
  invitation.dataset.mode = "normal";
  invitation.dataset.bootState = "idle";
  invitation.querySelectorAll = () => sections;
  const timers = new Map();
  let now = 0;
  let timerId = 0;
  runInNewContext(`${setup}\nsetupDeveloperMode();`, {
    document: {
      body: new Element(), createElement: (tagName) => new Element(tagName),
      querySelector: () => invitation, getElementById: (id) => ids[id],
    },
    window: {
      matchMedia: () => ({ matches: reducedMotion }), scrollTo() {},
      setTimeout: (callback, delay) => { timers.set(++timerId, { callback, at: now + delay }); return timerId; },
      clearTimeout: (id) => timers.delete(id), setInterval: () => ++timerId, clearInterval() {},
    },
    AI_GUEST_MESSAGES, DEVELOPER_TRANSITION_COMMANDS, buildDeveloperSequence,
  });
  return {
    ids, invitation, sections,
    lines: () => ids["developer-transition-lines"].children.map((line) => line.textContent),
    advance: async (ms) => {
      const until = now + ms;
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > until) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        await setImmediate();
      }
      now = until;
      await setImmediate();
    },
  };
}

test("developer entry shows reassurance for four seconds before the unchanged terminal sequence", async () => {
  const f = fixture();
  f.ids["developer-toggle"].click();
  assert.equal(f.ids["developer-intro"].hidden, false);
  assert.equal(f.ids["developer-transition-lines"].hidden, true);
  assert.equal(f.ids["developer-transition-brand"].hidden, true);
  assert.equal(f.ids["developer-toggle"].disabled, true);
  assert.ok(f.sections.every((section) => section.hidden));
  assert.deepEqual(f.lines(), []);
  await f.advance(3999);
  assert.deepEqual(f.lines(), []);
  assert.equal(f.ids["developer-intro"].classList.contains("is-exiting"), false);
  await f.advance(1);
  assert.equal(f.ids["developer-intro"].classList.contains("is-exiting"), true);
  assert.deepEqual(f.lines(), []);
  await f.advance(280);
  assert.equal(f.ids["developer-intro"].hidden, true);
  assert.equal(f.ids["developer-transition-lines"].hidden, false);
  assert.deepEqual(f.lines(), ["$ git fetch origin"]);
  await f.advance(1650 + 1000 + 120 + 8 * 360);
  assert.deepEqual(f.lines().slice(0, 4), [...DEVELOPER_TRANSITION_COMMANDS.map((command) => `$ ${command}`), "Switched to branch 'develop' ✓"]);
  assert.equal(f.lines().length, 4 + buildDeveloperSequence().length);
  for (const entry of buildDeveloperSequence()) assert.ok(f.lines().some((line) => line.includes(`${entry.level} ${entry.logger} : ${entry.message}`)));
  await f.advance(999);
  assert.equal(f.invitation.dataset.mode, "switching");
  assert.equal(f.ids["developer-transition"].classList.contains("is-exiting"), false);
  await f.advance(1);
  assert.equal(f.ids["developer-transition"].classList.contains("is-exiting"), true);
  await f.advance(450);
  assert.equal(f.invitation.dataset.mode, "developer");
  assert.equal(f.invitation.dataset.bootState, "ready");
  assert.equal(f.ids["developer-transition"].hidden, true);
  assert.equal(f.ids["developer-toggle"].disabled, false);
  assert.ok(f.sections.every((section) => !section.hidden));
});

test("reduced motion preserves reassurance reading time while skipping decorative delays", async () => {
  const f = fixture({ reducedMotion: true });
  f.ids["developer-toggle"].click();
  await f.advance(3999);
  assert.equal(f.ids["developer-intro"].hidden, false);
  assert.deepEqual(f.lines(), []);
  assert.equal(f.invitation.dataset.mode, "switching");
  await f.advance(1);
  assert.equal(f.ids["developer-intro"].hidden, true);
  assert.equal(f.invitation.dataset.mode, "developer");
  assert.equal(f.invitation.dataset.bootState, "ready");
});

test("returning to normal and reentering resets reassurance and prevents a duplicate button action", async () => {
  const f = fixture();
  f.ids["developer-toggle"].click();
  f.ids["developer-toggle"].click();
  assert.deepEqual(f.lines(), []);
  await f.advance(12_000);
  f.ids["developer-toggle"].click();
  assert.equal(f.invitation.dataset.mode, "normal");
  assert.equal(f.ids["developer-transition"].hidden, true);
  assert.equal(f.ids["developer-intro"].hidden, true);
  assert.deepEqual(f.lines(), []);
  f.ids["developer-toggle"].click();
  assert.equal(f.ids["developer-intro"].hidden, false);
  assert.equal(f.ids["developer-intro"].classList.contains("is-exiting"), false);
  assert.deepEqual(f.lines(), []);
  await f.advance(3999);
  assert.deepEqual(f.lines(), []);
  await f.advance(1 + 280);
  assert.deepEqual(f.lines(), ["$ git fetch origin"]);
});
