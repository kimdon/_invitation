import {
  AI_GUEST_MESSAGES,
  DEVELOPER_TRANSITION_COMMANDS,
  FIREWORK_BURST_PLAN,
  GALLERY_PHOTOS,
  buildDeveloperSequence,
  buildCalendarWeeks,
  buildExternalMapLinks,
  buildMobileMapLinks,
  buildGalleryPage,
  getAccountGroup,
  getDdayDisplay,
  getGallerySources,
} from "./invitation.js";

const GALLERY_SIZE = GALLERY_PHOTOS.length;
const GALLERY_PER_PAGE = 6;
const WEDDING_DATE = new Date(2026, 10, 21, 12);

function createPlaceholder(label, className = "gallery-placeholder") {
  const placeholder = document.createElement("div");
  placeholder.className = className;
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", `${label} 자리표시자`);
  placeholder.textContent = label;
  return placeholder;
}

function loadOptionalImage(source, alt, placeholder, { loading = "eager" } = {}) {
  const image = document.createElement("img");
  image.alt = alt;
  image.loading = loading;
  image.decoding = "async";
  image.hidden = loading !== "lazy";
  image.addEventListener("load", () => {
    placeholder.remove();
    image.hidden = false;
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
  const status = document.getElementById("photo-viewer-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = 1;
  let activeFrame = null;
  let busy = false;
  let requestId = 0;
  let animation = null;
  let gestureStart = null;
  let multiTouch = false;
  let touchCount = 0;
  let lastTap = null;

  function updateControls() {
    previous.disabled = busy;
    next.disabled = busy;
    content.setAttribute("aria-busy", String(busy));
  }

  async function render(number, direction = 0) {
    if (busy || !dialog.open) return;
    const request = ++requestId;
    busy = true;
    updateControls();
    status.textContent = activeFrame ? "다음 사진을 불러오는 중입니다." : "사진을 불러오는 중입니다.";
    try {
      const image = document.createElement("img");
      image.alt = `사진 ${number}`;
      image.decoding = "async";
      image.draggable = false;
      image.src = getGallerySources(number).full;
      await image.decode();
      if (request !== requestId || !dialog.open) return;

      const incoming = document.createElement("div");
      incoming.className = "photo-viewer__frame";
      incoming.append(image);
      status.textContent = "";
      if (activeFrame && direction && !reducedMotion.matches && typeof content.animate === "function") {
        const track = document.createElement("div");
        track.className = "photo-viewer__track";
        // Full-width neighboring panes slide together; the photos never overlap.
        track.append(...(direction > 0 ? [activeFrame, incoming] : [incoming, activeFrame]));
        content.replaceChildren(track);
        animation = track.animate([
          { transform: direction > 0 ? "translateX(0)" : "translateX(-100%)" },
          { transform: direction > 0 ? "translateX(-100%)" : "translateX(0)" },
        ], { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
        await animation.finished.catch(() => {});
        if (request !== requestId || !dialog.open) return;
      }
      content.replaceChildren(incoming);
      activeFrame = incoming;
      current = number;
      label.textContent = `${current} / ${GALLERY_SIZE}`;
    } catch {
      if (request === requestId && dialog.open) {
        status.textContent = `사진 ${number}을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`;
      }
    } finally {
      if (request === requestId) {
        animation = null;
        busy = false;
        updateControls();
      }
    }
  }

  function move(offset) {
    if (busy || multiTouch) return;
    render(((current - 1 + offset + GALLERY_SIZE) % GALLERY_SIZE) + 1, offset);
  }

  function reset() {
    requestId += 1;
    animation?.cancel();
    animation = null;
    activeFrame = null;
    busy = false;
    gestureStart = null;
    multiTouch = false;
    touchCount = 0;
    lastTap = null;
    content.replaceChildren();
    status.textContent = "";
    updateControls();
  }

  function close() {
    reset();
    if (dialog.open) dialog.close();
    document.body.classList.remove("is-locked");
  }

  function show(number) {
    reset();
    current = number;
    label.textContent = `${current} / ${GALLERY_SIZE}`;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("is-locked");
    render(number);
  }

  closeButton.addEventListener("click", close);
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    reset();
    document.body.classList.remove("is-locked");
  });
  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  });
  const preventZoom = (event) => { if (event.cancelable) event.preventDefault(); };
  const touchOptions = { passive: false, capture: true };
  dialog.addEventListener("touchstart", (event) => {
    touchCount = event.touches.length;
    if (event.touches.length !== 1 || multiTouch) {
      multiTouch = true;
      gestureStart = null;
      lastTap = null;
      preventZoom(event);
      return;
    }
    const touch = event.touches[0];
    gestureStart = { id: touch.identifier, x: touch.clientX, y: touch.clientY, canSwipe: content.contains(event.target) };
  }, touchOptions);
  dialog.addEventListener("touchmove", (event) => {
    touchCount = event.touches.length;
    if (event.touches.length > 1) {
      multiTouch = true;
      gestureStart = null;
      lastTap = null;
    }
    preventZoom(event);
  }, touchOptions);
  dialog.addEventListener("touchend", (event) => {
    touchCount = event.touches.length;
    if (multiTouch) {
      gestureStart = null;
      lastTap = null;
      preventZoom(event);
      if (event.touches.length === 0) multiTouch = false;
      return;
    }
    if (!gestureStart || event.touches.length) return;
    const start = gestureStart;
    gestureStart = null;
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (start.canSwipe && Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      lastTap = null;
      preventZoom(event);
      move(dx < 0 ? 1 : -1);
    } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      if (lastTap && event.timeStamp - lastTap.time < 300 && Math.abs(touch.clientX - lastTap.x) < 24 && Math.abs(touch.clientY - lastTap.y) < 24) {
        preventZoom(event);
        lastTap = null;
      } else {
        lastTap = { time: event.timeStamp, x: touch.clientX, y: touch.clientY };
      }
    } else {
      lastTap = null;
    }
  }, touchOptions);
  dialog.addEventListener("touchcancel", (event) => {
    touchCount = event.touches.length;
    gestureStart = null;
    lastTap = null;
    multiTouch = event.touches.length > 0;
  }, touchOptions);
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
    dialog.addEventListener(type, (event) => {
      multiTouch = touchCount > 0;
      gestureStart = null;
      lastTap = null;
      preventZoom(event);
    }, touchOptions);
  }
  dialog.addEventListener("dblclick", preventZoom);
  dialog.addEventListener("wheel", (event) => { if (event.ctrlKey) preventZoom(event); }, { passive: false });

  return show;
}

