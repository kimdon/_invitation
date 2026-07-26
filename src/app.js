import {
  buildCalendarWeeks,
  buildExternalMapLinks,
  getDdayDisplay,
} from "./invitation.js";

const GALLERY_SIZE = 50;
const GALLERY_PER_PAGE = 9;
const WEDDING_DATE = new Date(2026, 10, 21, 12);

function createPhotoPlaceholder(label) {
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", `${label} 자리표시자`);
  placeholder.innerHTML = `
    <span class="photo-icon" aria-hidden="true"></span>
    <strong>${label}</strong>
    <small>or browse files</small>
  `;
  return placeholder;
}

function renderCalendar() {
  const body = document.getElementById("calendar-body");
  const weeks = buildCalendarWeeks(2026, 10, 21);

  weeks.forEach((week) => {
    const row = document.createElement("tr");
    week.forEach((day) => {
      const cell = document.createElement("td");
      if (day.weekday === 0) cell.classList.add("sunday");
      if (day.isWeddingDay) {
        const marker = document.createElement("span");
        marker.className = "calendar__wedding-day";
        marker.textContent = day.date;
        marker.setAttribute("aria-label", "예식일 21일");
        cell.appendChild(marker);
      } else if (day.isCurrentMonth) {
        cell.textContent = day.date;
      }
      row.appendChild(cell);
    });
    body.appendChild(row);
  });

  const dday = getDdayDisplay(new Date(), WEDDING_DATE);
  document.getElementById("dday").textContent = dday.label;
  document.getElementById("dday-suffix").textContent = dday.suffix;
}

function setupGallery() {
  const grid = document.getElementById("gallery-grid");
  const dots = document.getElementById("gallery-dots");
  const pageLabel = document.getElementById("gallery-page");
  const previous = document.getElementById("gallery-prev");
  const next = document.getElementById("gallery-next");
  const pageCount = Math.ceil(GALLERY_SIZE / GALLERY_PER_PAGE);
  let page = 0;

  function render() {
    grid.replaceChildren();
    dots.replaceChildren();

    const first = page * GALLERY_PER_PAGE + 1;
    const last = Math.min(first + GALLERY_PER_PAGE - 1, GALLERY_SIZE);
    for (let number = first; number <= last; number += 1) {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.appendChild(createPhotoPlaceholder(`사진 ${number}`));
      grid.appendChild(item);
    }

    for (let index = 0; index < pageCount; index += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `gallery-dot${index === page ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `갤러리 ${index + 1}페이지`);
      dot.setAttribute("aria-current", index === page ? "page" : "false");
      dot.addEventListener("click", () => {
        page = index;
        render();
      });
      dots.appendChild(dot);
    }

    previous.disabled = page === 0;
    next.disabled = page === pageCount - 1;
    pageLabel.textContent = `${page + 1} / ${pageCount}`;
  }

  previous.addEventListener("click", () => {
    page = Math.max(0, page - 1);
    render();
  });
  next.addEventListener("click", () => {
    page = Math.min(pageCount - 1, page + 1);
    render();
  });

  render();
}

function setupMapLinks() {
  const links = buildExternalMapLinks("보타닉 웨딩파크");
  document.getElementById("kakao-link").href = links.kakao;
  document.getElementById("naver-link").href = links.naver;
}

function addPetals() {
  const layer = document.getElementById("petal-layer");
  for (let index = 0; index < 12; index += 1) {
    const petal = document.createElement("span");
    const size = 7 + Math.random() * 7;
    petal.className = "petal";
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;
    petal.style.animationDuration = `${9 + Math.random() * 7}s`;
    petal.style.animationDelay = `${Math.random() * 8}s`;
    layer.appendChild(petal);
  }
}

renderCalendar();
setupGallery();
setupMapLinks();
addPetals();
