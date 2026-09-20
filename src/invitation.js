const DAY_MS = 86_400_000;

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

export const AI_GUEST_MESSAGES = Object.freeze([
  Object.freeze({
    icon: ">_",
    name: "Codex",
    handle: "@codex",
    accent: "#58a6ff",
    request: "두 사람의 새 출발을 검토하고 승인해 주세요.",
    approved: "APPROVED — 함께할 미래가 안정적으로 통합되었습니다.",
  }),
  Object.freeze({
    icon: "C:",
    name: "Claude",
    handle: "@claude",
    accent: "#f2a65a",
    request: "두 사람의 약속이 따뜻하게 배포되도록 승인해 주세요.",
    approved: "APPROVED — 배려와 신뢰가 프로덕션에 반영되었습니다.",
  }),
  Object.freeze({
    icon: "▮_",
    name: "Cursor",
    handle: "@cursor",
    accent: "#d2a8ff",
    request: "wedding-v1.0의 다음 줄을 함께 완성해 주세요.",
    approved: "APPROVED — 두 사람의 공동 작업공간이 열렸습니다.",
  }),
  Object.freeze({
    icon: "K*",
    name: "Kimi · 키미",
    handle: "@kimi",
    accent: "#7ee787",
    request: "긴 여정의 컨텍스트를 함께 읽고 승인해 주세요.",
    approved: "APPROVED — 평생의 컨텍스트가 안전하게 확장되었습니다.",
  }),
  Object.freeze({
    icon: "✦",
    name: "Gemini · 제미나이",
    handle: "@gemini",
    accent: "#ff7b9c",
    request: "두 개의 마음이 하나의 릴리스가 되도록 승인해 주세요.",
    approved: "APPROVED — wedding-v1.0이 밝게 릴리스되었습니다.",
  }),
]);

const DEVELOPER_SEQUENCE = Object.freeze([
  Object.freeze({ level: "DEPLOY", logger: WEDDING_RELEASE, message: "wedding-v1.0 배포를 시작합니다." }),
  Object.freeze({ level: "INFO", logger: "GroomProfile", message: "김병관 loaded" }),
  Object.freeze({ level: "INFO", logger: "BrideProfile", message: "김도은 loaded" }),
  Object.freeze({ level: "DEBUG", logger: "BranchHistory", message: "commit history synchronized" }),
  Object.freeze({ level: "INFO", logger: "PromiseContext", message: "Two hearts connected" }),
  Object.freeze({ level: "WARNING", logger: "ConflictResolver", message: "minor conflicts resolved with trust" }),
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
