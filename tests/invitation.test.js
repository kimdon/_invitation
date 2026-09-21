import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  AI_GUEST_MESSAGES,
  DEVELOPER_TRANSITION_COMMANDS,
  GALLERY_PHOTOS,
  WEDDING_RELEASE,
  buildDeveloperSequence,
  buildCalendarWeeks,
  buildExternalMapLinks,
  getDdayDisplay,
  getGallerySources,
} from "../src/invitation.js";

const sharp = createRequire(import.meta.url)("sharp");

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

test("buildExternalMapLinks creates Kakao, Naver and TMAP searches for the venue only", () => {
  const links = buildExternalMapLinks("보타닉 웨딩파크");

  assert.equal(
    links.kakao,
    "https://map.kakao.com/link/search/%EB%B3%B4%ED%83%80%EB%8B%89%20%EC%9B%A8%EB%94%A9%ED%8C%8C%ED%81%AC",
  );
  assert.equal(
    links.naver,
    "https://map.naver.com/p/search/%EB%B3%B4%ED%83%80%EB%8B%89%20%EC%9B%A8%EB%94%A9%ED%8C%8C%ED%81%AC",
  );
  assert.equal(
    links.tmap,
    "https://www.tmap.co.kr/tmap2/mobile/search.jsp?name=%EB%B3%B4%ED%83%80%EB%8B%89%20%EC%9B%A8%EB%94%A9%ED%8C%8C%ED%81%AC",
  );
});

