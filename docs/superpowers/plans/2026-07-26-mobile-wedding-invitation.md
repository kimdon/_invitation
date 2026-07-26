# Mobile Wedding Invitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static 430px mobile wedding invitation matching the supplied PDF with Kakao and Naver search buttons.

**Architecture:** `index.html` owns semantic content, `styles.css` owns the PDF-matched visual system, and browser modules under `src/` own calendar, gallery, D-day, and map behavior. Pure functions in `src/invitation.js` are covered with Node's built-in test runner before browser wiring is added.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Node.js built-in test runner, Python static server, browser screenshot validation.

---

### Task 1: Add behavior contracts

**Files:**
- Create: `/Users/kimbyung-gwan/etc/결혼/_invitation/package.json`
- Create: `/Users/kimbyung-gwan/etc/결혼/_invitation/tests/invitation.test.js`
- Create: `/Users/kimbyung-gwan/etc/결혼/_invitation/src/invitation.js`

- [x] **Step 1: Write failing tests**

Test that November 2026 returns complete weeks containing dates 1 through 30, that November 21 is marked as the wedding day, that D-day text handles future/today/past dates, that both map search URLs are generated, and that no map SDK is loaded.

- [x] **Step 2: Run tests to verify RED**

Run: `npm test`

Expected: FAIL because `/src/invitation.js` does not exist.

- [x] **Step 3: Implement the pure functions**

Implement `buildCalendarWeeks`, `getDdayText`, and `buildExternalMapLinks` without browser globals.

- [x] **Step 4: Run tests to verify GREEN**

Run: `npm test`

Expected: all tests pass.

### Task 2: Build the PDF-matched document

**Files:**
- Create: `/Users/kimbyung-gwan/etc/결혼/_invitation/index.html`
- Create: `/Users/kimbyung-gwan/etc/결혼/_invitation/styles.css`
- Create: `/Users/kimbyung-gwan/etc/결혼/_invitation/src/app.js`

- [x] **Step 1: Create semantic HTML**

Add cover, invitation, schedule, full calendar, gallery, location, thanks, and footer sections with the exact supplied sample copy.

- [x] **Step 2: Reproduce the visual system**

Apply the PDF colors, 430px canvas, arched cover placeholder, typography, dividers, section spacing, calendar card, 3-column gallery, map card, and account cards.

- [x] **Step 3: Wire interactions**

Render all calendar days, D-day, 50 gallery placeholders with six pages, external map links, and decorative petals.

- [x] **Step 4: Re-run automated tests**

Run: `npm test`

Expected: all tests pass.

### Task 3: Document map buttons

**Files:**
- Modify: `/Users/kimbyung-gwan/etc/결혼/_invitation/README.md`

- [x] **Step 1: Add local preview instructions**

Document `python3 -m http.server 4173` and the local URL.

- [x] **Step 2: Add Kakao and Naver button behavior**

Document that both buttons open a venue search in a new tab without API keys and that map SDK integration is outside the current scope.

### Task 4: Verify visual and functional fidelity

**Files:**
- Inspect: `/Users/kimbyung-gwan/etc/결혼/_invitation/index.html`
- Inspect: `/Users/kimbyung-gwan/etc/결혼/_invitation/styles.css`
- Inspect: `/Users/kimbyung-gwan/etc/결혼/모바일 청첩장.pdf`

- [x] **Step 1: Start the static server**

Run: `python3 -m http.server 4173`

Expected: page is reachable at `http://127.0.0.1:4173`.

- [x] **Step 2: Capture a 430px mobile screenshot**

Capture the entire page and compare it to the PDF reference.

- [x] **Step 3: Check interactions**

Verify calendar dates 1-30, gallery next/previous navigation, Kakao link, Naver link, and no browser console errors other than unavailable map credentials.

- [x] **Step 4: Run final verification**

Run: `npm test` and inspect `git diff --check`.

Expected: all tests pass and no whitespace errors are reported.