function createGalleryItem(number, openViewer, loading = "lazy") {
  const item = document.createElement("div");
  item.className = "gallery-item";

  const placeholder = createPlaceholder(`사진 ${number}`);
  const image = loadOptionalImage(getGallerySources(number).thumbnail, `사진 ${number}`, placeholder, { loading });
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
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cachedPages = new Map();
  const pageCount = buildGalleryPage(GALLERY_SIZE, GALLERY_PER_PAGE, 0).pageCount;
  let page = 0;
  let changing = false;
  let touchStart = null;

  function getPageItems(galleryPage, loading) {
    if (!cachedPages.has(galleryPage.page)) {
      cachedPages.set(galleryPage.page, galleryPage.items.map((number) => createGalleryItem(number, openViewer, loading)));
    }
    return cachedPages.get(galleryPage.page);
  }

  function updateControls() {
    Array.from(dots.children).forEach((dot, index) => {
      dot.classList.toggle("is-active", index === page);
      dot.setAttribute("aria-current", index === page ? "page" : "false");
      dot.disabled = changing;
    });
    previous.disabled = changing || page === 0;
    next.disabled = changing || page === pageCount - 1;
    pageLabel.textContent = `${page + 1} / ${pageCount}`;
    grid.setAttribute("aria-busy", String(changing));
  }

  async function changePage(requestedPage) {
    const galleryPage = buildGalleryPage(GALLERY_SIZE, GALLERY_PER_PAGE, requestedPage);
    if (changing || galleryPage.page === page) return;
    changing = true;
    updateControls();
    let outgoing;
    try {
      const items = getPageItems(galleryPage, "eager");
      // Keep the current page visible until the incoming thumbnails can be painted.
      await Promise.allSettled(items.flatMap((item) => Array.from(item.querySelectorAll("img"), (image) => {
        image.loading = "eager";
        return image.decode();
      })));

      if (!reducedMotion.matches && typeof grid.animate === "function") {
        outgoing = grid.cloneNode(true);
        outgoing.removeAttribute("id");
        outgoing.removeAttribute("aria-busy");
        outgoing.classList.add("gallery-grid--outgoing");
        outgoing.setAttribute("aria-hidden", "true");
        outgoing.inert = true;
        grid.parentElement.appendChild(outgoing);
      }
      grid.replaceChildren(...items);
      page = galleryPage.page;
      updateControls();
      if (outgoing) {
        await outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 260,
          easing: "ease-out",
          fill: "forwards",
        }).finished.catch(() => {});
      }
    } finally {
      outgoing?.remove();
      changing = false;
      updateControls();
    }
  }

  for (let index = 0; index < pageCount; index += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "gallery-dot";
    dot.setAttribute("aria-label", `갤러리 ${index + 1}페이지`);
    dot.addEventListener("click", () => changePage(index));
    dots.appendChild(dot);
  }
  previous.addEventListener("click", () => changePage(page - 1));
  next.addEventListener("click", () => changePage(page + 1));
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
      changePage(page + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  grid.replaceChildren(...getPageItems(buildGalleryPage(GALLERY_SIZE, GALLERY_PER_PAGE, page), "lazy"));
  updateControls();
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
  document.getElementById("tmap-link").href = links.tmap;
  const mobile = buildMobileMapLinks("보타닉 웨딩파크", {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    pageUrl: window.location.href.split("#")[0],
  });
  if (!mobile) return;

  const fallback = document.getElementById("map-fallback");
  const message = document.getElementById("map-fallback-message");
  const fallbackLink = document.getElementById("map-fallback-link");
  const names = { kakao: "카카오맵", naver: "네이버지도", tmap: "TMAP" };
  for (const [provider, link] of Object.entries(mobile)) {
    const button = document.getElementById(`${provider}-link`);
    button.href = link.app;
    button.target = "_self";
    button.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      message.textContent = `${names[provider]} 앱이 열리지 않으면 아래 버튼을 이용해 주세요.`;
      fallbackLink.href = link.fallback;
      fallbackLink.textContent = link.fallbackLabel;
      fallback.hidden = false;
    });
  }
  // Installation cannot be detected reliably on the web. Android handles its
  // intent fallback; other browsers get an explicit link, never a late redirect.
  document.addEventListener("visibilitychange", () => { if (document.hidden) fallback.hidden = true; });
  window.addEventListener("pagehide", () => { fallback.hidden = true; });
}

