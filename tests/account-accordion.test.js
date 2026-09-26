import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { getAccountGroup } from "../src/invitation.js";

const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = source.slice(source.indexOf("function createAccountRow("), source.indexOf("function setupMapLinks("));

function fixture() {
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
    "account-dialog", "account-dialog-title", "account-dialog-list", "account-dialog-close", "copy-toast",
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
  let onModeChange;
  runInNewContext(`${setup}\nsetupAccountAccordions();`, {
    document: {
      createElement: () => new Element(), body: new Element(),
      getElementById: (id) => ids[id], querySelector: () => invitation,
      querySelectorAll: () => buttons,
    },
    getAccountGroup, copyAccountNumber: async (number) => { copied.push(number); },
    MutationObserver: class { constructor(callback) { onModeChange = callback; } observe() {} },
    setTimeout: () => 1, clearTimeout: () => {},
  });
  return { ids, buttons, copied, mode: (mode) => { invitation.dataset.mode = mode; onModeChange?.(); } };
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
  assert.equal(f.ids["groom-accounts-list"].children.length, 3);
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
    assert.equal(f.ids[`${side}-accounts-list`].children.length, 3);
    for (const [position, account] of getAccountGroup(side).entries()) {
      const row = f.ids[`${side}-accounts-list`].children[position];
      assert.equal(findByClass(row, "account-row__name").textContent, account.holder);
      assert.equal(findByClass(row, "account-row__bank").textContent, account.bank);
      assert.equal(findByClass(row, "account-row__number").textContent, account.number);
      await findByClass(row, "account-row__copy").dispatch("click");
      assert.equal(f.copied.at(-1), account.number);
      assert.equal(f.ids["copy-toast"].textContent, "계좌번호가 복사되었습니다.");
    }
  }
  assert.doesNotMatch(setup, /toss:|kakaopay:|송금|location\.(href|assign|replace)/);
});

test("developer mode shares inline accounts and preserves accessible state through mode changes", async () => {
  const f = fixture();
  f.mode("developer");
  assert.equal(f.buttons[0].getAttribute("aria-haspopup"), null);
  assert.equal(f.buttons[0].getAttribute("aria-expanded"), "false");
  await f.buttons[0].dispatch("click");
  assert.equal(f.ids["account-dialog"].open, false);
  assert.equal(f.ids["groom-accounts-list"].children.length, 3);
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
  assert.equal(f.buttons[0].getAttribute("aria-expanded"), "true");
  assert.equal(f.ids["groom-accounts-panel"].inert, false);
  await f.buttons[0].dispatch("click");
  assert.equal(f.ids["groom-accounts-panel"].inert, true);
  assert.equal(f.buttons[1].getAttribute("aria-expanded"), "true");
});
