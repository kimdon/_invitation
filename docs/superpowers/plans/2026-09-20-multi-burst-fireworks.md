# Multi-burst Fireworks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** APPROVE 시 화면 여섯 지점에서 큰 다색 폭죽이 순차적으로 터지는 축하 연출을 구현한다.

**Architecture:** 폭발 위치와 지연시간은 `src/invitation.js`의 불변 설정으로 관리한다. `src/app.js`는 설정을 경과시간 순으로 소비하면서 모든 입자를 기존 단일 캔버스와 단일 애니메이션 프레임 루프에서 렌더링한다.

**Tech Stack:** HTML Canvas 2D, Vanilla JavaScript, Node.js test runner, in-app browser mobile validation

---

### Task 1: 다중 폭발 계획과 회귀 테스트

**Files:**
- Modify: `src/invitation.js`
- Modify: `tests/invitation.test.js`

- [ ] **Step 1: Write the failing test**

```js
test("firework plan covers six staggered screen regions", () => {
  assert.equal(FIREWORK_BURST_PLAN.length, 6);
  assert.ok(Math.min(...FIREWORK_BURST_PLAN.map((burst) => burst.x)) < 0.25);
  assert.ok(Math.max(...FIREWORK_BURST_PLAN.map((burst) => burst.x)) > 0.75);
  assert.ok(Math.min(...FIREWORK_BURST_PLAN.map((burst) => burst.y)) < 0.3);
  assert.ok(Math.max(...FIREWORK_BURST_PLAN.map((burst) => burst.y)) > 0.7);
  assert.deepEqual(FIREWORK_BURST_PLAN.map((burst) => burst.delay), [0, 260, 520, 780, 1040, 1300]);
});
```

- [ ] **Step 2: Run the test and verify the missing export fails**

Run: `npm test`

Expected: FAIL because `FIREWORK_BURST_PLAN` does not exist.

- [ ] **Step 3: Add the immutable six-point plan**

```js
export const FIREWORK_BURST_PLAN = Object.freeze([
  Object.freeze({ x: 0.18, y: 0.26, delay: 0 }),
  Object.freeze({ x: 0.82, y: 0.22, delay: 260 }),
  Object.freeze({ x: 0.5, y: 0.46, delay: 520 }),
  Object.freeze({ x: 0.2, y: 0.72, delay: 780 }),
  Object.freeze({ x: 0.8, y: 0.66, delay: 1040 }),
  Object.freeze({ x: 0.52, y: 0.82, delay: 1300 }),
]);
```

- [ ] **Step 4: Run tests and verify the plan passes**

Run: `npm test`

Expected: all tests pass.

### Task 2: 단일 캔버스 다중 폭발 렌더링

**Files:**
- Modify: `src/app.js`
- Modify: `tests/invitation.test.js`

- [ ] **Step 1: Write the failing renderer assertions**

```js
assert.match(app, /FIREWORK_BURST_PLAN/);
assert.match(app, /pendingBursts\.shift\(\)/);
assert.match(app, /length: 72/);
assert.match(app, /4\.5 \+ Math\.random\(\) \* 6/);
assert.match(app, /1\.8 \+ Math\.random\(\) \* 1\.8/);
```

- [ ] **Step 2: Run tests and verify the single-burst renderer fails**

Run: `npm test`

Expected: FAIL because the renderer does not consume a burst plan.

- [ ] **Step 3: Implement staggered bursts in one animation loop**

Import `FIREWORK_BURST_PLAN`, keep one `fireworkFrame`, create 72 particles per burst, and start each burst when elapsed time reaches its delay. Use normalized `x` and `y` coordinates against the canvas bounds, speed `4.5 + Math.random() * 6`, and size `1.8 + Math.random() * 1.8`.

- [ ] **Step 4: Keep cleanup and reduced motion behavior**

Call `cancelFireworks()` before every run, retain the early `reducedMotion.matches` return, and re-enable APPROVE after the last burst plus 1.4 seconds.

- [ ] **Step 5: Run the complete test suite**

Run: `node --check src/app.js && node --check src/invitation.js && npm test && git diff --check`

Expected: syntax checks and all tests pass with no whitespace errors.

### Task 3: Mobile browser verification

**Files:**
- Verify: `index.html`
- Verify: `styles.css`
- Verify: `src/app.js`

- [ ] **Step 1: Measure canvas coverage**

At 320px, 390px, and 430px widths, confirm the single canvas covers the invitation viewport without horizontal overflow.

- [ ] **Step 2: Verify repeated approval**

Click APPROVE, wait until it re-enables, and click again. Confirm there is still exactly one canvas and the second sequence starts.

- [ ] **Step 3: Verify reduced motion and regressions**

Confirm reduced motion shows the success message without starting canvas animation, browser console errors are empty, developer term highlights remain readable, and gallery touch behavior remains `none`.

- [ ] **Step 4: Commit the implementation**

```bash
git add docs/superpowers/specs/2026-09-20-multi-burst-fireworks-design.md docs/superpowers/plans/2026-09-20-multi-burst-fireworks.md src/invitation.js src/app.js tests/invitation.test.js
git commit -m "feat: expand approval fireworks across screen"
```
