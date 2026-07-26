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

test("buildExternalMapLinks creates Kakao and Naver venue searches", () => {
  const links = buildExternalMapLinks("보타닉웨딩홀 오키드홀");

  assert.equal(
    links.kakao,
    "https://map.kakao.com/link/search/%EB%B3%B4%ED%83%80%EB%8B%89%EC%9B%A8%EB%94%A9%ED%99%80%20%EC%98%A4%ED%82%A4%EB%93%9C%ED%99%80",
  );
  assert.equal(
    links.naver,
    "https://map.naver.com/p/search/%EB%B3%B4%ED%83%80%EB%8B%89%EC%9B%A8%EB%94%A9%ED%99%80%20%EC%98%A4%ED%82%A4%EB%93%9C%ED%99%80",
  );
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
  assert.doesNotMatch(source, /dapi\.kakao\.com/);
  assert.doesNotMatch(source, /oapi\.map\.naver\.com/);
  assert.doesNotMatch(source, /kakaoJavaScriptKey|naverNcpKeyId|loadScript/);
  assert.match(css, /\.gallery-dot\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/s);
});
