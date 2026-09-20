# Arched Cover and Display Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the normal-mode cover photo a reference-style arch and match the reference's italic display-serif lettering below it.

**Architecture:** Keep the existing HTML and image asset unchanged. Add narrowly scoped normal-mode CSS rules and protect them with source-level regression assertions in the existing Node test suite; developer-mode rules remain untouched.

**Tech Stack:** HTML, CSS, Node.js built-in test runner, in-app mobile browser preview

---

### Task 1: Lock the approved cover styling in a failing test

**Files:**
- Modify: `tests/invitation.test.js:150-173`
- Test: `tests/invitation.test.js`

- [ ] **Step 1: Add the failing CSS assertions**

Add these assertions to `the stylesheet defines the approved pure-white normal mode`:

```js
assert.match(
  css,
  /\.invitation\[data-mode="normal"\] \.cover__media\s*\{[^}]*margin:\s*24px 24px 0[^}]*overflow:\s*hidden[^}]*border-radius:\s*50% 50% 0 0 \/ 26% 26% 0 0/s,
);
assert.match(
  css,
  /\.invitation\[data-mode="normal"\] \.cover__name\s*\{[^}]*font-family:\s*Didot,\s*"Bodoni Moda",\s*"Bodoni MT",\s*"Times New Roman",\s*serif[^}]*font-style:\s*italic/s,
);
assert.match(
  css,
  /\.invitation\[data-mode="normal"\] \.cover__ampersand\s*\{[^}]*font-family:\s*Didot,\s*"Bodoni Moda",\s*"Bodoni MT",\s*"Times New Roman",\s*serif[^}]*font-style:\s*italic/s,
);
```

- [ ] **Step 2: Run the test and verify the new assertions fail**

Run: `npm test`

Expected: the normal-mode stylesheet test fails because the arched media margin/radius and display type rules do not exist yet.

### Task 2: Implement and visually verify the normal-mode cover

**Files:**
- Modify: `styles.css:934-970`
- Test: `tests/invitation.test.js`

- [ ] **Step 1: Add the reference-style arch**

Update the normal-mode cover media rule:

```css
.invitation[data-mode="normal"] .cover__media {
  position: relative;
  height: clamp(500px, 125vw, 620px);
  margin: 24px 24px 0;
  overflow: hidden;
  border-radius: 50% 50% 0 0 / 26% 26% 0 0;
}
```

- [ ] **Step 2: Apply the display-serif type to the names and ampersand**

Update the name rule and add an ampersand rule:

```css
.invitation[data-mode="normal"] .cover__name {
  font-family: Didot, "Bodoni Moda", "Bodoni MT", "Times New Roman", serif;
  font-size: clamp(34px, 9.5vw, 42px);
  font-style: italic;
  font-weight: 400;
  line-height: 1;
}

.invitation[data-mode="normal"] .cover__ampersand {
  font-family: Didot, "Bodoni Moda", "Bodoni MT", "Times New Roman", serif;
  font-style: italic;
}
```

- [ ] **Step 3: Run automated verification**

Run: `npm test && git diff --check`

Expected: all 22 tests pass and `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Verify the mobile preview**

Open `http://127.0.0.1:4176/` at a 390 × 844 viewport and confirm:

- the photo has a symmetrical top arch with 24px side margins;
- the photo bottom stays rectangular;
- the names and ampersand use italic display-serif lettering;
- the page has no horizontal overflow;
- developer mode keeps its existing terminal cover styling.

- [ ] **Step 5: Commit the implementation after preview approval**

```bash
git add styles.css tests/invitation.test.js
git commit -m "feat: add arched normal-mode cover"
```
