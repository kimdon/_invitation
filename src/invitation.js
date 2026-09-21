const DAY_MS = 86_400_000;

export const GALLERY_PHOTOS = Object.freeze([
  "./images/gallery/IMG_1239.JPG",
  "./images/gallery/IMG_6924.JPG",
  "./images/gallery/IMG_6963.JPG",
  "./images/gallery/IMG_6964.JPG",
  "./images/gallery/IMG_6965.JPG",
  "./images/gallery/IMG_6966.JPG",
  "./images/gallery/IMG_6968.JPG",
  "./images/gallery/IMG_6973.JPG",
  "./images/gallery/IMG_6977.JPG",
  "./images/gallery/IMG_6978.JPG",
  "./images/gallery/IMG_6979.JPG",
  "./images/gallery/IMG_6980.JPG",
  "./images/gallery/IMG_6981.JPG",
  "./images/gallery/IMG_6983.JPG",
  "./images/gallery/IMG_9159.JPG",
  "./images/gallery/IMG_9239.JPG",
  "./images/gallery/IMG_9337.JPG",
]);

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

export const DEVELOPER_TRANSITION_COMMANDS = Object.freeze([
  "git fetch origin",
  "git pull --ff-only",
  "git switch develop",
]);

export const WEDDING_RELEASE = "wedding-v1.0";

export const FIREWORK_BURST_PLAN = Object.freeze([
  Object.freeze({ x: 0.18, y: 0.26, delay: 0 }),
  Object.freeze({ x: 0.82, y: 0.22, delay: 260 }),
  Object.freeze({ x: 0.5, y: 0.46, delay: 520 }),
  Object.freeze({ x: 0.2, y: 0.72, delay: 780 }),
  Object.freeze({ x: 0.8, y: 0.66, delay: 1040 }),
  Object.freeze({ x: 0.52, y: 0.82, delay: 1300 }),
]);

export const AI_GUEST_MESSAGES = Object.freeze([
  Object.freeze({
    icon: ">_",
    iconSrc: "./images/ai-icons/codex.png",
    name: "Codex",
    handle: "@codex",
    accent: "#58a6ff",
    request: "[CODE REVIEW] wedding-v1.0의 핵심 로직을 점검했습니다. 서로를 먼저 생각하는 기본값과 평생 지원 범위가 잘 선언됐네요.",
    approved: "APPROVED — 예외 상황에도 대화로 복구하는 로직이 탄탄합니다. 두 분, 행복 배포 진행하세요!",
  }),
  Object.freeze({
    icon: "C:",
    iconSrc: "./images/ai-icons/claude.png",
    name: "Claude",
    handle: "@claude",
    accent: "#f2a65a",
    request: "[REVIEW] wedding-v1.0은 배려를 공통 인터페이스로 사용하네요. 서로 다른 취향도 안전하게 호환됩니다.",
    approved: "APPROVED — 따뜻함 테스트를 모두 통과했습니다. 오래오래 다정한 운영 부탁드려요!",
  }),
  Object.freeze({
    icon: "▮_",
    iconSrc: "./images/ai-icons/cursor.svg",
    name: "Cursor",
    handle: "@cursor",
    accent: "#d2a8ff",
    request: "[DIFF REVIEW] wedding-v1.0에서 두 사람의 일상이 자연스럽게 연결됩니다. 작은 버그도 함께 고칠 준비가 되어 있군요.",
    approved: "APPROVED — 공동 편집 권한이 평생으로 설정됐습니다. 멋진 다음 줄을 이어가세요!",
  }),
  Object.freeze({
    icon: "K*",
    iconSrc: "./images/ai-icons/kimi.svg",
    name: "Kimi",
    handle: "@kimi",
    accent: "#7ee787",
    request: "[CONTEXT REVIEW] wedding-v1.0의 긴 대화 기록을 살펴보니 신뢰 데이터가 충분합니다. 추억 저장 공간도 넉넉하네요.",
    approved: "APPROVED — 긴 여정에서도 컨텍스트 유실 걱정이 없습니다. 행복을 계속 쌓아 주세요!",
  }),
  Object.freeze({
    icon: "✦",
    iconSrc: "./images/ai-icons/gemini.png",
    name: "Gemini",
    handle: "@gemini",
    accent: "#ff7b9c",
    request: "[MULTIMODAL REVIEW] wedding-v1.0에 웃음, 눈빛, 약속이 모두 정상 입력됐습니다. 미래 호환성도 아주 좋습니다.",
    approved: "APPROVED — 두 마음의 동기화가 완료됐습니다. 사랑 가득한 정식 릴리스를 축하합니다!",
  }),
]);

