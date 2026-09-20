import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import {
  AI_GUEST_MESSAGES,
  DEVELOPER_TRANSITION_COMMANDS,
  WEDDING_RELEASE,
  buildDeveloperSequence,
  buildCalendarWeeks,
  buildExternalMapLinks,
  getDdayDisplay,
} from "../src/invitation.js";

const EXPECTED_AI_ICON_PATHS = [
  "./images/ai-icons/codex.png",
  "./images/ai-icons/claude.png",
  "./images/ai-icons/cursor.svg",
  "./images/ai-icons/kimi.svg",
  "./images/ai-icons/gemini.png",
];

test("buildCalendarWeeks returns every day in November 2026", () => {
  const weeks = buildCalendarWeeks(2026, 10, 21);
  const monthDays = weeks
    .flat()
    .filter((day) => day.isCurrentMonth)
    .map((day) => day.date);

  assert.equal(weeks.length, 5);
  assert.deepEqual(monthDays, Array.from({ length: 30 }, (_, index) => index + 1));
});

test("buildCalendarWeeks marks November 21 as the wedding day", () => {
  const weddingDay = buildCalendarWeeks(2026, 10, 21)
    .flat()
    .find((day) => day.date === 21 && day.isCurrentMonth);

  assert.equal(weddingDay.isWeddingDay, true);
  assert.equal(weddingDay.weekday, 6);
});

test("getDdayDisplay returns complete future, today, and past sentence parts", () => {
  const wedding = new Date(2026, 10, 21, 12);

  assert.deepEqual(
    getDdayDisplay(new Date(2026, 10, 20, 12), wedding),
    { label: "D-1일", suffix: "남았습니다" },
  );
  assert.deepEqual(
    getDdayDisplay(new Date(2026, 10, 21, 8), wedding),
    { label: "D-day", suffix: "입니다" },
  );
  assert.deepEqual(
    getDdayDisplay(new Date(2026, 10, 22, 12), wedding),
    { label: "", suffix: "지났습니다" },
  );
});

test("buildExternalMapLinks creates Kakao and Naver searches for the venue only", () => {
  const links = buildExternalMapLinks("보타닉 웨딩파크");

  assert.equal(
    links.kakao,
    "https://map.kakao.com/link/search/%EB%B3%B4%ED%83%80%EB%8B%89%20%EC%9B%A8%EB%94%A9%ED%8C%8C%ED%81%AC",
  );
  assert.equal(
    links.naver,
    "https://map.naver.com/p/search/%EB%B3%B4%ED%83%80%EB%8B%89%20%EC%9B%A8%EB%94%A9%ED%8C%8C%ED%81%AC",
  );
});

