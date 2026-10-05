import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { getAccountGroup } from "../src/invitation.js";

const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = source.slice(source.indexOf("function createAccountRow("), source.indexOf("function setupMapLinks("));

function fixture(copyNumber) {
  class Element {
    children = [];
    attributes = {};
    listeners = {};
    dataset = {};
    hidden = false;
    inert = true;
    open = false;
    textContent = "";
    className = "";
    classList = {
      add: (name) => { this.className += ` ${name}`; },
      remove: (name) => { this.className = this.className.split(" ").filter((item) => item !== name).join(" "); },
      contains: (name) => this.className.split(" ").includes(name),
      toggle: (name, force) => {
        const active = force ?? !this.classList.contains(name);
        if (active) this.classList.add(name); else this.classList.remove(name);
        return active;
      },
    };
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    async dispatch(type) { for (const callback of this.listeners[type] ?? []) await callback({ target: this }); }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const ids = Object.fromEntries([
    "account-dialog", "account-dialog-title", "account-dialog-list", "account-dialog-close", "copy-status", "copy-toast",
    "groom-accounts-panel", "bride-accounts-panel", "groom-accounts-list", "bride-accounts-list",
  ].map((id) => [id, new Element()]));
  const invitation = new Element();
  invitation.dataset.mode = "normal";
  const buttons = ["groom", "bride"].map((side) => {
    const button = new Element();
    button.dataset.accountSide = side;
    return button;
  });
  const copied = [];
  const timers = new Map();
  let now = 0;
  let timerId = 0;
  let onModeChange;
  runInNewContext(`${setup}\nsetupAccountAccordions();`, {
    document: {
      createElement: () => new Element(), body: new Element(),
      getElementById: (id) => ids[id], querySelector: () => invitation,
      querySelectorAll: () => buttons,
    },
    getAccountGroup, copyAccountNumber: async (number) => { await copyNumber?.(number); copied.push(number); },
    MutationObserver: class { constructor(callback) { onModeChange = callback; } observe() {} },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, at: now + delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  return {
    ids, buttons, copied, mode: (mode) => { invitation.dataset.mode = mode; onModeChange?.(); },
    advance: (ms) => {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.at <= now) { timers.delete(id); timer.callback(); }
      }
    },
  };
}

function findByClass(element, className) {
  if (element.className.split(" ").includes(className)) return element;
  return element.children.map((child) => findByClass(child, className)).find(Boolean);
}

test("normal account groups expand independently in place without opening a dialog", async () => {
  const f = fixture();
  assert.equal(f.buttons[0].getAttribute("aria-expanded"), "false");
  await f.buttons[0].dispatch("click");
  assert.equal(f.ids["account-dialog"].open, false);
  assert.equal(f.buttons[0].getAttribute("aria-expanded"), "true");
  assert.equal(f.ids["groom-accounts-panel"].inert, false);
  assert.equal(f.ids["groom-accounts-list"].children.length, 2);
  await f.buttons[1].dispatch("click");
  assert.equal(f.buttons[0].getAttribute("aria-expanded"), "true");
  assert.equal(f.ids["bride-accounts-list"].children.length, 3);
  await f.buttons[0].dispatch("click");
  assert.equal(f.ids["groom-accounts-panel"].inert, true);
  assert.equal(f.ids["groom-accounts-panel"].getAttribute("aria-hidden"), "true");
  assert.equal(f.buttons[1].getAttribute("aria-expanded"), "true");
});

test("inline cards keep every existing account and only copy the selected account number", async () => {
  const f = fixture();
  for (const [index, side] of ["groom", "bride"].entries()) {
    await f.buttons[index].dispatch("click");
    assert.equal(f.ids[`${side}-accounts-list`].children.length, side === "groom" ? 2 : 3);
    for (const [position, account] of getAccountGroup(side).entries()) {
      const row = f.ids[`${side}-accounts-list`].children[position];
      assert.equal(findByClass(row, "account-row__name").textContent, account.holder);
      assert.equal(findByClass(row, "account-row__bank").textContent, account.bank);
      assert.equal(findByClass(row, "account-row__number").textContent, account.number);
      const button = findByClass(row, "account-row__copy");
      await button.dispatch("click");
      assert.equal(f.copied.at(-1), account.number);
      assert.equal(button.children[0].src, "./images/account-icons/check.svg");
      assert.equal(button.getAttribute("aria-label"), `${account.role} 계좌번호 복사 완료`);
      assert.equal(f.ids["copy-status"].textContent, `${account.role} 계좌번호가 복사되었습니다.`);
      assert.equal(f.ids["copy-toast"].textContent, "");
    }
  }
  assert.doesNotMatch(setup, /toss:|kakaopay:|송금|location\.(href|assign|replace)/);
});

test("copy checks reset independently and a repeated click restarts only that button's timer", async () => {
  const f = fixture();
  await f.buttons[0].dispatch("click");
  const [first, second] = f.ids["groom-accounts-list"].children.map((row) => findByClass(row, "account-row__copy"));
  await first.dispatch("click");
  f.advance(900);
  await second.dispatch("click");
  await first.dispatch("click");
  f.advance(900);
  assert.equal(first.children[0].src, "./images/account-icons/check.svg");
  assert.equal(second.children[0].src, "./images/account-icons/check.svg");
  f.advance(900);
  assert.equal(first.children[0].src, "./images/account-icons/copy.svg");
  assert.equal(second.children[0].src, "./images/account-icons/copy.svg");
  assert.equal(first.getAttribute("aria-label"), `${getAccountGroup("groom")[0].role} 계좌번호 복사`);
  await first.dispatch("click");
  assert.equal(first.children[0].src, "./images/account-icons/check.svg");
  assert.equal(second.children[0].src, "./images/account-icons/copy.svg");
});

test("a check is shown only after clipboard copying finishes", async () => {
  let finish;
  const f = fixture(() => new Promise((resolve) => { finish = resolve; }));
  await f.buttons[0].dispatch("click");
  const button = findByClass(f.ids["groom-accounts-list"].children[0], "account-row__copy");
  const pending = button.dispatch("click");
  assert.equal(button.children[0].src, "./images/account-icons/copy.svg");
  finish();
  await pending;
  assert.equal(button.children[0].src, "./images/account-icons/check.svg");
});

test("both account cards reset to collapsed on every mode entry while retaining their rows", async () => {
  const f = fixture();
  f.mode("developer");
  assert.equal(f.buttons[0].getAttribute("aria-haspopup"), null);
  assert.equal(f.buttons[0].getAttribute("aria-expanded"), "false");
  await f.buttons[0].dispatch("click");
  assert.equal(f.ids["account-dialog"].open, false);
  assert.equal(f.ids["groom-accounts-list"].children.length, 2);
  assert.equal(f.ids["groom-accounts-panel"].inert, false);
  await f.buttons[1].dispatch("click");
  assert.equal(f.ids["bride-accounts-list"].children.length, 3);
  for (const side of ["groom", "bride"]) {
    for (const [index, account] of getAccountGroup(side).entries()) {
      const row = f.ids[`${side}-accounts-list`].children[index];
      await findByClass(row, "account-row__copy").dispatch("click");
      assert.equal(f.copied.at(-1), account.number);
    }
  }
  f.mode("switching");
  assert.equal(f.ids["groom-accounts-panel"].inert, true);
  f.mode("normal");
  assert.equal(f.buttons[0].getAttribute("aria-haspopup"), null);
  for (const mode of ["normal", "developer", "normal", "developer"]) {
    f.mode(mode);
    for (const [index, side] of ["groom", "bride"].entries()) {
      const panel = f.ids[`${side}-accounts-panel`];
      assert.equal(f.buttons[index].getAttribute("aria-expanded"), "false");
      assert.equal(panel.classList.contains("is-open"), false);
      assert.equal(panel.inert, true);
      assert.equal(panel.getAttribute("aria-hidden"), "true");
      const firstRow = f.ids[`${side}-accounts-list`].children[0];
      await f.buttons[index].dispatch("click");
      assert.equal(f.buttons[index].getAttribute("aria-expanded"), "true");
      assert.equal(panel.inert, false);
      assert.equal(f.ids[`${side}-accounts-list`].children.length, side === "groom" ? 2 : 3);
      assert.equal(f.ids[`${side}-accounts-list`].children[0], firstRow);
    }
  }
});
