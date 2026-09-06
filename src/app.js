import {
  buildCalendarWeeks,
  buildExternalMapLinks,
  buildGalleryPage,
  getAccountGroup,
  getDdayDisplay,
} from "./invitation.js";

const GALLERY_SIZE = 25;
const GALLERY_PER_PAGE = 9;
const WEDDING_DATE = new Date(2026, 10, 21, 12);

function gallerySource(number) {
  return `./images/gallery/${String(number).padStart(2, "0")}.webp`;
}

function createPlaceholder(label, className = "gallery-placeholder") {
  const placeholder = document.createElement("div");
  placeholder.className = className;
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", `${label} 자리표시자`);
  placeholder.textContent = label;
  return placeholder;
}

function loadOptionalImage(source, alt, placeholder, onLoad) {
  const image = document.createElement("img");
  image.alt = alt;
  image.hidden = true;
  image.addEventListener("load", () => {
    placeholder.remove();
    image.hidden = false;
    onLoad?.();
  }, { once: true });
  image.addEventListener("error", () => image.remove(), { once: true });
  image.src = source;
  return image;
}

function renderCoverPhoto() {
  const container = document.getElementById("cover-media");
  const placeholder = container.querySelector(".media-placeholder");
  const image = loadOptionalImage("./images/cover.webp", "김병관과 김도은의 대표 사진", placeholder);
  container.appendChild(image);
}

function renderCalendar() {
  const body = document.getElementById("calendar-body");
  const weeks = buildCalendarWeeks(2026, 10, 21);
  body.replaceChildren();

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

function setupPhotoViewer() {
  const dialog = document.getElementById("photo-viewer");
  const content = document.getElementById("photo-viewer-content");
  const label = document.getElementById("photo-viewer-label");
  const closeButton = document.getElementById("photo-viewer-close");
  const previous = document.getElementById("photo-viewer-prev");
  const next = document.getElementById("photo-viewer-next");
  let current = 1;
  let touchStart = null;

  function render() {
    content.replaceChildren();
    label.textContent = `${current} / ${GALLERY_SIZE}`;
    const empty = document.createElement("p");
    empty.className = "photo-viewer__empty";
    empty.textContent = "이 칸에는 아직 사진이 없습니다";
    const image = loadOptionalImage(gallerySource(current), `사진 ${current}`, empty);
    content.append(empty, image);
  }

  function move(offset) {
    current = ((current - 1 + offset + GALLERY_SIZE) % GALLERY_SIZE) + 1;
    render();
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function show(number) {
    current = number;
    render();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("is-locked");
  }

  closeButton.addEventListener("click", close);
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("close", () => document.body.classList.remove("is-locked"));
  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  });
  content.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  content.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      move(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  return show;
}

function createGalleryItem(number, openViewer) {
  const item = document.createElement("div");
  item.className = "gallery-item";

  const placeholder = createPlaceholder(`사진 ${number}`);
  const image = loadOptionalImage(gallerySource(number), `사진 ${number}`, placeholder);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gallery-open";
  button.setAttribute("aria-label", `사진 ${number} 크게 보기`);
  button.textContent = "⤢";
  button.addEventListener("click", () => openViewer(number));

  item.append(placeholder, image, button);
  return item;
}

function setupGallery(openViewer) {
  const grid = document.getElementById("gallery-grid");
  const dots = document.getElementById("gallery-dots");
  const pageLabel = document.getElementById("gallery-page");
  const previous = document.getElementById("gallery-prev");
  const next = document.getElementById("gallery-next");
  let page = 0;
  let touchStart = null;

  function render() {
    const galleryPage = buildGalleryPage(GALLERY_SIZE, GALLERY_PER_PAGE, page);
    page = galleryPage.page;
    grid.replaceChildren(...galleryPage.items.map((number) => createGalleryItem(number, openViewer)));
    dots.replaceChildren();

    for (let index = 0; index < galleryPage.pageCount; index += 1) {
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
    next.disabled = page === galleryPage.pageCount - 1;
    pageLabel.textContent = `${page + 1} / ${galleryPage.pageCount}`;
  }

  previous.addEventListener("click", () => {
    page -= 1;
    render();
  });
  next.addEventListener("click", () => {
    page += 1;
    render();
  });
  grid.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  grid.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      page += dx < 0 ? 1 : -1;
      render();
    }
  }, { passive: true });

  render();
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyAccountNumber(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      fallbackCopy(text);
      return;
    }
  }
  fallbackCopy(text);
}

