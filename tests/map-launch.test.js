import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import * as invitation from "../src/invitation.js";

const venue = "보타닉 웨딩파크";
const pageUrl = "https://kimdon.github.io/_invitation/";
const ios = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", pageUrl };
const android = { userAgent: "Mozilla/5.0 (Linux; Android 15) Chrome/130 Mobile", pageUrl };

test("iOS app searches use the venue and offer same-provider web or App Store fallback", () => {
  const links = invitation.buildMobileMapLinks(venue, ios);
  assert.equal(new URL(links.kakao.app).searchParams.get("q"), venue);
  assert.equal(new URL(links.naver.app).searchParams.get("query"), venue);
  assert.equal(new URL(links.naver.app).searchParams.get("appname"), pageUrl);
  assert.equal(new URL(links.tmap.app).searchParams.get("search"), venue);
  assert.equal(links.tmap.app.startsWith("tmap://?search="), true);
  assert.equal(links.kakao.fallback, invitation.buildExternalMapLinks(venue).kakao);
  assert.equal(links.naver.fallback, invitation.buildExternalMapLinks(venue).naver);
  assert.equal(links.tmap.fallback, "https://apps.apple.com/kr/app/id431589174");
});

test("Android intents preserve search parameters and encode each explicit fallback", () => {
  const links = invitation.buildMobileMapLinks(venue, android);
  for (const provider of ["kakao", "naver", "tmap"]) {
    assert.match(links[provider].app, /^intent:\/\//);
    const fallback = links[provider].app.match(/S\.browser_fallback_url=([^;]+);/)[1];
    assert.equal(decodeURIComponent(fallback), links[provider].fallback);
    assert.match(decodeURIComponent(links[provider].app.split("#Intent;")[0]), /보타닉 웨딩파크/);
  }
  assert.match(links.tmap.app, /^intent:\/\/search\?name=/);
  assert.equal(links.tmap.fallback, "https://play.google.com/store/apps/details?id=com.skt.tmap.ku");
  assert.doesNotMatch(links.tmap.app, /package=/, "accept TMAP's carrier variants via their shared scheme");
});

test("iPad desktop-mode and in-app browser UAs keep platform-specific links; desktop stays on web", () => {
  const ipad = invitation.buildMobileMapLinks(venue, { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", maxTouchPoints: 5, pageUrl });
  assert.match(ipad.tmap.app, /^tmap:\/\/\?search=/);
  for (const suffix of [" KAKAOTALK", " NAVER(inapp; search; 1200)", " [FBAN/FBIOS]"]) {
    assert.equal(invitation.buildMobileMapLinks(venue, { ...ios, userAgent: ios.userAgent + suffix }).tmap.fallback, ipad.tmap.fallback);
  }
  assert.equal(invitation.buildMobileMapLinks(venue, { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", maxTouchPoints: 0, pageUrl }), null);
  assert.equal(invitation.buildMobileMapLinks(venue, { userAgent: "unknown", pageUrl }), null);
});

const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const setup = source.slice(source.indexOf("function setupMapLinks("), source.indexOf("function setupDeveloperMode("));
function fixture(environment = ios) {
  class Element {
    listeners = {};
    hidden = true;
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    dispatch(type, details = {}) { for (const callback of this.listeners[type] ?? []) callback({ type, ...details }); }
  }
  const ids = Object.fromEntries(["kakao-link", "naver-link", "tmap-link", "map-fallback", "map-fallback-message", "map-fallback-link"].map((id) => [id, new Element()]));
  const document = new Element();
  document.getElementById = (id) => ids[id];
  const window = new Element();
  window.location = { href: pageUrl };
  runInNewContext(`${setup}\nsetupMapLinks();`, { ...invitation, document, window, navigator: environment });
  return { ids, document, window };
}

test("mobile launch exposes an explicit fallback, clears it on leaving, and schedules no delayed navigation", () => {
  const { ids, document, window } = fixture();
  assert.match(ids["tmap-link"].href, /^tmap:/);
  assert.equal(ids["tmap-link"].target, "_self");
  ids["tmap-link"].dispatch("click", { button: 0 });
  assert.equal(ids["map-fallback"].hidden, false);
  assert.match(ids["map-fallback-link"].href, /apps\.apple\.com/);
  assert.match(ids["map-fallback-link"].textContent, /App Store/);
  assert.match(ids["map-fallback-message"].textContent, /열리지 않으면/);
  document.hidden = true;
  document.dispatch("visibilitychange");
  document.hidden = false;
  document.dispatch("visibilitychange");
  assert.equal(ids["map-fallback"].hidden, true);
  ids["naver-link"].dispatch("click", { button: 0 });
  assert.match(ids["map-fallback-link"].href, /map\.naver\.com/);
  assert.match(ids["map-fallback-link"].textContent, /네이버 웹 지도/);
  window.dispatch("pagehide");
  assert.equal(ids["map-fallback"].hidden, true);
  assert.doesNotMatch(setup, /setTimeout|setInterval|location\.(assign|replace)|location\.href\s*=/);
});

test("desktop links remain web links and no obsolete TMAP note or describedby remains", async () => {
  const { ids } = fixture({ userAgent: "desktop" });
  for (const provider of ["kakao", "naver", "tmap"]) assert.equal(ids[`${provider}-link`].href, invitation.buildExternalMapLinks(venue)[provider]);
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /tmap-note|TMAP은 모바일 앱으로 연결됩니다/);
});