function setupDeveloperMode() {
  const invitation = document.querySelector(".invitation");
  const toggle = document.getElementById("developer-toggle");
  const transition = document.getElementById("developer-transition");
  const transitionBrand = document.getElementById("developer-transition-brand");
  const transitionLines = document.getElementById("developer-transition-lines");
  const pageSections = invitation.querySelectorAll(
    ":scope > .cover, :scope > .section, :scope > .developer-rsvp, :scope > .footer",
  );
  const selector = document.getElementById("ai-agent-selector");
  const card = document.getElementById("ai-agent-card");
  const icon = document.getElementById("ai-agent-icon");
  const name = document.getElementById("ai-agent-name");
  const handle = document.getElementById("ai-agent-handle");
  const request = document.getElementById("ai-agent-request");
  const approved = document.getElementById("ai-agent-approved");
  const submit = document.getElementById("developer-congratulations");
  const response = document.getElementById("developer-response");
  const fireworks = document.getElementById("developer-particle-layer");
  const fireworkContext = fireworks.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const timers = new Set();
  let sequenceId = 0;
  let agentIndex = 0;
  let agentInterval = null;
  let fireworkFrame = null;
  let state = "normal";
  let isFinalApproved = false;

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, reducedMotion.matches ? 0 : delay);
    timers.add(timer);
    return timer;
  }

  function wait(delay) {
    return new Promise((resolve) => schedule(resolve, delay));
  }

  function stopAgentRotation() {
    if (!agentInterval) return;
    window.clearInterval(agentInterval);
    agentInterval = null;
  }

  function cancelAnimations() {
    sequenceId += 1;
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    stopAgentRotation();
    cancelFireworks();
  }

  function createLogLine(entry, time) {
    const line = document.createElement("p");
    const timestamp = document.createElement("time");
    const level = document.createElement("strong");
    const logger = document.createElement("span");

    timestamp.textContent = time;
    level.textContent = entry.level;
    logger.textContent = entry.logger;
    line.className = `developer-log-line developer-log-line--${entry.level.toLowerCase()}`;
    line.append(timestamp, " ", level, " ", logger, " : ", entry.message);
    return line;
  }

  function setPageSectionsHidden(hidden) {
    pageSections.forEach((section) => {
      section.hidden = hidden;
    });
  }

  function scrollToLatest() {
    transitionLines.scrollTo({
      top: transitionLines.scrollHeight,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  }

  function createAgentIconVisual(agent, className) {
    const frame = document.createElement("span");
    const fallback = document.createElement("span");
    const image = document.createElement("img");
    frame.className = className;
    frame.setAttribute("aria-hidden", "true");
    fallback.className = "agent-icon__fallback";
    fallback.textContent = agent.icon;
    fallback.setAttribute("aria-hidden", "true");
    image.className = "agent-icon__image";
    image.alt = "";
    image.src = agent.iconSrc;
    image.addEventListener("error", () => image.remove(), { once: true });
    frame.append(fallback, image);
    return frame;
  }

  function renderAgent(requestedIndex) {
    agentIndex = (requestedIndex + AI_GUEST_MESSAGES.length) % AI_GUEST_MESSAGES.length;
    const agent = AI_GUEST_MESSAGES[agentIndex];
    card.style.setProperty("--agent-accent", agent.accent);
    icon.replaceChildren(createAgentIconVisual(agent, "agent-review__visual"));
    name.textContent = agent.name;
    handle.textContent = agent.handle;
    request.textContent = agent.request;
    approved.textContent = agent.approved;
    approved.hidden = false;

    selector.querySelectorAll("button").forEach((button, index) => {
      const selected = index === agentIndex;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-active", selected);
    });
  }

  function startAgentRotation() {
    stopAgentRotation();
    if (reducedMotion.matches || invitation.dataset.mode !== "developer" || isFinalApproved) return;
    agentInterval = window.setInterval(() => renderAgent(agentIndex + 1), 3_500);
  }

  function resetFinalApproval() {
    isFinalApproved = false;
    agentIndex = 0;
    submit.textContent = "APPROVE ♥";
    submit.disabled = false;
    response.textContent = "";
    response.hidden = true;
    response.classList.remove("is-complete");
    renderAgent(0);
  }

  function resetAgentRotation(index) {
    renderAgent(index);
    startAgentRotation();
  }

  AI_GUEST_MESSAGES.forEach((agent, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${agent.name} 승인 완료 리뷰 보기`);
    button.setAttribute("aria-pressed", "false");
    button.classList.add("is-approved");
    button.style.setProperty("--agent-accent", agent.accent);
    button.append(createAgentIconVisual(agent, "agent-selector__visual"));
    button.addEventListener("click", () => resetAgentRotation(index));
    selector.appendChild(button);
  });
  renderAgent(0);

  function appendTransition(text, success = false) {
    const line = document.createElement("p");
    line.className = success ? "is-success" : "";
    line.textContent = success ? text : `$ ${text}`;
    transitionLines.appendChild(line);
    scrollToLatest();
  }

  async function renderWeddingBoot(id) {
    const times = [
      "13:49:58.000",
      "13:49:58.214",
      "13:49:58.351",
      "13:49:58.482",
      "13:49:58.629",
      "13:49:58.810",
      "13:49:59.050",
      "13:49:59.421",
      "13:50:00.000",
    ];
    transitionBrand.hidden = false;
    transitionLines.setAttribute("aria-busy", "true");

    for (const [index, entry] of buildDeveloperSequence().entries()) {
      await wait(index === 0 ? 120 : 360);
      if (id !== sequenceId || invitation.dataset.mode !== "switching") return;
      const line = createLogLine(entry, times[index]);
      transitionLines.appendChild(line);
      scrollToLatest();
    }

    transitionLines.setAttribute("aria-busy", "false");
    await wait(1000);
    if (id !== sequenceId || invitation.dataset.mode !== "switching") return;
    transition.classList.add("is-exiting");
    await wait(450);
    if (id !== sequenceId || invitation.dataset.mode !== "switching") return;
    transition.hidden = true;
    transition.classList.remove("is-exiting");
    invitation.dataset.mode = "developer";
    invitation.dataset.bootState = "ready";
    invitation.setAttribute("aria-busy", "false");
    document.body.classList.remove("is-switching-mode");
    setPageSectionsHidden(false);
    toggle.disabled = false;
    state = "developer.ready";
    startAgentRotation();
  }

  async function enterDeveloperMode() {
    cancelAnimations();
    resetFinalApproval();
    const id = sequenceId;
    state = "switching";
    invitation.dataset.mode = "switching";
    invitation.dataset.bootState = "booting";
    invitation.setAttribute("aria-busy", "true");
    document.body.classList.add("is-developer-mode", "is-switching-mode");
    toggle.setAttribute("aria-pressed", "true");
    toggle.disabled = true;
    transition.classList.remove("is-exiting");
    transitionBrand.hidden = true;
    transitionLines.replaceChildren();
    transitionLines.setAttribute("aria-busy", "true");
    transition.hidden = false;
    setPageSectionsHidden(true);
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });

    for (const command of DEVELOPER_TRANSITION_COMMANDS) {
      appendTransition(command);
      await wait(550);
      if (id !== sequenceId) return;
    }
    appendTransition("Switched to branch 'develop' ✓", true);
    await wait(1000);
    if (id !== sequenceId) return;

    state = "developer.booting";
    await renderWeddingBoot(id);
  }

  function leaveDeveloperMode() {
    cancelAnimations();
    state = "normal";
    invitation.dataset.mode = "normal";
    invitation.dataset.bootState = "idle";
    invitation.setAttribute("aria-busy", "false");
    document.body.classList.remove("is-developer-mode", "is-switching-mode");
    toggle.setAttribute("aria-pressed", "false");
    toggle.disabled = false;
    transition.hidden = true;
    transition.classList.remove("is-exiting");
    transitionBrand.hidden = true;
    transitionLines.setAttribute("aria-busy", "false");
    transitionLines.replaceChildren();
    setPageSectionsHidden(false);
    response.hidden = true;
    approved.hidden = true;
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
  }

  function clearFireworksCanvas() {
    if (!fireworkContext) return;
    fireworkContext.save();
    fireworkContext.setTransform(1, 0, 0, 1, 0, 0);
    fireworkContext.clearRect(0, 0, fireworks.width, fireworks.height);
    fireworkContext.restore();
  }

  function cancelFireworks() {
    if (fireworkFrame !== null) {
      window.cancelAnimationFrame(fireworkFrame);
      fireworkFrame = null;
    }
    clearFireworksCanvas();
  }

  function launchFireworks(agent) {
    cancelFireworks();
    if (reducedMotion.matches || !fireworkContext) return;

    const bounds = fireworks.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    fireworks.width = Math.round(bounds.width * pixelRatio);
    fireworks.height = Math.round(bounds.height * pixelRatio);
    fireworkContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const colors = [agent.accent, "#7ee787", "#79c0ff", "#f2cc60", "#ff7b9c", "#f0f6fc"];
    const pendingBursts = FIREWORK_BURST_PLAN.map((burst) => ({ ...burst }));
    const particles = [];
    const startedAt = performance.now();

    function createBurst(burst) {
      const originX = bounds.width * burst.x;
      const originY = bounds.height * burst.y;
      return Array.from({ length: 72 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 72 + (Math.random() - 0.5) * 0.08;
        const speed = 4.5 + Math.random() * 6;
        return {
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.013 + Math.random() * 0.007,
          size: 1.8 + Math.random() * 1.8,
          color: colors[index % colors.length],
        };
      });
    }

    function drawFrame(now) {
      const elapsed = now - startedAt;
      while (pendingBursts[0] && elapsed >= pendingBursts[0].delay) {
        particles.push(...createBurst(pendingBursts.shift()));
      }

      fireworkContext.save();
      fireworkContext.globalCompositeOperation = "destination-out";
      fireworkContext.fillStyle = "rgba(0, 0, 0, 0.16)";
      fireworkContext.fillRect(0, 0, bounds.width, bounds.height);
      fireworkContext.restore();

      let active = false;
      fireworkContext.save();
      fireworkContext.globalCompositeOperation = "source-over";
      fireworkContext.lineCap = "round";

      particles.forEach((particle) => {
        if (particle.alpha <= 0) return;
        active = true;
        const previousX = particle.x;
        const previousY = particle.y;
        particle.vx *= 0.985;
        particle.vy = particle.vy * 0.985 + 0.055;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= particle.decay;

        fireworkContext.globalAlpha = Math.max(0, particle.alpha);
        fireworkContext.strokeStyle = particle.color;
        fireworkContext.lineWidth = particle.size;
        fireworkContext.beginPath();
        fireworkContext.moveTo(previousX, previousY);
        fireworkContext.lineTo(particle.x, particle.y);
        fireworkContext.stroke();
      });

      fireworkContext.restore();
      if (pendingBursts.length || active) {
        fireworkFrame = window.requestAnimationFrame(drawFrame);
        return;
      }
      clearFireworksCanvas();
      fireworkFrame = null;
    }

    fireworkFrame = window.requestAnimationFrame(drawFrame);
  }

  toggle.addEventListener("click", () => {
    if (invitation.dataset.mode === "normal") {
      enterDeveloperMode();
      return;
    }
    leaveDeveloperMode();
  });

  submit.addEventListener("click", () => {
    if (state !== "developer.ready" || isFinalApproved) return;
    isFinalApproved = true;
    stopAgentRotation();
    submit.textContent = "APPROVED ✓";
    submit.disabled = true;
    response.textContent = "FINAL APPROVAL COMPLETE — wedding-v1.0 is ready to merge ♥";
    response.classList.add("is-complete");
    response.hidden = false;
    launchFireworks(AI_GUEST_MESSAGES[agentIndex]);
  });
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
setupDeveloperMode();
setupRevealAnimations();
addPetals();
