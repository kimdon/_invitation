import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildCalendarWeeks,
  buildExternalMapLinks,
  getDdayDisplay,
} from "../src/invitation.js";

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
  assert.match(css, /\.gallery-dot\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/s);
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
  assert.match(html, /Byeong-gwan/);
  assert.match(html, /Do-eun/);
  assert.match(html, /class="section section--dark schedule-calendar/);
  assert.match(html, /id="account-dialog"/);
  assert.match(html, /id="photo-viewer"/);
  assert.match(html, /id="copy-toast"/);
  assert.match(html, /서울특별시 강서구 마곡중앙5로 6/);
  assert.doesNotMatch(html, /<x-dc|<sc-if|<sc-for|image-slot|support\.js/);
});
