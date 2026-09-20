# AI Review Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each AI review to be approved once per developer-mode entry and show a final completion message after all five approvals.

**Architecture:** Keep approval state inside `setupDeveloperMode()` as a `Set` of AI indexes. Derive the active card, selector accessibility state, shared approval button, progress response, and all-approved state from that set; clear it whenever developer-mode entry begins.

**Tech Stack:** Static HTML/CSS, browser JavaScript, Node.js built-in test runner

---

### Task 1: Define failing approval-state tests

**Files:**
- Modify: `tests/invitation.test.js:310-370`

- [ ] **Step 1: Add assertions for per-agent approval state**

Add a test that reads `src/app.js` and `styles.css` and verifies:

```js
assert.match(app, /const approvedAgentIndexes = new Set\(\)/);
assert.match(app, /approvedAgentIndexes\.has\(agentIndex\)/);
assert.match(app, /approvedAgentIndexes\.add\(agentIndex\)/);
assert.match(app, /approvedAgentIndexes\.size === AI_GUEST_MESSAGES\.length/);
assert.match(app, /submit\.textContent = isApproved \? "APPROVED ✓" : "APPROVE ♥"/);
assert.match(app, /ALL REVIEWS APPROVED — wedding-v1\.0 is ready to merge ♥/);
assert.match(app, /function resetApprovals\(\)/);
assert.match(css, /\.agent-selector button\.is-approved/);
assert.match(css, /\.developer-response\.is-complete/);
```

- [ ] **Step 2: Update the boot delay assertion**

Change the unified boot test to require `await wait(1000)` and reject the obsolete 600 ms completion wait.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test`

Expected: the approval state and 1-second delay assertions fail because the current shared approval can repeat and still waits 600 ms.

### Task 2: Implement per-agent approval state

**Files:**
- Modify: `src/app.js:1-690`

- [ ] **Step 1: Store approved AI indexes**

Inside `setupDeveloperMode()`, add:

```js
const approvedAgentIndexes = new Set();
```

Remove `FIREWORK_SEQUENCE_MS`, which is no longer needed once button state is derived from the approved set.

- [ ] **Step 2: Render card and selector approval state**

In `renderAgent`, derive `isApproved`, keep an approved card's message visible, and set the shared button state:

```js
const isApproved = approvedAgentIndexes.has(agentIndex);
approved.hidden = !isApproved;
submit.textContent = isApproved ? "APPROVED ✓" : "APPROVE ♥";
submit.disabled = isApproved;
```

For every selector button, toggle `is-approved` and update its accessible label to either `{name} 승인 완료 리뷰 보기` or `{name} 승인 메시지 보기`.

- [ ] **Step 3: Stop rotation after all reviews are approved**

Extend `startAgentRotation()` so it returns without creating an interval when `approvedAgentIndexes.size === AI_GUEST_MESSAGES.length`.

- [ ] **Step 4: Reset approvals on each developer-mode entry**

Add `resetApprovals()` that clears the set, removes the completion class and response, and renders the first AI. Call it near the start of `enterDeveloperMode()` after canceling current animations.

- [ ] **Step 5: Replace the shared celebration state**

In the approval click handler:

```js
if (state !== "developer.ready" || approvedAgentIndexes.has(agentIndex)) return;
const agent = AI_GUEST_MESSAGES[agentIndex];
approvedAgentIndexes.add(agentIndex);
renderAgent(agentIndex);
launchFireworks(agent);

if (approvedAgentIndexes.size === AI_GUEST_MESSAGES.length) {
  stopAgentRotation();
  response.textContent = "ALL REVIEWS APPROVED — wedding-v1.0 is ready to merge ♥";
  response.classList.add("is-complete");
} else {
  response.textContent = `200 OK — ${agent.name} 리뷰 승인 완료 · ${approvedAgentIndexes.size} / ${AI_GUEST_MESSAGES.length} approved`;
  response.classList.remove("is-complete");
}
response.hidden = false;
```

Do not schedule button re-enabling; selecting an unapproved AI enables it through `renderAgent`.

- [ ] **Step 6: Change SUCCESS hold time**

Replace `await wait(600)` with `await wait(1000)` while keeping the existing 450 ms fade duration.

### Task 3: Add clear visual completion states

**Files:**
- Modify: `styles.css:1280-1425`

- [ ] **Step 1: Mark approved selector buttons**

Add a green approved outline and check marker:

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
```

- [ ] **Step 2: Style disabled and all-approved states**

Use a settled disabled cursor and emphasize the final response:

```css
.developer-congratulations button:disabled {
  cursor: default;
  opacity: 0.72;
}

.developer-response.is-complete {
  color: var(--terminal-pink);
  font-weight: 600;
}
```

- [ ] **Step 3: Run automated verification**

Run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Expected: syntax checks succeed, all tests pass, and no whitespace errors appear.

### Task 4: Verify the complete interaction

**Files:**
- Verify only: `src/app.js`, `styles.css`, `index.html`

- [ ] **Step 1: Verify one-time approval**

At a 390 px mobile viewport, enter developer mode, approve the first AI, and verify its message remains visible and the button reads `APPROVED ✓` and is disabled. Re-selecting the same AI must not trigger another approval.

- [ ] **Step 2: Verify all five approvals**

Approve each remaining AI and confirm selector check markers, `5 / 5` completion, stopped automatic rotation, and the exact final message.

- [ ] **Step 3: Verify entry reset**

Return to normal mode, enter developer mode again, and confirm all approval markers and progress are cleared and `APPROVE ♥` is enabled for the first AI.

- [ ] **Step 4: Verify boot timing and reduced motion**

Confirm normal motion keeps SUCCESS visible for 1 second before the 0.45 second fade. With reduced motion enabled, confirm the final Invitation appears immediately.

- [ ] **Step 5: Verify regressions and commit**

Confirm fireworks still display for each newly approved AI and browser error logs are empty. Then run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Commit:

```bash
git add src/app.js styles.css tests/invitation.test.js
git commit -m "feat: track individual AI review approvals"
```
