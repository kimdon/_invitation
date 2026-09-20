# Unified Developer Boot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Git switching and wedding application boot logs in one full-screen terminal, then reveal the developer Invitation after SUCCESS with color-only Git term emphasis.

**Architecture:** Reuse the existing `developer-transition` overlay as the single log surface and append both command and application log elements to its existing live log container. Keep the invitation in `switching` state until the terminal exit completes, then reveal developer mode with its normal cover hidden so the Invitation is the first visible section.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js built-in test runner

---

### Task 1: Lock the unified flow and color-only emphasis in tests

**Files:**
- Modify: `tests/invitation.test.js:225-275`

- [ ] **Step 1: Strengthen the Git term style test**

Extract the scoped `.developer-term` rule and verify it keeps the terminal blue and font weight while containing no `text-decoration` declaration:

```js
const termRule = css.match(
  /\.invitation\[data-mode="developer"\] \.developer-term\s*\{([^}]*)\}/,
)?.[1] ?? "";
assert.match(termRule, /color:\s*var\(--terminal-blue\)/);
assert.match(termRule, /font-weight:\s*600/);
assert.doesNotMatch(termRule, /text-decoration/);
```

- [ ] **Step 2: Replace the old boot-gate test with unified terminal assertions**

Assert the transition contains a hidden boot brand, the obsolete cover log is absent, both log paths append to `transitionLines`, and the final state waits 600 ms plus a 450 ms exit:

```js
assert.match(html, /id="developer-transition-brand"[^>]+hidden/);
assert.doesNotMatch(html, /id="developer-console-log"/);
assert.match(app, /transitionLines\.appendChild\(line\)/);
assert.doesNotMatch(app, /const consoleLog =/);
assert.match(app, /await wait\(600\)/);
assert.match(app, /transition\.classList\.add\("is-exiting"\)/);
assert.match(app, /await wait\(450\)/);
assert.match(css, /\.developer-transition\.is-exiting\s*\{/);
assert.match(
  css,
  /\.invitation\[data-mode="developer"\] \.cover\s*\{[^}]*display:\s*none/s,
);
```

- [ ] **Step 3: Run tests and confirm they fail**

Run: `npm test`

Expected: the updated Git style and unified terminal tests fail because the old underline and split log surfaces still exist.

### Task 2: Move the release identity into the unified terminal

**Files:**
- Modify: `index.html:27-65`
- Modify: `styles.css:830-1060`

- [ ] **Step 1: Add the compact terminal boot brand**

Insert this block between the terminal bar and log container:

```html
<div class="developer-transition__brand" id="developer-transition-brand" hidden>
  <span class="developer-transition__heart" aria-hidden="true">♥</span>
  <strong>OUR WEDDING</strong>
  <span>wedding-v1.0 · Kim Byung-kwan × Kim Do-eun</span>
</div>
```

Remove the obsolete `.developer-cover` block and `developer-console-log` from the normal cover while preserving the normal cover content.

- [ ] **Step 2: Style the unified terminal**

Give `.developer-transition` the terminal color variables, add a 0.45 second opacity transition, and define the exit state:

```css
.developer-transition {
  --terminal-text: #c9d1d9;
  --terminal-dim: #8b949e;
  --terminal-green: #7ee787;
  --terminal-blue: #79c0ff;
  opacity: 1;
  transition: opacity 0.45s ease;
}

.developer-transition.is-exiting {
  opacity: 0;
  pointer-events: none;
}
```

Style the compact heart brand, make the log container scroll internally from top to bottom, and keep it usable on a 390 px mobile viewport.

- [ ] **Step 3: Make Invitation the first developer section**

Replace the developer cover layout with:

```css
.invitation[data-mode="developer"] .cover {
  display: none;
}

.invitation[data-mode="developer"] > .invitation-copy {
  padding-top: 96px;
  border-top: 0;
}
```

Remove CSS that only styled the deleted developer cover and console.

- [ ] **Step 4: Remove Git term underlines**

Keep only the color, weight, and wrapping behavior:

```css
.invitation[data-mode="developer"] .developer-term {
  color: var(--terminal-blue);
  font-weight: 600;
  white-space: nowrap;
}
```

### Task 3: Run the complete sequence on one log surface

**Files:**
- Modify: `src/app.js:330-545`

- [ ] **Step 1: Replace the old console binding**

Bind `developer-transition-brand`, remove `developer-console-log`, and gather the direct page content sections so they can be hidden during switching:

```js
const transitionBrand = document.getElementById("developer-transition-brand");
const pageSections = invitation.querySelectorAll(
  ":scope > .cover, :scope > .section, :scope > .developer-rsvp, :scope > .footer",
);
```

Add a helper that updates each section's `hidden` property.

- [ ] **Step 2: Keep appended logs visible inside the terminal**

Update `scrollToLatest` to scroll the terminal container rather than the document:

```js
function scrollToLatest() {
  transitionLines.scrollTo({
    top: transitionLines.scrollHeight,
    behavior: reducedMotion.matches ? "auto" : "smooth",
  });
}
```

Call it after both Git command lines and application log lines are appended.

- [ ] **Step 3: Append boot logs after Git logs without clearing**

In `renderWeddingBoot`, reveal `transitionBrand`, set `transitionLines` busy, append each `createLogLine` result to `transitionLines`, and validate that the invitation remains in `switching` mode.

- [ ] **Step 4: Exit the terminal only after SUCCESS**

After all boot entries:

```js
transitionLines.setAttribute("aria-busy", "false");
await wait(600);
if (id !== sequenceId || invitation.dataset.mode !== "switching") return;
transition.classList.add("is-exiting");
await wait(450);
if (id !== sequenceId || invitation.dataset.mode !== "switching") return;
transition.hidden = true;
transition.classList.remove("is-exiting");
invitation.dataset.mode = "developer";
invitation.dataset.bootState = "ready";
invitation.setAttribute("aria-busy", "false");
document.body.classList.remove("is-switching-mode");
pageSections.forEach((section) => { section.hidden = false; });
toggle.disabled = false;
state = "developer.ready";
startAgentRotation();
```

- [ ] **Step 5: Simplify mode entry and reset**

Keep the transition visible after Git switching and call `await renderWeddingBoot(id)` directly. On normal-mode reset, hide the brand, remove the exit class, clear logs, unhide page sections, and leave existing approval state reset behavior unchanged.

- [ ] **Step 6: Run automated verification**

Run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Expected: syntax checks succeed, all tests pass, and no whitespace errors are reported.

### Task 4: Verify the user-visible flow

**Files:**
- Verify only: `index.html`, `src/app.js`, `styles.css`

- [ ] **Step 1: Test at a 390 px mobile viewport**

Open the local preview, click `develop mode`, and confirm Git and application logs remain in one full-screen terminal. During switching, the Invitation must not be visible.

- [ ] **Step 2: Confirm SUCCESS transition**

Verify the final log reads `SUCCESS wedding-v1.0 deployed ♥`, the terminal fades out, and `Invitation` appears at the top without a developer cover or automatic document scroll.

- [ ] **Step 3: Confirm preserved interactions**

Check the Git terms are blue with no underline, the approval button still creates multiple fireworks, and browser error logs are empty.

- [ ] **Step 4: Confirm reduced motion**

Emulate `prefers-reduced-motion: reduce`, enter developer mode, and verify the completed Invitation appears immediately without transition animation.

- [ ] **Step 5: Run final verification and commit**

Run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Commit the tested implementation:

```bash
git add index.html src/app.js styles.css tests/invitation.test.js
git commit -m "feat: unify developer boot sequence"
```
