import {
  buildCalendarWeeks,
  buildExternalMapLinks,
  getDdayDisplay,
  buildGalleryPage,
  getAccountGroup,
} from "./invitation.js";

const WEDDING_DATE = new Date(2026, 10, 21, 12);
const GALLERY_SIZE = 25;
const GALLERY_PER_PAGE = 9;

const galleryState = { page: 0 };
const viewerState = { index: null };
let renderGallery = () => {};

function createPlaceholder(label) {
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

function setupStaticImageFallbacks() {
  document.querySelectorAll("img[data-placeholder-label]").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const placeholder = createPlaceholder(img.dataset.placeholderLabel);
        if (img.dataset.placeholderRole) {
          placeholder.setAttribute("role", img.dataset.placeholderRole);
        }
        img.replaceWith(placeholder);
      },
      { once: true },
    );
  });
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

function createGalleryItem(number) {
  const item = document.createElement("div");
  item.className = "gallery-item";
  item.dataset.photoIndex = String(number - 1);

  const img = document.createElement("img");
  img.src = `images/gallery/${String(number).padStart(2, "0")}.webp`;
  img.alt = "";
  img.loading = "lazy";
  img.addEventListener(
    "error",
    () => {
      img.replaceWith(createPlaceholder(`사진 ${number}`));
    },
    { once: true },
  );
  item.appendChild(img);

  const expand = document.createElement("button");
  expand.type = "button";
  expand.className = "gallery-item__expand";
  expand.setAttribute("aria-label", "사진 크게 보기");
  expand.textContent = "⤢";
  expand.addEventListener("click", (event) => {
    event.stopPropagation();
    openPhotoViewer(number - 1);
  });
  item.appendChild(expand);

  item.addEventListener("click", () => openPhotoViewer(number - 1));

  return item;
}