const DEVELOPER_SEQUENCE = Object.freeze([
  Object.freeze({ level: "DEPLOY", logger: WEDDING_RELEASE, message: "wedding-v1.0 배포를 시작합니다." }),
  Object.freeze({ level: "INFO", logger: "GroomProfile", message: "김병관 loaded" }),
  Object.freeze({ level: "INFO", logger: "BrideProfile", message: "김도은 loaded" }),
  Object.freeze({ level: "DEBUG", logger: "DateTest", message: "수많은 대화와 데이트 테스트를 통과했습니다." }),
  Object.freeze({ level: "INFO", logger: "PromiseContext", message: "Two hearts connected" }),
  Object.freeze({ level: "WARN", logger: "RuntimePolicy", message: "이제 단독 실행은 권장하지 않습니다." }),
  Object.freeze({ level: "INFO", logger: "WeddingSchedule", message: "2026-11-21 13:50" }),
  Object.freeze({ level: "INFO", logger: "VenueService", message: "보타닉 웨딩파크" }),
  Object.freeze({ level: "SUCCESS", logger: WEDDING_RELEASE, message: "wedding-v1.0 deployed ♥" }),
]);

export function buildDeveloperSequence() {
  return DEVELOPER_SEQUENCE.map((entry) => ({ ...entry }));
}

export function buildCalendarWeeks(year, monthIndex, weddingDate) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const date = index - firstWeekday + 1;
    const isCurrentMonth = date >= 1 && date <= daysInMonth;

    return {
      date: isCurrentMonth ? date : null,
      isCurrentMonth,
      isWeddingDay: isCurrentMonth && date === weddingDate,
      weekday: index % 7,
    };
  });

  return Array.from({ length: cellCount / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

function toUtcDate(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDdayDisplay(today, weddingDate) {
  const difference = Math.round((toUtcDate(weddingDate) - toUtcDate(today)) / DAY_MS);

  if (difference > 0) {
    return { label: `D-${difference}일`, suffix: "남았습니다" };
  }
  if (difference === 0) {
    return { label: "D-day", suffix: "입니다" };
  }
  return { label: "", suffix: "지났습니다" };
}

export function buildExternalMapLinks(venue) {
  const query = encodeURIComponent(venue);

  return {
    kakao: `https://map.kakao.com/link/search/${query}`,
    naver: `https://map.naver.com/p/search/${query}`,
    tmap: `https://www.tmap.co.kr/tmap2/mobile/search.jsp?name=${query}`,
  };
}

export function buildMobileMapLinks(venue, { userAgent = "", maxTouchPoints = 0, pageUrl }) {
  const android = /Android/i.test(userAgent);
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  if (!android && !ios) return null;

  const query = encodeURIComponent(venue);
  const web = buildExternalMapLinks(venue);
  const links = {
    kakao: {
      app: `kakaomap://search?q=${query}`,
      fallback: web.kakao,
      fallbackLabel: "카카오 웹 지도에서 검색",
    },
    naver: {
      app: `nmap://search?query=${query}&appname=${encodeURIComponent(pageUrl)}`,
      fallback: web.naver,
      fallbackLabel: "네이버 웹 지도에서 검색",
    },
    tmap: {
      // TMAP's official search bridge uses different search parameters on iOS.
      app: android ? `tmap://search?name=${query}` : `tmap://?search=${query}`,
      fallback: android ? "https://play.google.com/store/apps/details?id=com.skt.tmap.ku" : "https://apps.apple.com/kr/app/id431589174",
      fallbackLabel: android ? "Google Play에서 TMAP 설치" : "App Store에서 TMAP 설치",
    },
  };
  if (android) {
    const packages = { kakao: "net.daum.android.map", naver: "com.nhn.android.nmap" };
    for (const [provider, link] of Object.entries(links)) {
      const [scheme, path] = link.app.split("://");
      // Do not pin TMAP to one package: carrier editions share the tmap scheme.
      const packagePart = packages[provider] ? `package=${packages[provider]};` : "";
      link.app = `intent://${path}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;${packagePart}S.browser_fallback_url=${encodeURIComponent(link.fallback)};end`;
    }
  }
  return links;
}

export function getGallerySources(number) {
  const filename = GALLERY_PHOTOS[number - 1].split("/").pop().replace(/\.[^.]+$/, ".webp");
  return {
    thumbnail: `./images/gallery/optimized/thumbnails/${filename}`,
    full: `./images/gallery/optimized/full/${filename}`,
  };
}

export function buildGalleryPage(photoCount, perPage, requestedPage) {
  const pageCount = Math.max(1, Math.ceil(photoCount / perPage));
  const page = Math.min(pageCount - 1, Math.max(0, requestedPage));
  const start = page * perPage + 1;
  const end = Math.min(photoCount, start + perPage - 1);

  return {
    page,
    pageCount,
    items: photoCount
      ? Array.from({ length: end - start + 1 }, (_, index) => start + index)
      : [],
  };
}

export function getAccountGroup(side) {
  return (ACCOUNT_GROUPS[side] ?? []).map((account) => ({ ...account }));
}
