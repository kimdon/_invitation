# Editorial Mobile Invitation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the attached `x-dc` invitation into a GitHub Pages-compatible editorial mobile invitation with gallery viewing, account modals, copying, and accessible keyboard controls.

**Architecture:** Keep the existing static-site boundary: semantic markup in `index.html`, all presentation in `styles.css`, DOM-independent calculations in `src/invitation.js`, and browser event wiring in `src/app.js`. No framework, custom runtime, map SDK, or production dependency is added.

**Tech Stack:** HTML5, CSS3, ES modules, Node.js built-in test runner, local static server, in-app browser visual verification.

---

## File map

- Modify `index.html`: replace the visual shell and add accessible account/photo dialogs.
- Modify `styles.css`: replace the current theme with the editorial palette, responsive layout, dialogs, and motion.
- Modify `src/invitation.js`: add pure gallery-page and account-group helpers while preserving date and map helpers.
- Modify `src/app.js`: render the gallery and wire dialogs, copy fallback, keyboard, swipe, fades, and petals.
- Modify `tests/invitation.test.js`: lock the new document structure, data, and pure helper behavior.
- Update `README.md`: describe photo paths and the no-map-SDK behavior.

### Task 1: Lock the editorial document contract

**Files:**
- Modify: `tests/invitation.test.js`
- Modify: `index.html`

- [ ] **Step 1: Write the failing editorial structure test**

Add a test that reads `index.html` and verifies the selected design without depending on incidental whitespace:

```js
test("the page uses the editorial invitation structure", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /class="cover cover--editorial"/);
  assert.match(html, /Byeong-gwan/);
  assert.match(html, /Do-eun/);
  assert.match(html, /class="section section--dark schedule-calendar/);
  assert.match(html, /id="account-dialog"/);
  assert.match(html, /id="photo-viewer"/);
  assert.match(html, /id="copy-toast"/);
  assert.match(html, /서울특별시 강서구 마곡중앙5로 6/);
  assert.doesNotMatch(html, /<x-dc|<sc-if|<sc-for|image-slot|support\.js/);
});
```

In the existing personalized-content test, replace the static six `.account-card` count and static holder assertions with checks for the two `data-account-side` launcher buttons. Replace the old heart-markup assertion with `병관 &amp; 도은의 결혼식이`. Account-holder coverage moves to Task 2's pure-data test.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`

Expected: FAIL because `cover--editorial`, the two dialogs, and the toast do not exist.

- [ ] **Step 3: Replace `index.html` with semantic standard HTML**

Build the document in the approved order. The fixed interactive shells must use these IDs and semantics:

```html
<dialog class="account-dialog" id="account-dialog" aria-labelledby="account-dialog-title">
  <div class="dialog__header">
    <h2 id="account-dialog-title">계좌번호</h2>
    <button id="account-dialog-close" type="button" aria-label="계좌번호 닫기">✕</button>
  </div>
  <div id="account-dialog-list"></div>
</dialog>

<dialog class="photo-viewer" id="photo-viewer" aria-labelledby="photo-viewer-label">
  <p id="photo-viewer-label"></p>
  <button id="photo-viewer-close" type="button" aria-label="사진 닫기">✕</button>
  <div id="photo-viewer-content"></div>
  <button id="photo-viewer-prev" type="button" aria-label="이전 사진">‹</button>
  <button id="photo-viewer-next" type="button" aria-label="다음 사진">›</button>
</dialog>

<p class="copy-toast" id="copy-toast" role="status" aria-live="polite" hidden></p>
```

Keep the existing six account values, wedding data, address, and map anchors. Add `data-account-side="groom"` and `data-account-side="bride"` to the two account launcher buttons.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the document shell**

```bash
git add index.html tests/invitation.test.js
git commit -m "feat: add editorial invitation structure"
```

### Task 2: Add pure gallery and account data helpers

**Files:**
- Modify: `src/invitation.js`
- Modify: `tests/invitation.test.js`

- [ ] **Step 1: Write failing tests for gallery pagination and account groups**

Import `buildGalleryPage` and `getAccountGroup`, then add:

```js
test("buildGalleryPage returns a bounded nine-photo page", () => {
  assert.deepEqual(buildGalleryPage(25, 9, 0), {
    page: 0,
    pageCount: 3,
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  });
  assert.deepEqual(buildGalleryPage(25, 9, 99), {
    page: 2,
    pageCount: 3,
    items: [19, 20, 21, 22, 23, 24, 25],
  });
});

test("getAccountGroup returns the requested three account holders", () => {
  assert.deepEqual(getAccountGroup("groom").map((account) => account.holder), [
    "김병관", "김창희", "김경자",
  ]);
  assert.deepEqual(getAccountGroup("bride").map((account) => account.holder), [
    "김도은", "김천호", "김민주",
  ]);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test`

Expected: FAIL because the two exports do not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Add immutable account data and bounded pagination:

```js
const ACCOUNT_GROUPS = {
  groom: [
    { role: "신랑", bank: "국민은행", number: "000000-01-000001", holder: "김병관" },
    { role: "신랑 아버지", bank: "국민은행", number: "000000-01-000002", holder: "김창희" },
    { role: "신랑 어머니", bank: "국민은행", number: "000000-01-000003", holder: "김경자" },
  ],
  bride: [
    { role: "신부", bank: "신한은행", number: "000000-01-000004", holder: "김도은" },
    { role: "신부 아버지", bank: "신한은행", number: "000000-01-000005", holder: "김천호" },
    { role: "신부 어머니", bank: "신한은행", number: "000000-01-000006", holder: "김민주" },
  ],
};

export function getAccountGroup(side) {
  return (ACCOUNT_GROUPS[side] ?? []).map((account) => ({ ...account }));
}

export function buildGalleryPage(photoCount, perPage, requestedPage) {
  const pageCount = Math.max(1, Math.ceil(photoCount / perPage));
  const page = Math.min(pageCount - 1, Math.max(0, requestedPage));
  const start = page * perPage + 1;
  const end = Math.min(photoCount, start + perPage - 1);
  return {
    page,
    pageCount,
    items: photoCount ? Array.from({ length: end - start + 1 }, (_, index) => start + index) : [],
  };
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the pure model changes**

```bash
git add src/invitation.js tests/invitation.test.js
git commit -m "feat: model invitation gallery and accounts"
```

### Task 3: Implement the editorial theme and responsive layout

**Files:**
- Modify: `styles.css`
- Modify: `tests/invitation.test.js`

- [ ] **Step 1: Write a failing theme contract test**

```js
test("the stylesheet defines the approved editorial theme", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /--paper:\s*#f4efe7/);
  assert.match(css, /--ink:\s*#1c1916/);
  assert.match(css, /--gold:\s*#b39a6e/);
  assert.match(css, /\.schedule-calendar\s*\{/);
  assert.match(css, /\.account-dialog\s*\{/);
  assert.match(css, /\.photo-viewer\s*\{/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
```

In the existing map-source test, replace the old `.gallery-dot` 24x24 assertion with `.gallery-dot` and `.gallery-dot.is-active` selector checks because the approved editorial dots are 6px high and expand horizontally when selected.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test`

Expected: FAIL because the approved tokens and component classes are absent.

- [ ] **Step 3: Replace `styles.css` with the approved class-based theme**

Start from these tokens and constraints:

```css
:root {
  --canvas: #eae4da;
  --paper: #f4efe7;
  --ink: #1c1916;
  --text: #2b2724;
  --muted: #8a7a5c;
  --gold: #b39a6e;
  --gold-strong: #d3b788;
  --line: #d9cfb9;
}

body { margin: 0; background: var(--canvas); }
.invitation { width: min(100%, 430px); margin: 0 auto; overflow: hidden; background: var(--paper); }
.section--dark { color: var(--paper); background: var(--ink); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; }
  .fade-section { opacity: 1; transform: none; }
}
```

Implement all classes referenced by the new HTML. Dialog backdrops must cover the viewport, gallery cells must stay square, and the 375px layout must not overflow horizontally.

- [ ] **Step 4: Run the tests and CSS syntax checks**

Run: `npm test && git diff --check`

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 5: Commit the theme**

```bash
git add styles.css tests/invitation.test.js
git commit -m "feat: style editorial wedding invitation"
```

### Task 4: Wire gallery, viewer, account dialogs, copy, and motion

**Files:**
- Modify: `src/app.js`
- Modify: `tests/invitation.test.js`

- [ ] **Step 1: Write the failing browser-wiring source test**

```js
test("the app wires the approved invitation interactions", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(app, /buildGalleryPage/);
  assert.match(app, /getAccountGroup/);
  assert.match(app, /showModal\(\)/);
  assert.match(app, /navigator\.clipboard\.writeText/);
  assert.match(app, /document\.execCommand\("copy"\)/);
  assert.match(app, /ArrowLeft/);
  assert.match(app, /ArrowRight/);
  assert.match(app, /IntersectionObserver/);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test`

Expected: FAIL because the current app has no dialogs, copy, viewer, or observer wiring.

- [ ] **Step 3: Rebuild `src/app.js` around focused setup functions**

Use these boundaries:

```js
function renderCalendar() {}
function setupGallery() {}
function setupPhotoViewer() {}
function setupAccountDialog() {}
function setupMapLinks() {}
function setupRevealAnimations() {}
function addPetals() {}
```

Set `GALLERY_SIZE` to 25 and `GALLERY_PER_PAGE` to 9 to match the approved attachment. Gallery items first try `images/gallery/NN.webp`; their `error` handler replaces a failed image with a styled text placeholder. Account buttons call `getAccountGroup(side)`, render three `.account-row` elements, and open the native dialog. Copy attempts the Clipboard API and falls back to a temporary textarea plus `document.execCommand("copy")`. Viewer controls update the current index, label, image/placeholder content, and support arrow keys and horizontal touch gestures. Both dialogs close from their close button, the native `Escape` behavior, and a click on the dialog backdrop; account dialog close restores background scrolling.

- [ ] **Step 4: Run tests and JavaScript syntax validation**

Run: `npm test && node --check src/app.js && git diff --check`

Expected: all tests PASS with no syntax or whitespace errors.

- [ ] **Step 5: Commit interaction wiring**

```bash
git add src/app.js tests/invitation.test.js
git commit -m "feat: add invitation dialogs and gallery viewer"
```

### Task 5: Document assets and perform visual verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update asset and local-run documentation**

Document these exact optional paths and behavior:

```markdown
## 사진 파일

- 대표 사진: `images/cover.webp`
- 갤러리: `images/gallery/01.webp`부터 순서대로
- 사진이 없으면 화면에는 깨진 이미지 대신 자리표시자가 표시됩니다.
```

Keep the map section explicit that no SDK/API key is loaded.

- [ ] **Step 2: Run the full automated verification**

Run: `npm test && node --check src/app.js && git diff --check`

Expected: all tests PASS, JavaScript parses, and the diff has no whitespace errors.

- [ ] **Step 3: Start the local static server**

Run: `python3 -m http.server 4173`

Expected: `Serving HTTP on ... port 4173` and `http://127.0.0.1:4173/` returns the invitation.

- [ ] **Step 4: Verify the 375x844 and 430px layouts in the browser**

At each width, confirm:

- document width equals viewport width with no horizontal overflow;
- cover, Invitation, dark schedule/calendar, Gallery, Location, dark Thanks to, and footer appear in order;
- gallery next/previous and dot navigation update the page label;
- a gallery tile opens the viewer and close/arrow controls work;
- each account-side button opens exactly three matching accounts;
- copy produces `계좌번호가 복사되었습니다.`;
- map URLs contain only encoded `보타닉 웨딩파크`;
- the browser console has no errors.

- [ ] **Step 5: Commit documentation and any visual corrections**

```bash
git add README.md index.html styles.css src/app.js src/invitation.js tests/invitation.test.js
git commit -m "docs: explain invitation photo assets"
```

- [ ] **Step 6: Confirm final repository scope**

Run: `git status -sb`

Expected: no tracked changes remain. `.idea/` and the previously generated untracked QR asset remain outside this feature unless the user separately requests them.
