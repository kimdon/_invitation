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
