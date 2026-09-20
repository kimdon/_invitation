# Developer Boot Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개발자 모드 구동 로그가 완료된 뒤에만 후속 초대장 섹션을 공개한다.

**Architecture:** `main.invitation`의 `data-boot-state`가 `idle`, `booting`, `ready` 상태를 표현한다. JavaScript가 로그 생명주기에 맞춰 상태를 전환하고, 개발자 모드에 한정된 CSS가 `booting` 동안 후속 형제를 숨긴 뒤 `ready`에서 페이드인한다.

**Tech Stack:** HTML, CSS animations, Vanilla JavaScript, Node.js test runner, browser mobile validation

---

### Task 1: 부팅 상태 계약 테스트

**Files:**
- Modify: `tests/invitation.test.js`
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Write the failing test**

```js
assert.match(html, /<main class="invitation" data-mode="normal" data-boot-state="idle">/);
assert.match(app, /invitation\.dataset\.bootState = "booting"/);
assert.match(app, /await wait\(400\)/);
assert.match(app, /invitation\.dataset\.bootState = "ready"/);
assert.match(css, /data-boot-state="booting"/);
assert.match(css, /@keyframes developer-content-ready/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`

Expected: FAIL because the boot state contract is absent.

- [ ] **Step 3: Implement the minimal state transitions**

Add `data-boot-state="idle"` to the invitation root. Set `booting` with `aria-busy="true"` on developer entry, wait 400ms after the last log, then set `ready` and `aria-busy="false"`. Reset to `idle` when leaving developer mode.

- [ ] **Step 4: Add scoped hiding and reveal styles**

Hide `.section`, `.developer-rsvp`, and `.footer` siblings after `.cover` only when developer mode is `booting`. Add a 450ms opacity/vertical reveal animation for the `ready` state.

- [ ] **Step 5: Run the complete automated checks**

Run: `node --check src/app.js && node --check src/invitation.js && npm test && git diff --check`

Expected: syntax and all tests pass.

### Task 2: Browser state verification

**Files:**
- Verify: `index.html`
- Verify: `styles.css`
- Verify: `src/app.js`

- [ ] **Step 1: Verify booting state**

At 390px width, enter developer mode and inspect the page after the transition but before the final log. Confirm `data-boot-state="booting"`, the console is visible, and the invitation section is hidden.

- [ ] **Step 2: Verify ready state**

After the SUCCESS log and 400ms delay, confirm `data-boot-state="ready"`, the invitation section is visible, and no automatic jump to that section occurs.

- [ ] **Step 3: Verify accessibility and regressions**

Confirm `aria-busy` changes from true to false, reduced motion reveals immediately, developer highlights remain six, fireworks still use one canvas, gallery touch action remains none, and browser errors are empty.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-20-developer-boot-gate-design.md docs/superpowers/plans/2026-09-20-developer-boot-gate.md index.html src/app.js styles.css tests/invitation.test.js
git commit -m "feat: reveal developer content after boot"
```
