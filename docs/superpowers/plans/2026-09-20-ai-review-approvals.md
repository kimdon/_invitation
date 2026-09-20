# AI Review Final Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all five AI reviews as already approved and let the user approve the wedding release exactly once per developer-mode entry.

**Architecture:** Render every AI card and selector as approved from static review data. Keep one `isFinalApproved` boolean inside `setupDeveloperMode()` to drive the shared button, final response, rotation, duplicate guard, and reset on each developer-mode entry.

**Tech Stack:** Static HTML/CSS, browser JavaScript, Node.js built-in test runner

---

### Task 1: Define failing final-approval tests

**Files:**
- Modify: `tests/invitation.test.js:248-370`

- [ ] **Step 1: Require the 1-second SUCCESS hold**

Update the unified boot test to match `await wait(1000)` and reject the obsolete 600 ms wait.

- [ ] **Step 2: Require default-approved AI reviews**

Add assertions that the intro reports approval, the card always reveals its approved message, and selector buttons use an approved-review accessibility label and class:

```js
assert.match(html, /다섯 명의 에이전트가 두 사람의 새로운 배포를 검토하고 승인했습니다\./);
assert.match(app, /approved\.hidden = false/);
assert.match(app, /button\.classList\.add\("is-approved"\)/);
assert.match(app, /`\$\{agent\.name\} 승인 완료 리뷰 보기`/);
```

- [ ] **Step 3: Require one final user approval**

```js
assert.match(app, /let isFinalApproved = false/);
assert.match(app, /if \(state !== "developer\.ready" \|\| isFinalApproved\) return/);
assert.match(app, /isFinalApproved = true/);
assert.match(app, /submit\.textContent = "APPROVED ✓"/);
assert.match(app, /FINAL APPROVAL COMPLETE — wedding-v1\.0 is ready to merge ♥/);
assert.match(app, /function resetFinalApproval\(\)/);
assert.match(css, /\.agent-selector button\.is-approved/);
assert.match(css, /\.developer-response\.is-complete/);
```

- [ ] **Step 4: Run tests and verify failure**

Run: `npm test`

Expected: tests fail because reviews are hidden until approval, final approval is repeatable, and the boot wait is 600 ms.

### Task 2: Render all AI reviews as approved

**Files:**
- Modify: `index.html:190-205`
- Modify: `src/app.js:1-690`

- [ ] **Step 1: Update the review introduction**

Use:

```html
<p class="developer-rsvp__intro">다섯 명의 에이전트가 두 사람의 새로운 배포를 검토하고 승인했습니다.</p>
```

- [ ] **Step 2: Show approved review copy by default**

In `renderAgent`, keep `approved.textContent = agent.approved` and set `approved.hidden = false`.

- [ ] **Step 3: Mark every selector as approved**

When creating selectors, add `is-approved` and set the label to `${agent.name} 승인 완료 리뷰 보기`. Preserve the active selector state separately.

### Task 3: Add one-time final approval state

**Files:**
- Modify: `src/app.js:340-690`
- Modify: `styles.css:1280-1425`

- [ ] **Step 1: Add final approval state and reset**

Add `let isFinalApproved = false` and:

```js
function resetFinalApproval() {
  isFinalApproved = false;
  agentIndex = 0;
  submit.textContent = "APPROVE ♥";
  submit.disabled = false;
  response.textContent = "";
  response.hidden = true;
  response.classList.remove("is-complete");
  renderAgent(0);
}
```

Call it in `enterDeveloperMode()` after `cancelAnimations()` so every new entry starts fresh.

- [ ] **Step 2: Prevent rotation after final approval**

Make `startAgentRotation()` return when `isFinalApproved` is true. This also prevents manual AI selection after final approval from restarting the interval.

- [ ] **Step 3: Replace the repeatable click handler**

```js
submit.addEventListener("click", () => {
  if (state !== "developer.ready" || isFinalApproved) return;
  isFinalApproved = true;
  stopAgentRotation();
  submit.textContent = "APPROVED ✓";
  submit.disabled = true;
  response.textContent = "FINAL APPROVAL COMPLETE — wedding-v1.0 is ready to merge ♥";
  response.classList.add("is-complete");
  response.hidden = false;
  launchFireworks(AI_GUEST_MESSAGES[agentIndex]);
});
```

Remove the obsolete `celebrated` state and delayed button re-enable logic. Remove `FIREWORK_SEQUENCE_MS` after it becomes unused.

- [ ] **Step 4: Change the SUCCESS hold time**

Replace `await wait(600)` with `await wait(1000)`. Keep the 450 ms terminal fade unchanged.

- [ ] **Step 5: Style approved reviews and final completion**

```css
.agent-selector button.is-approved {
  position: relative;
  border-color: var(--terminal-green);
}

.agent-selector button.is-approved::after {
  position: absolute;
  top: 3px;
  right: 5px;
  color: var(--terminal-green);
  content: "✓";
  font-size: 10px;
}

.developer-congratulations button:disabled {
  cursor: default;
  opacity: 0.72;
}

.developer-response.is-complete {
  color: var(--terminal-pink);
  font-weight: 600;
}
```

- [ ] **Step 6: Run automated verification**

Run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Expected: syntax checks succeed, all tests pass, and no whitespace errors appear.

### Task 4: Verify final interaction in the browser

**Files:**
- Verify only: `index.html`, `src/app.js`, `styles.css`

- [ ] **Step 1: Verify default approval state**

At a 390 px viewport, enter developer mode and verify all selector buttons show approval markers and each selected card displays its `APPROVED` copy before user interaction.

- [ ] **Step 2: Verify one-time final approval**

Click `APPROVE ♥` once and confirm fireworks, the exact completion message, `APPROVED ✓`, and a disabled button. Confirm another approval cannot run.

- [ ] **Step 3: Verify developer-mode entry reset**

Return to normal mode, enter developer mode again, and confirm AI reviews remain approved while the user button resets to enabled `APPROVE ♥` and the completion response is hidden.

- [ ] **Step 4: Verify timing and reduced motion**

Confirm SUCCESS remains visible for 1 second before the 0.45 second fade. With reduced motion enabled, confirm the completed Invitation appears immediately.

- [ ] **Step 5: Run final verification and commit**

Run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Commit:

```bash
git add index.html src/app.js styles.css tests/invitation.test.js
git commit -m "feat: add one-time final review approval"
```
