# Developer Invitation Copy and Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the developer-mode Invitation section playful branch/commit/conflict/merge copy, add DEBUG and WARNING boot logs, standardize the groom's English display name, and replace comment submission with a repeatable approval-fireworks button.

**Architecture:** Keep the existing single invitation DOM. Add separate normal and developer greeting elements selected by CSS, keep boot data in `src/invitation.js`, and simplify the existing developer interaction in `src/app.js` to a button click that reveals the selected AI response and launches the existing particle layer.

**Tech Stack:** Static HTML, CSS, browser-native JavaScript ES modules, Node.js built-in test runner.

---

## File structure

- `index.html`: Owns normal/developer copy, English display names, and approval controls.
- `src/invitation.js`: Owns the ordered developer boot log data.
- `src/app.js`: Renders boot logs and handles AI selection, approval state, and fireworks.
- `styles.css`: Switches greeting visibility and styles new DEBUG/WARNING log levels and the simplified button.
- `tests/invitation.test.js`: Locks down requested copy, name, boot levels, and comment-free approval contract.

### Task 1: Developer copy, English name, and boot log levels

**Files:**
- Modify: `tests/invitation.test.js:174-256`
- Modify: `index.html:45-92`
- Modify: `src/invitation.js:67-76`
- Modify: `src/app.js:441-452`
- Modify: `styles.css:977-1004,1063-1070`

- [ ] **Step 1: Write the failing tests**

Add these assertions to the boot sequence test:

```js
const levels = sequence.map((entry) => entry.level);
assert.ok(levels.includes("DEBUG"));
assert.ok(levels.includes("WARNING"));
assert.match(source, /BranchHistory/);
assert.match(source, /ConflictResolver/);
```

Add a focused page-copy test:

```js
test("developer copy uses merge language while both modes share the requested English name", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.equal((html.match(/Kim Byung-kwan/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Byeong-gwan/);
  assert.match(html, /class="greeting greeting--normal"/);
  assert.match(html, /class="greeting greeting--developer"/);
  for (const term of ["branch", "commit", "conflict", "merge", "approve"]) {
    assert.match(html, new RegExp(term));
  }
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
npm test -- --test-name-pattern="buildDeveloperSequence|developer copy"
```

Expected: FAIL because DEBUG/WARNING entries, the exact English name, and the alternate greeting do not exist.

- [ ] **Step 3: Add the two-mode copy and requested name**

Change the normal cover and developer cover names in `index.html`:

```html
<p class="cover__name">Kim Byung-kwan</p>
<p class="cover__ampersand">&amp;</p>
<p class="cover__name">Do-eun</p>
<p class="developer-cover__names">Kim Byung-kwan × Kim Do-eun</p>
```

Mark the existing greeting as normal and add the developer greeting immediately after it:

```html
<p class="greeting greeting--normal">
  서로가 마주보며 다져온 사랑을<br>
  이제 함께 한곳을 바라보며<br>
  걸어갈 수 있는 큰 사랑으로<br>
  키우고자 합니다.<br><br>
  저희 두 사람이 사랑의 이름으로<br>
  지켜나갈 수 있도록<br>
  오셔서 축복해 주시면<br>
  더없는 기쁨으로 간직하겠습니다.
</p>
<p class="greeting greeting--developer">
  서로 다른 branch에서 시작된 두 사람이<br>
  수많은 commit으로 추억을 쌓아왔습니다.<br>
  가끔 예상하지 못한 conflict도 있었지만<br>
  대화와 믿음으로 하나씩 resolve해 왔습니다.<br><br>
  이제 두 마음을 평생이라는 main branch에<br>
  merge하려 합니다.<br>
  저희의 새로운 release를 따뜻한 마음으로<br>
  approve해 주세요.
</p>
```

- [ ] **Step 4: Add DEBUG and WARNING boot entries**

Insert the two entries into `DEVELOPER_SEQUENCE` without changing existing data:

```js
Object.freeze({ level: "DEBUG", logger: "BranchHistory", message: "commit history synchronized" }),
Object.freeze({ level: "WARNING", logger: "ConflictResolver", message: "minor conflicts resolved with trust" }),
```

Expand the timestamp list in `renderWeddingBoot` to nine ordered values:

```js
const times = [
  "13:49:58.000",
  "13:49:58.214",
  "13:49:58.351",
  "13:49:58.482",
  "13:49:58.629",
  "13:49:58.810",
  "13:49:59.050",
  "13:49:59.421",
  "13:50:00.000",
];
```

- [ ] **Step 5: Add minimal CSS mode and log-level styling**

```css
.greeting--developer {
  display: none;
}

.invitation[data-mode="developer"] .greeting--normal {
  display: none;
}

.invitation[data-mode="developer"] .greeting--developer {
  display: block;
}

.developer-log-line--debug strong {
  color: var(--terminal-blue);
}

.developer-log-line--warning strong {
  color: #f2cc60;
}
```

- [ ] **Step 6: Run the focused tests and confirm GREEN**

Run:

```bash
npm test -- --test-name-pattern="buildDeveloperSequence|developer copy"
```

Expected: both matching tests PASS.

- [ ] **Step 7: Commit the first behavior slice**

```bash
git add index.html src/invitation.js src/app.js styles.css tests/invitation.test.js
git commit -m "feat: add developer invitation merge story"
```

### Task 2: Comment-free approval fireworks

**Files:**
- Modify: `tests/invitation.test.js:225-256`
- Modify: `index.html:183-203`
- Modify: `src/app.js:325-566`
- Modify: `styles.css:1315-1376`

- [ ] **Step 1: Write the failing approval contract test**

Replace the old visitor-input assertion and add the comment-free behavior assertions:

```js
assert.doesNotMatch(html, /id="visitor-message"/);
assert.doesNotMatch(html, /id="developer-rsvp-log"/);
assert.doesNotMatch(html, /id="developer-congratulations-form"/);
assert.match(html, /id="developer-congratulations" type="button">APPROVE ♥<\/button>/);
assert.doesNotMatch(app, /messageInput|rsvpLog|VISITOR/);
assert.match(app, /submit\.addEventListener\("click"/);
assert.match(app, /200 OK — 승인되었습니다\. ♥/);
assert.match(app, /index < 42/);
```

- [ ] **Step 2: Run the contract test and confirm RED**

Run:

```bash
npm test -- --test-name-pattern="shared invitation DOM"
```

Expected: FAIL because the comment input/form/log and submit-based handler still exist.

- [ ] **Step 3: Simplify the approval markup**

Replace the form and visitor log in `index.html` with:

```html
<div class="developer-congratulations">
  <button id="developer-congratulations" type="button">APPROVE ♥</button>
</div>
<p class="developer-response" id="developer-response" role="status" aria-live="polite" hidden></p>
```

- [ ] **Step 4: Simplify the approval event handler**

Remove the `form`, `messageInput`, and `rsvpLog` element lookups and all reset logic for them. Replace the submit handler with:

```js
submit.addEventListener("click", () => {
  if (state !== "developer.ready" && state !== "celebrated") return;
  const agent = AI_GUEST_MESSAGES[agentIndex];
  approved.hidden = false;
  response.textContent = "200 OK — 승인되었습니다. ♥";
  response.hidden = false;
  submit.disabled = true;
  state = "celebrated";
  launchParticles(agent);
  schedule(() => {
    submit.disabled = false;
    state = "developer.ready";
  }, 1_300);
});
```

- [ ] **Step 5: Remove dead comment-control CSS**

Delete only these now-unused selectors and their declarations:

```css
.developer-congratulations label
.developer-congratulations label span
.developer-congratulations input
.developer-congratulations input:focus
.developer-rsvp__log
.developer-rsvp__log strong
```

Keep `.developer-congratulations`, its button styles, disabled state, `.developer-response`, and particle animation styles.

- [ ] **Step 6: Run the focused contract test and confirm GREEN**

Run:

```bash
npm test -- --test-name-pattern="shared invitation DOM"
```

Expected: matching test PASS.

- [ ] **Step 7: Commit the second behavior slice**

```bash
git add index.html src/app.js styles.css tests/invitation.test.js
git commit -m "feat: simplify developer approval fireworks"
```

### Task 3: Official local AI icons

**Files:**
- Create: `images/ai-icons/codex.png`
- Create: `images/ai-icons/claude.png`
- Create: `images/ai-icons/cursor.svg`
- Create: `images/ai-icons/kimi.svg`
- Create: `images/ai-icons/gemini.png`
- Create: `images/ai-icons/SOURCES.md`
- Modify: `src/invitation.js:20-64`
- Modify: `src/app.js:367-438`
- Modify: `styles.css:1240-1315`
- Modify: `tests/invitation.test.js:210-239`

- [ ] **Step 1: Write the failing icon contract tests**

Require `iconSrc` on exactly the five approved agents and lock it to local files:

```js
assert.deepEqual(AI_GUEST_MESSAGES.map((agent) => agent.iconSrc), [
  "./images/ai-icons/codex.png",
  "./images/ai-icons/claude.png",
  "./images/ai-icons/cursor.svg",
  "./images/ai-icons/kimi.svg",
  "./images/ai-icons/gemini.png",
]);
for (const agent of AI_GUEST_MESSAGES) {
  assert.ok(agent.icon, "text fallback is required");
  assert.match(agent.iconSrc, /^\.\/images\/ai-icons\//);
}
```

Read each asset with `readFile`, assert it is non-empty, and assert the app/CSS contract:

```js
assert.match(app, /function createAgentIconVisual\(/);
assert.match(app, /image\.src = agent\.iconSrc/);
assert.match(app, /image\.alt = ""/);
assert.match(app, /image\.addEventListener\("error"/);
assert.match(app, /agent-selector__name/);
assert.match(css, /object-fit:\s*contain/);
```

- [ ] **Step 2: Run the icon tests and confirm RED**

Run:

```bash
npm test -- --test-name-pattern="AI guest messages|local AI icons"
```