test("buildGalleryPage returns a bounded nine-photo page", async () => {
  const { buildGalleryPage } = await import("../src/invitation.js");
  assert.equal(typeof buildGalleryPage, "function");
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

test("getAccountGroup returns the requested three account holders", async () => {
  const { getAccountGroup } = await import("../src/invitation.js");
  assert.equal(typeof getAccountGroup, "function");
  assert.deepEqual(getAccountGroup("groom").map((account) => account.holder), [
    "김병관", "김창희", "김경자",
  ]);
  assert.deepEqual(getAccountGroup("bride").map((account) => account.holder), [
    "김도은", "김천호", "김민주",
  ]);
});

test("the page exposes map buttons without loading map SDKs", async () => {
  const [html, app, logic, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/invitation.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  const source = `${html}\n${app}\n${logic}`;

  assert.match(html, /id="kakao-link"/);
  assert.match(html, /id="naver-link"/);
  assert.match(app, /buildExternalMapLinks\("보타닉 웨딩파크"\)/);
  assert.doesNotMatch(source, /%20%EC%98%A4%ED%82%A4%EB%93%9C%ED%99%80/);
  assert.doesNotMatch(source, /dapi\.kakao\.com/);
  assert.doesNotMatch(source, /oapi\.map\.naver\.com/);
  assert.doesNotMatch(source, /kakaoJavaScriptKey|naverNcpKeyId|loadScript/);
  assert.match(css, /\.gallery-dot\s*\{/);
  assert.match(css, /\.gallery-dot\.is-active\s*\{/);
});

test("the page uses the requested bride and groom names everywhere", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /김병관 <span>·<\/span> 김도은/);
  assert.match(html, /병관 &amp; 도은의 결혼식이/);
  assert.match(html, /김창희 · 김경자 <span>의 아들<\/span> <strong>김병관<\/strong>/);
  assert.match(html, /김천호 · 김민주 <span>의 딸<\/span> <strong>김도은<\/strong>/);
  assert.match(html, /2026년 11월 21일 토요일 오후 1시 50분/);
  assert.match(html, /서울 강서구 보타닉 웨딩파크/);
  assert.match(html, /서울특별시 강서구 마곡중앙5로 6/);
  assert.match(html, /data-account-side="groom"/);
  assert.match(html, /data-account-side="bride"/);
  assert.doesNotMatch(html, /홍길동|김가나|길동|가나/);
  assert.doesNotMatch(html, /홍판서|춘섬|김진사|이씨|보타닉웨딩홀|오키드홀/);
});

test("the page uses the editorial invitation structure", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /class="cover cover--editorial"/);
  assert.match(html, /Kim Byung-kwan/);
  assert.match(html, /Do-eun/);
  assert.match(html, /class="section section--dark schedule-calendar/);
  assert.match(html, /id="account-dialog"/);
  assert.match(html, /id="photo-viewer"/);
  assert.match(html, /id="copy-toast"/);
  assert.match(html, /서울특별시 강서구 마곡중앙5로 6/);
  assert.doesNotMatch(html, /<x-dc|<sc-if|<sc-for|image-slot|support\.js/);
});

test("the stylesheet defines the approved editorial theme", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(css, /--paper:\s*#f4efe7/);
  assert.match(css, /--ink:\s*#1c1916/);
  assert.match(css, /--gold:\s*#b39a6e/);
  assert.match(css, /font-family:\s*Gulim,\s*"굴림",\s*sans-serif/);
  assert.doesNotMatch(css, /Noto Serif KR|Cormorant Garamond/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(css, /\.schedule-calendar\s*\{/);
  assert.match(css, /\.account-dialog\s*\{/);
  assert.match(css, /\.photo-viewer\s*\{/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

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
  assert.match(app, /getBoundingClientRect\(\)/);
  assert.match(app, /addEventListener\("scroll"/);
});

test("buildDeveloperSequence returns the approved branch transition and wedding release", () => {
  assert.deepEqual(DEVELOPER_TRANSITION_COMMANDS, [
    "git fetch origin",
    "git pull --ff-only",
    "git switch develop",
  ]);
  assert.equal(WEDDING_RELEASE, "wedding-v1.0");

  const sequence = buildDeveloperSequence();
  const source = JSON.stringify(sequence);
  const levels = sequence.map((entry) => entry.level);

  assert.match(source, /wedding-v1\.0/);
  assert.match(source, /김병관/);
  assert.match(source, /김도은/);
  assert.match(source, /2026-11-21 13:50/);
  assert.match(source, /보타닉 웨딩파크/);
  assert.ok(levels.includes("DEBUG"));
  assert.ok(levels.includes("WARNING"));
  assert.match(source, /BranchHistory/);
  assert.match(source, /ConflictResolver/);
  assert.doesNotMatch(source, /forever-v1\.0|새로운 인생 버전/);
});

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

test("AI guest messages contain exactly the five approved agents and complete card metadata", () => {
  assert.deepEqual(AI_GUEST_MESSAGES.map((agent) => agent.name), [
    "Codex",
    "Claude",
    "Cursor",
    "Kimi · 키미",
    "Gemini · 제미나이",
  ]);
  assert.equal(new Set(AI_GUEST_MESSAGES.map((agent) => agent.accent)).size, 5);
  assert.deepEqual(AI_GUEST_MESSAGES.map((agent) => agent.iconSrc), EXPECTED_AI_ICON_PATHS);

  for (const agent of AI_GUEST_MESSAGES) {
    assert.deepEqual(Object.keys(agent).sort(), [
      "accent",
      "approved",
      "handle",
      "icon",
      "iconSrc",
      "name",
      "request",
    ]);
    assert.ok(agent.icon, "text fallback is required");
    assert.match(agent.iconSrc, /^\.\/images\/ai-icons\//);
    assert.match(agent.handle, /^@/);
    assert.match(agent.approved, /^APPROVED/);
  }

  const source = JSON.stringify(AI_GUEST_MESSAGES);
  const forbiddenApproval = ["LG", "TM"].join("");
  assert.equal(source.includes(forbiddenApproval), false);
  assert.doesNotMatch(source, /Grok|ChatGPT|WeddingBot/);
  assert.equal(new Set(AI_GUEST_MESSAGES.map((agent) => agent.request)).size, 5);
  assert.equal(new Set(AI_GUEST_MESSAGES.map((agent) => agent.approved)).size, 5);
});

test("local AI icons connect selectors and the active card with accessible fallbacks", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  for (const iconPath of EXPECTED_AI_ICON_PATHS) {
    const assetUrl = new URL(`../${iconPath.replace("./", "")}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, `${iconPath} should exist locally`);
  }

  assert.match(app, /function createAgentIconVisual\(/);
  assert.match(app, /image\.src = agent\.iconSrc/);
  assert.match(app, /image\.alt = ""/);
  assert.match(app, /image\.addEventListener\("error"/);
  assert.match(app, /agent-selector__name/);
  assert.match(css, /object-fit:\s*contain/);
});

test("the page exposes one shared invitation DOM with accessible developer controls", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  const source = `${html}\n${app}\n${css}`;

  assert.match(html, /<main class="invitation" data-mode="normal">/);
  assert.match(html, /id="developer-toggle"[^>]+aria-pressed="false"/);
  assert.match(html, /id="developer-transition"[^>]+hidden/);
  assert.match(html, /id="developer-console-log"[^>]+role="log"[^>]+aria-live="polite"/);
  assert.match(html, /id="ai-agent-selector"/);
  assert.doesNotMatch(html, /id="visitor-message"/);
  assert.doesNotMatch(html, /id="developer-rsvp-log"/);
  assert.doesNotMatch(html, /id="developer-congratulations-form"/);
  assert.match(html, /id="developer-congratulations" type="button">APPROVE ♥<\/button>/);

  for (const section of ["cover", "invitation", "schedule", "gallery", "location", "accounts", "thanks"]) {
    assert.match(html, new RegExp(`data-developer-section="${section}"`));
  }
  assert.equal((html.match(/data-developer-section=/g) ?? []).length, 7);

  assert.match(app, /function setupDeveloperMode\(/);
  assert.match(app, /AI_GUEST_MESSAGES/);
  assert.match(app, /DEVELOPER_TRANSITION_COMMANDS/);
  assert.match(app, /window\.scrollTo\(/);
  assert.match(app, /setInterval\([^,]+,\s*3_500\)/s);
  assert.doesNotMatch(app, /messageInput|rsvpLog|VISITOR/);
  assert.match(app, /submit\.addEventListener\("click"/);
  assert.match(app, /200 OK — 승인되었습니다\. ♥/);
  assert.match(app, /index < 42/);
  assert.match(css, /\.invitation\[data-mode="developer"\]/);
  assert.match(css, /\.developer-rsvp/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  const forbiddenApproval = ["LG", "TM"].join("");
  assert.equal(source.includes(forbiddenApproval), false);
  assert.doesNotMatch(source, /Grok|ChatGPT|WeddingBot|forever-v1\.0|새로운 인생 버전/);
});