test("map buttons use flat black symbols on white SVG backgrounds before readable labels", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const iconStyle = css.match(/\.map-button__icon\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(iconStyle, /background:\s*#ffffff/);
  assert.doesNotMatch(iconStyle, /filter:/);
  for (const provider of ["kakao", "naver", "tmap"]) {
    const button = html.match(new RegExp(`<a\\b[^>]*id="${provider}-link"[^>]*>([\\s\\S]*?)<\\/a>`))?.[1] ?? "";
    assert.match(button, new RegExp(`<img[^>]*class="map-button__icon"[^>]*src="\\./images/map-icons/${provider}\\.svg"[^>]*alt=""`));
    assert.match(button, /<span class="map-button__label">[^<]+<\/span>/);
    assert.ok(button.indexOf("<img") < button.indexOf("<span"));
    const asset = new URL(`../images/map-icons/${provider}.svg`, import.meta.url);
    const svg = await readFile(asset, "utf8");
    assert.match(svg, /<rect[^>]*fill="#ffffff"/);
    assert.match(svg, /fill="#000000"/);
    assert.doesNotMatch(svg, /gradient|filter|opacity|<image/i);
    assert.deepEqual(new Set([...svg.matchAll(/fill="([^"]+)"/g)].map((match) => match[1])), new Set(["#ffffff", "#000000"]));
    const metadata = await sharp(fileURLToPath(asset)).metadata();
    assert.equal(metadata.format, "svg");
    assert.equal(metadata.width, metadata.height);
    assert.ok(metadata.width >= 44 && metadata.width <= 200);
    assert.ok((await stat(asset)).size < 3_000);
  }
});

test("gallery sources include every optimized photo exactly once", async () => {
  assert.ok(GALLERY_PHOTOS.length > 0);
  assert.equal(new Set(GALLERY_PHOTOS).size, GALLERY_PHOTOS.length);
  for (const [variant, directory] of [["thumbnail", "thumbnails"], ["full", "full"]]) {
    const files = await readdir(new URL(`../images/gallery/optimized/${directory}/`, import.meta.url));
    const paths = files.filter((name) => name.endsWith(".webp"))
      .map((name) => `./images/gallery/optimized/${directory}/${name}`).sort();
    const listed = GALLERY_PHOTOS.map((_, index) => getGallerySources(index + 1)[variant]).sort();
    assert.deepEqual(listed, paths);
  }
});

test("optimized gallery assets preserve photo shape with bounded dimensions and sizes", async () => {
  for (const index of GALLERY_PHOTOS.keys()) {
    const sources = getGallerySources(index + 1);
    const fullUrl = new URL(`../${sources.full}`, import.meta.url);
    const fullMeta = await sharp(fileURLToPath(fullUrl)).metadata();
    const fullRatio = fullMeta.width / fullMeta.height;

    for (const [variant, maxEdge, maxBytes] of [["thumbnail", 480, 200_000], ["full", 1800, 750_000]]) {
      const outputUrl = new URL(`../${sources[variant]}`, import.meta.url);
      const metadata = await sharp(fileURLToPath(outputUrl)).metadata();
      assert.equal(metadata.format, "webp");
      assert.ok(metadata.width > 0 && metadata.height > 0);
      assert.ok(Math.max(metadata.width, metadata.height) <= maxEdge);
      assert.ok(Math.abs(metadata.width / metadata.height - fullRatio) < 0.01);
      assert.equal(metadata.exif, undefined);
      assert.ok((await stat(outputUrl)).size < maxBytes, `${sources[variant]} exceeds its size budget`);
    }
  }
});

test("buildGalleryPage returns three pages without missing-photo slots", async () => {
  const { buildGalleryPage } = await import("../src/invitation.js");
  assert.equal(typeof buildGalleryPage, "function");
  assert.deepEqual(buildGalleryPage(GALLERY_PHOTOS.length, 6, 0), {
    page: 0,
    pageCount: 3,
    items: [1, 2, 3, 4, 5, 6],
  });
  assert.deepEqual(buildGalleryPage(GALLERY_PHOTOS.length, 6, 99), {
    page: 2,
    pageCount: 3,
    items: [13, 14, 15, 16, 17],
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
  assert.match(html, /id="tmap-link"/);
  assert.match(app, /getElementById\("tmap-link"\)\.href = links\.tmap/);
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
  assert.match(css, /\.invitation\[data-mode="normal"\] \.cover\s*\{[^}]*padding:\s*0/s);
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
  assert.match(css, /\.invitation\[data-mode="normal"\] \.section--dark\s*\{[^}]*background:\s*var\(--paper\)/s);
  assert.match(css, /\.invitation\[data-mode="normal"\] \.gallery-item\s*\{[^}]*border:\s*1px solid var\(--ink\)/s);
  assert.match(css, /\.invitation\[data-mode="normal"\] \.calendar__wedding-day\s*\{[^}]*border-radius:\s*50%[^}]*background:\s*var\(--ink\)[^}]*color:\s*var\(--paper\)/s);
  assert.match(css, /\.invitation\[data-mode="normal"\] \.map-button\s*\{[^}]*border-radius:\s*10px/s);
  assert.match(css, /\.invitation\[data-mode="developer"\] \.section\s*\{/);
  assert.match(css, /\.photo-viewer__content\s*\{[^}]*touch-action:\s*none/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("the app wires the approved invitation interactions", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(app, /buildGalleryPage/);
  assert.match(app, /const GALLERY_SIZE = GALLERY_PHOTOS\.length;/);
  assert.match(app, /const GALLERY_PER_PAGE = 6;/);
  assert.match(app, /getAccountGroup/);
  assert.match(app, /showModal\(\)/);
  assert.match(app, /navigator\.clipboard\.writeText/);
  assert.match(app, /document\.execCommand\("copy"\)/);
  assert.match(app, /ArrowLeft/);
  assert.match(app, /ArrowRight/);
  assert.match(app, /IntersectionObserver/);
  assert.match(app, /getBoundingClientRect\(\)/);
  assert.match(app, /addEventListener\("scroll"/);
  assert.match(
    app,
    /appendTransition\("Switched to branch 'develop' ✓", true\);\s*await wait\(1000\);/s,
  );
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
  assert.ok(levels.includes("WARN"));
  assert.match(source, /DateTest/);
  assert.match(source, /수많은 대화와 데이트 테스트를 통과했습니다/);
  assert.match(source, /RuntimePolicy/);
  assert.match(source, /이제 단독 실행은 권장하지 않습니다/);
  assert.doesNotMatch(source, /forever-v1\.0|새로운 인생 버전/);
});

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

test("developer invitation terms use developer-mode-only highlight markup", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  const highlightedTerms = ["branch", "commit", "conflict", "resolve", "main branch", "merge", "approve"];

  for (const term of highlightedTerms) {
    assert.match(html, new RegExp(`<span class="developer-term">${term}</span>`));
  }
  assert.equal((html.match(/class="developer-term"/g) ?? []).length, highlightedTerms.length);
  assert.match(css, /\.invitation\[data-mode="developer"\] \.developer-term\s*\{/);
  assert.doesNotMatch(css, /(^|\n)\.developer-term\s*\{/);
  const termRule = css.match(
    /\.invitation\[data-mode="developer"\] \.developer-term\s*\{([^}]*)\}/,
  )?.[1] ?? "";
  assert.match(termRule, /color:\s*var\(--terminal-blue\)/);
  assert.match(termRule, /font-weight:\s*600/);
  assert.doesNotMatch(termRule, /text-decoration/);
});

test("git switching and wedding boot share one terminal before Invitation is revealed", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    html,
    /<main class="invitation" data-mode="normal" data-boot-state="idle">/,
  );
  assert.match(html, /id="developer-transition-brand"[^>]+hidden/);
  assert.doesNotMatch(html, /id="developer-console-log"/);
  assert.match(app, /invitation\.dataset\.bootState = "booting"/);
  assert.match(app, /invitation\.setAttribute\("aria-busy", "true"\)/);
  assert.match(app, /transitionLines\.appendChild\(line\)/);
  assert.doesNotMatch(app, /const consoleLog =/);
  assert.match(app, /await wait\(1000\)/);
  assert.doesNotMatch(app, /await wait\(600\)/);
  assert.match(app, /transition\.classList\.add\("is-exiting"\)/);
  assert.match(app, /await wait\(450\)/);
  assert.match(app, /invitation\.dataset\.bootState = "ready"/);
  assert.match(app, /invitation\.dataset\.bootState = "idle"/);
  assert.match(css, /\.developer-transition\.is-exiting\s*\{/);
  assert.match(css, /\.invitation\[data-mode="developer"\] \.cover\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@keyframes developer-content-ready/);
});

test("AI guest messages contain exactly the five approved agents and complete card metadata", () => {
  assert.deepEqual(AI_GUEST_MESSAGES.map((agent) => agent.name), [
    "Codex",
    "Claude",
    "Cursor",
    "Kimi",
    "Gemini",
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
    assert.match(agent.request, /wedding-v1\.0|REVIEW|DIFF|코드|로직/);
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
  assert.doesNotMatch(app, /agent-selector__name/);
  assert.doesNotMatch(css, /\.agent-selector__name/);
  assert.match(app, /setAttribute\("aria-label", `\$\{agent\.name\} 승인 완료 리뷰 보기`\)/);
  assert.match(css, /object-fit:\s*contain/);
});

test("AI reviews are approved by default and the user can approve the release once", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /다섯 명의 에이전트가 두 사람의 새로운 배포를 검토하고 승인했습니다\./);
  assert.match(app, /approved\.hidden = false/);
  assert.match(app, /button\.classList\.add\("is-approved"\)/);
  assert.match(app, /let isFinalApproved = false/);
  assert.match(app, /if \(state !== "developer\.ready" \|\| isFinalApproved\) return/);
  assert.match(app, /isFinalApproved = true/);
  assert.match(app, /submit\.textContent = "APPROVED ✓"/);
  assert.match(app, /FINAL APPROVAL COMPLETE — wedding-v1\.0 is ready to merge ♥/);
  assert.match(app, /function resetFinalApproval\(\)/);
  assert.match(css, /\.agent-selector button\.is-approved/);
  assert.match(css, /\.developer-response\.is-complete/);
});

test("approval uses one reusable canvas firework with reduced-motion protection", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<canvas class="developer-particle-layer" id="developer-particle-layer"/);
  assert.match(app, /getContext\("2d"\)/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /cancelAnimationFrame/);
  assert.match(app, /Math\.cos\(angle\)/);
  assert.match(app, /Math\.sin\(angle\)/);
  assert.match(app, /reducedMotion\.matches/);
  assert.match(app, /globalCompositeOperation = "destination-out"/);
  assert.match(app, /FIREWORK_BURST_PLAN/);
  assert.match(app, /pendingBursts\.shift\(\)/);
  assert.match(app, /length: 72/);
  assert.match(app, /4\.5 \+ Math\.random\(\) \* 6/);
  assert.match(app, /1\.8 \+ Math\.random\(\) \* 1\.8/);
  assert.doesNotMatch(app, /particle\.textContent|symbols = \[/);
  assert.doesNotMatch(css, /@keyframes developer-particle/);
});

test("firework plan covers six staggered screen regions", async () => {
  const invitation = await import("../src/invitation.js");
  const plan = invitation.FIREWORK_BURST_PLAN;

  assert.ok(Array.isArray(plan));
  assert.equal(plan.length, 6);
  assert.ok(Math.min(...plan.map((burst) => burst.x)) < 0.25);
  assert.ok(Math.max(...plan.map((burst) => burst.x)) > 0.75);
  assert.ok(Math.min(...plan.map((burst) => burst.y)) < 0.3);
  assert.ok(Math.max(...plan.map((burst) => burst.y)) > 0.7);
  assert.deepEqual(plan.map((burst) => burst.delay), [0, 260, 520, 780, 1040, 1300]);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(plan.every((burst) => Object.isFrozen(burst)), true);
});

test("calendar uses a fixed seven-column layout so the wedding marker cannot widen Saturday", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.calendar\s*\{[^}]*table-layout:\s*fixed/s);
});

test("the page exposes one shared invitation DOM with accessible developer controls", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  const source = `${html}\n${app}\n${css}`;

  assert.match(html, /<main class="invitation" data-mode="normal" data-boot-state="idle">/);
  assert.match(html, /id="developer-toggle"[^>]+aria-pressed="false"/);
  const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
  assert.match(footer, /id="developer-toggle"/);
  assert.match(footer, /develop mode/);
  assert.doesNotMatch(footer, /class="footer__thanks"/);
  assert.doesNotMatch(footer, /footer__monogram|B &amp; D/);
  assert.match(html, /id="developer-transition"[^>]+aria-live="polite"[^>]+hidden/);
  assert.match(html, /id="developer-transition-lines"[^>]+role="log"/);
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
  assert.match(app, /FINAL APPROVAL COMPLETE — wedding-v1\.0 is ready to merge ♥/);
  assert.match(app, /length: 72/);
  assert.match(css, /\.invitation\[data-mode="developer"\]/);
  assert.match(css, /\.mode-toggle\s*\{[^}]*position:\s*relative[^}]*margin:\s*0 auto 32px/s);
  assert.match(css, /\.developer-rsvp/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  const forbiddenApproval = ["LG", "TM"].join("");
  assert.equal(source.includes(forbiddenApproval), false);
  assert.doesNotMatch(source, /Grok|ChatGPT|WeddingBot|forever-v1\.0|새로운 인생 버전/);
});