function setupGallery() {
  const grid = document.getElementById("gallery-grid");
  const dots = document.getElementById("gallery-dots");
  const pageLabel = document.getElementById("gallery-page");
  const previous = document.getElementById("gallery-prev");
  const next = document.getElementById("gallery-next");

  function render() {
    renderGalleryInner();
  }

  function renderGalleryInner() {
    const { page, pageCount, items } = buildGalleryPage(GALLERY_SIZE, GALLERY_PER_PAGE, galleryState.page);
    galleryState.page = page;

    grid.replaceChildren();
    items.forEach((number) => grid.appendChild(createGalleryItem(number)));

    dots.replaceChildren();
    for (let index = 0; index < pageCount; index += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `gallery-dot${index === page ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `갤러리 ${index + 1}페이지`);
      dot.setAttribute("aria-current", index === page ? "page" : "false");
      dot.addEventListener("click", () => {
        galleryState.page = index;
        render();
      });
      dots.appendChild(dot);
    }

    previous.disabled = page === 0;
    next.disabled = page === pageCount - 1;
    pageLabel.textContent = `${page + 1} / ${pageCount}`;
  }

  previous.addEventListener("click", () => {
    galleryState.page = Math.max(0, galleryState.page - 1);
    render();
  });
  next.addEventListener("click", () => {
    galleryState.page += 1;
    render();
  });

  document.getElementById("gallery-grid").addEventListener("touchstart", trackSwipeStart, { passive: true });
  document.getElementById("gallery-grid").addEventListener(
    "touchend",
    (event) => finishSwipe(event, () => {
      galleryState.page += 1;
      render();
    }, () => {
      galleryState.page = Math.max(0, galleryState.page - 1);
      render();
    }),
    { passive: true },
  );

  renderGallery = render;
  render();
}

let swipeStartX = null;
let swipeStartY = null;

function trackSwipeStart(event) {
  const touch = event.changedTouches[0];
  swipeStartX = touch.clientX;
  swipeStartY = touch.clientY;
}

function finishSwipe(event, onSwipeLeft, onSwipeRight) {
  if (swipeStartX === null) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - swipeStartX;
  const dy = touch.clientY - swipeStartY;
  swipeStartX = null;
  if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  }
}

function lockScroll(locked) {
  document.body.style.overflow = locked ? "hidden" : "";
}

function setupPhotoViewer() {
  const dialog = document.getElementById("photo-viewer");
  const content = document.getElementById("photo-viewer-content");
  const label = document.getElementById("photo-viewer-label");
  const closeButton = document.getElementById("photo-viewer-close");
  const prevButton = document.getElementById("photo-viewer-prev");
  const nextButton = document.getElementById("photo-viewer-next");

  function paint(index) {
    label.textContent = `${index + 1} / ${GALLERY_SIZE}`;
    content.replaceChildren();

    const sourceImg = document.querySelector(`.gallery-item[data-photo-index="${index}"] img`);
    if (sourceImg && sourceImg.isConnected) {
      const img = document.createElement("img");
      img.src = sourceImg.currentSrc || sourceImg.src;
      img.alt = "";
      content.appendChild(img);
    } else {
      content.appendChild(createPlaceholder(`사진 ${index + 1}`));
    }
  }

  window.openPhotoViewer = function openPhotoViewer(index) {
    viewerState.index = index;
    lockScroll(true);
    paint(index);
    dialog.showModal();
  };

  function close() {
    lockScroll(false);
    viewerState.index = null;
    if (dialog.open) dialog.close();
  }

  function move(direction) {
    if (viewerState.index === null) return;
    const nextIndex = (viewerState.index + direction + GALLERY_SIZE) % GALLERY_SIZE;
    const page = Math.floor(nextIndex / GALLERY_PER_PAGE);
    if (page !== galleryState.page) {
      galleryState.page = page;
      renderGallery();
    }
    viewerState.index = nextIndex;
    paint(nextIndex);
  }

  closeButton.addEventListener("click", close);
  dialog.addEventListener("cancel", () => {
    lockScroll(false);
    viewerState.index = null;
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === content || event.target === dialog) close();
  });
  prevButton.addEventListener("click", () => move(-1));
  nextButton.addEventListener("click", () => move(1));

  dialog.addEventListener("touchstart", trackSwipeStart, { passive: true });
  dialog.addEventListener(
    "touchend",
    (event) => finishSwipe(event, () => move(1), () => move(-1)),
    { passive: true },
  );

  document.addEventListener("keydown", (event) => {
    if (viewerState.index === null) return;
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  });
}

function openPhotoViewer(index) {
  window.openPhotoViewer(index);
}

function renderAccountRow(account) {
  const row = document.createElement("div");
  row.className = "account-row";
  row.innerHTML = `
    <p class="account-row__side">${account.role}</p>
    <div class="account-row__body">
      <div>
        <p class="account-row__number">${account.bank} ${account.number}</p>
        <p class="account-row__holder">예금주 ${account.holder}</p>
      </div>
      <button type="button" class="account-row__copy">복사</button>
    </div>
  `;
  row.querySelector(".account-row__copy").addEventListener("click", () => copyText(account.number));
  return row;
}

function setupAccountDialog() {
  const dialog = document.getElementById("account-dialog");
  const title = document.getElementById("account-dialog-title");
  const list = document.getElementById("account-dialog-list");
  const closeButton = document.getElementById("account-dialog-close");

  document.querySelectorAll("[data-account-side]").forEach((button) => {
    button.addEventListener("click", () => {
      const side = button.dataset.accountSide;
      title.textContent = side === "bride" ? "신부측 계좌번호" : "신랑측 계좌번호";
      list.replaceChildren(...getAccountGroup(side).map(renderAccountRow));
      lockScroll(true);
      dialog.showModal();
    });
  });

  function close() {
    lockScroll(false);
    if (dialog.open) dialog.close();
  }

  closeButton.addEventListener("click", close);
  dialog.addEventListener("cancel", () => lockScroll(false));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
}

function showToast(message) {
  const toast = document.getElementById("copy-toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 1800);
}

function copyText(text) {
  function done() {
    showToast("계좌번호가 복사되었습니다.");
  }
  function fallbackCopy() {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (error) {
      // ignored: clipboard fallback best effort
    }
    document.body.removeChild(textarea);
    done();
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, fallbackCopy);
  } else {
    fallbackCopy();
  }
}

function setupMapLinks() {
  const links = buildExternalMapLinks("보타닉 웨딩파크");
  document.getElementById("kakao-link").href = links.kakao;
  document.getElementById("naver-link").href = links.naver;
}

function setupRevealAnimations() {
  const sections = document.querySelectorAll(".fade-section");
  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-in"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-in");
      });
    },
    { threshold: 0.12 },
  );
  sections.forEach((section) => observer.observe(section));
}

function addPetals() {
  const layer = document.getElementById("petal-layer");
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

setupStaticImageFallbacks();
renderCalendar();
setupGallery();
setupPhotoViewer();
setupAccountDialog();
setupMapLinks();
setupRevealAnimations();
addPetals();