Expected: FAIL because no `iconSrc` data or local icon assets exist.

- [ ] **Step 3: Acquire the official assets locally**

Store the assets at the paths above using these official sources:

```text
Codex: OpenAI official app icon from https://help.openai.com/en/articles/7905742-what-does-the-official-chatgpt-ios-app-icon-look-like
Claude: Claude official favicon from https://assets.claude.com/95a868946ac8a31e5ff832e2899f294aa368b836.png?w=64&h=64
Cursor: CUBE_2D_DARK.svg from the official https://cursor.com/brand asset archive
Kimi: Logomark_Light.svg from the official https://www.kimi.com/en/resources/kimi-brand asset archive
Gemini: official Gemini sparkle PNG from https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png
```

Record the source page, direct asset/archive URL, archive member when applicable, and local path in `images/ai-icons/SOURCES.md`. Keep the raster files small enough for mobile use and do not hotlink them from HTML or JavaScript.

- [ ] **Step 4: Add icon paths without removing text fallbacks**

Add one `iconSrc` property to each existing `AI_GUEST_MESSAGES` entry:

```js
iconSrc: "./images/ai-icons/codex.png",
iconSrc: "./images/ai-icons/claude.png",
iconSrc: "./images/ai-icons/cursor.svg",
iconSrc: "./images/ai-icons/kimi.svg",
iconSrc: "./images/ai-icons/gemini.png",
```

Keep each existing `icon` property as the load-failure fallback.

- [ ] **Step 5: Render the same image helper in selectors and the active card**

Add this helper inside `setupDeveloperMode`:

```js
function createAgentIconVisual(agent, className) {
  const frame = document.createElement("span");
  const fallback = document.createElement("span");
  const image = document.createElement("img");
  frame.className = className;
  fallback.className = "agent-icon__fallback";
  fallback.textContent = agent.icon;
  fallback.setAttribute("aria-hidden", "true");
  image.className = "agent-icon__image";
  image.alt = "";
  image.src = agent.iconSrc;
  image.addEventListener("error", () => image.remove(), { once: true });
  frame.append(fallback, image);
  return frame;
}
```

In `renderAgent`, replace the active card's icon content with `createAgentIconVisual(agent, "agent-review__visual")`. In each selector button, append `createAgentIconVisual(agent, "agent-selector__visual")` plus a visible `.agent-selector__name` span containing `agent.name`. Keep the button's existing Korean `aria-label`.

- [ ] **Step 6: Size icons consistently for the dark terminal**

```css
.agent-selector button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.agent-selector__visual,
.agent-review__visual {
  position: relative;
  display: grid;
  place-items: center;
}

.agent-selector__visual {
  width: 24px;
  height: 24px;
}

.agent-review__visual {
  width: 30px;
  height: 30px;
}

.agent-icon__image,
.agent-icon__fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.agent-icon__image {
  z-index: 1;
  background: var(--terminal-panel);
  object-fit: contain;
}

.agent-icon__fallback {
  display: grid;
  place-items: center;
}

.agent-selector__name {
  margin-top: 4px;
  font-size: 9px;
  line-height: 1.15;
}
```

- [ ] **Step 7: Run the icon tests and confirm GREEN**

Run:

```bash
npm test -- --test-name-pattern="AI guest messages|local AI icons"
```

Expected: both matching tests PASS.

- [ ] **Step 8: Commit the official icon slice**

```bash
git add images/ai-icons src/invitation.js src/app.js styles.css tests/invitation.test.js
git commit -m "feat: use official AI icons in developer review"
```

### Task 4: Full verification

**Files:**
- Verify: `index.html`
- Verify: `src/app.js`
- Verify: `src/invitation.js`
- Verify: `styles.css`
- Verify: `tests/invitation.test.js`

- [ ] **Step 1: Run static and automated checks**

Run:

```bash
node --check src/app.js
node --check src/invitation.js
npm test
git diff --check
```

Expected: both syntax checks exit 0, every test passes, and `git diff --check` prints nothing.

- [ ] **Step 2: Run the browser smoke test at 320px**

Verify all of the following on `http://127.0.0.1:4173/`:

```text
Normal mode shows Kim Byung-kwan and the original Korean invitation message.
Developer mode shows Kim Byung-kwan and the branch/commit/conflict/merge copy.
Boot output contains DEBUG and WARNING lines and finishes with wedding-v1.0 deployed ♥.
No comment label, text input, or visitor log is present.
APPROVE ♥ reveals the selected AI approval plus 200 OK — 승인되었습니다. ♥.
Each enabled click launches 42 particles; a later click launches them again.
All five selectors and the active card show local official images with visible labels, and a broken image falls back to the original text symbol.
Document scroll width equals client width, and browser error logs are empty.
```

- [ ] **Step 3: Review final repository state**

Run:

```bash
git status --short --branch
git log -5 --oneline --decorate
```

Expected: only the user's pre-existing untracked directories remain, while the feature commits are present on `codex/invitation-approve-fireworks`.