function createAccountRow(account, showToast) {
  const row = document.createElement("article");
  row.className = "account-row";

  const role = document.createElement("p");
  role.className = "account-row__role";
  role.textContent = account.role;

  const content = document.createElement("div");
  content.className = "account-row__content";
  const details = document.createElement("div");
  const number = document.createElement("p");
  number.className = "account-row__number";
  number.textContent = `${account.bank} ${account.number}`;
  const holder = document.createElement("p");
  holder.className = "account-row__holder";
  holder.textContent = `예금주 ${account.holder}`;
  details.append(number, holder);

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "account-row__copy";
  copy.textContent = "복사";
  copy.setAttribute("aria-label", `${account.role} 계좌번호 복사`);
  copy.addEventListener("click", async () => {
    await copyAccountNumber(account.number);
    showToast();
  });
  content.append(details, copy);
  row.append(role, content);
  return row;
}

function setupAccountDialog() {
  const dialog = document.getElementById("account-dialog");
  const title = document.getElementById("account-dialog-title");
  const list = document.getElementById("account-dialog-list");
  const closeButton = document.getElementById("account-dialog-close");
  const toast = document.getElementById("copy-toast");
  let toastTimer;

  function showToast() {
    toast.textContent = "계좌번호가 복사되었습니다.";
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 1800);
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function show(side) {
    const accounts = getAccountGroup(side);
    title.textContent = side === "bride" ? "신부측 계좌번호" : "신랑측 계좌번호";
    list.replaceChildren(...accounts.map((account) => createAccountRow(account, showToast)));
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("is-locked");
  }

  document.querySelectorAll("[data-account-side]").forEach((button) => {
    button.addEventListener("click", () => show(button.dataset.accountSide));
  });
  closeButton.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("close", () => document.body.classList.remove("is-locked"));
}

function setupMapLinks() {
  const links = buildExternalMapLinks("보타닉 웨딩파크");
  document.getElementById("kakao-link").href = links.kakao;
  document.getElementById("naver-link").href = links.naver;
}

function setupRevealAnimations() {
  const sections = document.querySelectorAll(".fade-section");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-in"));
    return;
  }

  let observer;
  const revealPassedSections = () => {
    sections.forEach((section) => {
      if (section.classList.contains("is-in")) return;
      if (section.getBoundingClientRect().top >= window.innerHeight * 1.05) return;
      section.classList.add("is-in");
      observer?.unobserve(section);
    });
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
  sections.forEach((section) => observer.observe(section));
  revealPassedSections();
  window.addEventListener("scroll", revealPassedSections, { passive: true });
}

function addPetals() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.getElementById("petal-layer");
  const count = window.innerWidth < 480 ? 7 : 11;
  for (let index = 0; index < count; index += 1) {
    const petal = document.createElement("span");
    const size = 7 + Math.random() * 6;
    petal.className = "petal";
    petal.style.left = `${Math.random() * 95}%`;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 0.82}px`;
    petal.style.animationDuration = `${11 + Math.random() * 8}s, ${3 + Math.random() * 3}s`;
    petal.style.animationDelay = `${Math.random() * 12}s, 0s`;
    layer.appendChild(petal);
  }
}

renderCoverPhoto();
renderCalendar();
const openViewer = setupPhotoViewer();
setupGallery(openViewer);
setupAccountDialog();
setupMapLinks();
setupRevealAnimations();
addPetals();
