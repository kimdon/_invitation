const DAY_MS = 86_400_000;

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
