# White and Black Normal Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved pure-white editorial design to the real invitation's normal mode while keeping developer mode unchanged.

**Architecture:** Preserve the shared HTML and JavaScript behavior. Change the normal hero label in `index.html`, add a narrowly scoped normal-mode override layer in `styles.css`, and protect the approved styling and developer isolation with source-level regression tests.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node.js built-in test runner, in-app browser mobile QA.

---

## File map

- `index.html` — normal hero label and white browser theme color.
- `styles.css` — neutral palette plus normal-mode-only cover, section, calendar, gallery, location, accounts, dialog, and footer treatment.
- `tests/invitation.test.js` — regression coverage for the monochrome normal mode, hero name, calendar marker, gallery borders, and developer-mode isolation.

### Task 1: Lock the approved normal-mode contract with a failing test

**Files:**
- Modify: `tests/invitation.test.js`

- [ ] **Step 1: Replace the outdated shared-name assertion and add the new design test**

Replace the test named `developer copy uses merge language while both modes share the requested English name` with:

```js
test("normal mode omits the groom family name while developer branding keeps it", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /class="cover__name">Byung-kwan<\/p>/);
  assert.equal((html.match(/Kim Byung-kwan/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Byeong-gwan/);
  assert.match(html, /class="greeting greeting--normal"/);
  assert.match(html, /class="greeting greeting--developer"/);
  for (const term of ["branch", "commit", "conflict", "merge", "approve"]) {
    assert.match(html, new RegExp(term));
  }
});
```

Replace `the stylesheet defines the approved editorial theme` with:

```js
test("the stylesheet defines the approved pure-white normal mode", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<meta name="theme-color" content="#ffffff">/);
  assert.match(css, /--canvas:\s*#ececeb/);
  assert.match(css, /--paper:\s*#ffffff/);
  assert.match(css, /--ink:\s*#111111/);
  assert.match(css, /font-family:\s*Gulim,\s*"굴림",\s*sans-serif/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(css, /\.invitation\[data-mode="normal"\] \.cover\s*\{/);
  assert.match(css, /\.invitation\[data-mode="normal"\] \.section--dark\s*\{[^}]*background:\s*var\(--paper\)/s);
  assert.match(css, /\.invitation\[data-mode="normal"\] \.gallery-item\s*\{[^}]*border:\s*1px solid var\(--ink\)/s);
  assert.match(css, /\.invitation\[data-mode="normal"\] \.calendar__wedding-day\s*\{[^}]*border-radius:\s*50%[^}]*background:\s*var\(--ink\)[^}]*color:\s*var\(--paper\)/s);
  assert.match(css, /\.invitation\[data-mode="developer"\] \.section\s*\{/);
  assert.match(css, /\.photo-viewer__content\s*\{[^}]*touch-action:\s*none/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
```

- [ ] **Step 2: Run the test suite and verify the new assertions fail**

Run: `npm test`

Expected: FAIL because the current hero still contains `Kim Byung-kwan`, the theme color is warm, and the normal-mode override selectors do not exist.

### Task 2: Implement the white and black normal mode

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Test: `tests/invitation.test.js`

- [ ] **Step 1: Update the normal hero label and browser theme**

In `index.html`, set:

```html
<meta name="theme-color" content="#ffffff">
```

Change only the visible normal hero line to:

```html
<p class="cover__name">Byung-kwan</p>
```

Keep the developer transition line `wedding-v1.0 · Kim Byung-kwan × Kim Do-eun` unchanged.

- [ ] **Step 2: Change the shared normal palette tokens**

Set the root tokens in `styles.css` to:

```css
:root {
  color-scheme: light;
  --canvas: #ececeb;
  --paper: #ffffff;
  --ink: #111111;
  --text: #292929;
  --muted: #747474;
  --gold: #111111;
  --gold-strong: #111111;
  --line: #dedede;
}
```

- [ ] **Step 3: Add the scoped normal-mode presentation layer before the developer-mode rules**

Add the following selectors before `body.is-developer-mode`:

```css
.invitation[data-mode="normal"] .cover {
  display: flex;
  height: auto;
  min-height: 0;
  flex-direction: column;
  padding: 14px 14px 0;
  background: var(--paper);
}

.invitation[data-mode="normal"] .cover__media {
  position: relative;
  height: clamp(500px, 125vw, 620px);
}

.invitation[data-mode="normal"] .cover__shade,
.invitation[data-mode="normal"] .cover__arrow,
.invitation[data-mode="normal"] .petal-layer {
  display: none;
}

.invitation[data-mode="normal"] .cover__content {
  position: relative;
  padding: 30px 18px 48px;
  color: var(--ink);
}

.invitation[data-mode="normal"] .cover__name {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(34px, 9.5vw, 42px);
  font-style: normal;
  line-height: 1;
}

.invitation[data-mode="normal"] .cover__ampersand,
.invitation[data-mode="normal"] .cover__date {
  color: var(--ink);
}

.invitation[data-mode="normal"] .mode-toggle {
  border-color: var(--ink);
  background: rgba(255, 255, 255, 0.92);
  color: var(--ink);
}

.invitation[data-mode="normal"] .section {
  padding: 68px 40px;
  border-top: 1px solid var(--line);
  background: var(--paper);
  color: var(--text);
}

.invitation[data-mode="normal"] .section--dark {
  background: var(--paper);
  color: var(--text);
}

.invitation[data-mode="normal"] .section-kicker {
  color: var(--ink);
  font-style: normal;
  font-weight: 600;
}

.invitation[data-mode="normal"] .section-rule,
.invitation[data-mode="normal"] .section-rule--dark {
  width: 34px;
  height: 1px;
  margin: 20px auto 30px;
  background: var(--ink);
}

.invitation[data-mode="normal"] .family {
  padding: 25px 0 0;
  border-top: 1px solid var(--line);
  background: transparent;
  color: var(--text);
}

.invitation[data-mode="normal"] .family span,
.invitation[data-mode="normal"] .family strong {
  color: var(--text);
}

.invitation[data-mode="normal"] .schedule__date,
.invitation[data-mode="normal"] .schedule__time,
.invitation[data-mode="normal"] .schedule__venue,
.invitation[data-mode="normal"] .calendar,
.invitation[data-mode="normal"] .dday-copy,
.invitation[data-mode="normal"] .thanks__copy {
  color: var(--text);
}

.invitation[data-mode="normal"] .schedule__date {
  font-family: Georgia, "Times New Roman", serif;
}

.invitation[data-mode="normal"] .calendar-wrap,
.invitation[data-mode="normal"] .dday-copy {
  border-color: var(--line);
}

.invitation[data-mode="normal"] .calendar__month,
.invitation[data-mode="normal"] .calendar th {
  color: var(--muted);
}

.invitation[data-mode="normal"] .calendar__wedding-day {
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
}

.invitation[data-mode="normal"] .gallery-grid {
  padding: 0 14px;
  gap: 7px;
}

.invitation[data-mode="normal"] .gallery-item {
  border: 1px solid var(--ink);
  background: #f2f2f2;
}

.invitation[data-mode="normal"] .gallery-arrow {
  border-color: var(--ink);
  color: var(--ink);
}

.invitation[data-mode="normal"] .gallery-dot.is-active {
  background: var(--ink);
}

.invitation[data-mode="normal"] .map-frame {
  border-color: var(--ink);
}

.invitation[data-mode="normal"] .map-button,
.invitation[data-mode="normal"] .account-button {
  border-color: var(--ink);
  background: var(--paper);
  color: var(--ink);
}

.invitation[data-mode="normal"] .map-button--primary,
.invitation[data-mode="normal"] .account-button--accent {
  background: var(--ink);
  color: var(--paper);
}

.invitation[data-mode="normal"] .transport,
.invitation[data-mode="normal"] .transport strong,
.invitation[data-mode="normal"] .location__address {
  color: var(--text);
}

.invitation[data-mode="normal"] .footer {
  border-top: 1px solid var(--line);
  background: var(--paper);
}

body:not(.is-developer-mode) .account-dialog {
  background: var(--paper);
  color: var(--text);
}

body:not(.is-developer-mode) .account-row {
  border-color: var(--line);
}

body:not(.is-developer-mode) .account-row__role,
body:not(.is-developer-mode) .account-row__holder {
  color: var(--muted);
}

body:not(.is-developer-mode) .account-row__copy {
  background: var(--ink);
  color: var(--paper);
}
```

- [ ] **Step 4: Run automated verification**

Run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Expected: all 22 tests pass and every command exits 0.

- [ ] **Step 5: Commit the implementation**

```bash
git add index.html styles.css tests/invitation.test.js
git commit -m "feat: refresh normal mode in white and black"
```

### Task 3: Verify the real invitation visually

**Files:**
- Verify: `index.html`
- Verify: `styles.css`
- Verify: `src/app.js`

- [ ] **Step 1: Start a local server from this worktree**

Run: `python3 -m http.server 4176 --bind 127.0.0.1`

Expected: the invitation is available at `http://127.0.0.1:4176/`.

- [ ] **Step 2: Inspect normal mode at 390 x 844**

Verify the inset cover, `Byung-kwan & Do-eun`, white sections, existing seven-column calendar, black circular 21 marker, black gallery borders, monochrome map buttons, account buttons, and account dialog. Confirm no horizontal overflow.

- [ ] **Step 3: Inspect developer mode**

Enter developer mode and verify the terminal boot completes, the terminal palette is unchanged, AI approvals remain visible, final approval fires the canvas animation, and re-entry resets only the user's final approval.

- [ ] **Step 4: Check browser errors and run final tests**

Run: `npm test && git status --short`

Expected: 22 passing tests, no browser errors, and only intended files committed.
