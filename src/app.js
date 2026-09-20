import {
  AI_GUEST_MESSAGES,
  DEVELOPER_TRANSITION_COMMANDS,
  buildDeveloperSequence,
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

function setupDeveloperMode() {
  const invitation = document.querySelector(".invitation");
  const toggle = document.getElementById("developer-toggle");
  const transition = document.getElementById("developer-transition");
  const transitionLines = document.getElementById("developer-transition-lines");
  const consoleLog = document.getElementById("developer-console-log");
  const selector = document.getElementById("ai-agent-selector");
  const card = document.getElementById("ai-agent-card");
  const icon = document.getElementById("ai-agent-icon");
  const name = document.getElementById("ai-agent-name");
  const handle = document.getElementById("ai-agent-handle");
  const request = document.getElementById("ai-agent-request");
  const approved = document.getElementById("ai-agent-approved");
  const form = document.getElementById("developer-congratulations-form");
  const messageInput = document.getElementById("visitor-message");
  const submit = document.getElementById("developer-congratulations");
  const rsvpLog = document.getElementById("developer-rsvp-log");
  const response = document.getElementById("developer-response");
  const particles = document.getElementById("developer-particle-layer");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const timers = new Set();
  let sequenceId = 0;
  let agentIndex = 0;
  let agentInterval = null;
  let state = "normal";

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
    particles.replaceChildren();
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

  function scrollToLatest(line) {
    if (reducedMotion.matches) return;
    const bottom = window.scrollY + line.getBoundingClientRect().bottom + 28;
    if (bottom <= window.scrollY + window.innerHeight) return;
    window.scrollTo({ top: bottom - window.innerHeight, behavior: "smooth" });
  }

  function renderAgent(requestedIndex) {
    agentIndex = (requestedIndex + AI_GUEST_MESSAGES.length) % AI_GUEST_MESSAGES.length;
    const agent = AI_GUEST_MESSAGES[agentIndex];
    card.style.setProperty("--agent-accent", agent.accent);
    icon.textContent = agent.icon;
    name.textContent = agent.name;
    handle.textContent = agent.handle;
    request.textContent = agent.request;
    approved.textContent = agent.approved;
    approved.hidden = true;

    selector.querySelectorAll("button").forEach((button, index) => {
      const selected = index === agentIndex;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-active", selected);
    });
  }

  function startAgentRotation() {
    stopAgentRotation();
    if (reducedMotion.matches || invitation.dataset.mode !== "developer") return;
    agentInterval = window.setInterval(() => renderAgent(agentIndex + 1), 3_500);
  }

  function resetAgentRotation(index) {
    renderAgent(index);
    startAgentRotation();
  }

  AI_GUEST_MESSAGES.forEach((agent, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = agent.icon;
    button.setAttribute("aria-label", `${agent.name} 승인 메시지 보기`);
    button.setAttribute("aria-pressed", "false");
    button.style.setProperty("--agent-accent", agent.accent);
    button.addEventListener("click", () => resetAgentRotation(index));
    selector.appendChild(button);
  });
  renderAgent(0);

  function appendTransition(text, success = false) {
    const line = document.createElement("p");
    line.className = success ? "is-success" : "";
    line.textContent = success ? text : `$ ${text}`;
    transitionLines.appendChild(line);
  }

  async function renderWeddingBoot(id) {
    const times = [
      "13:49:58.000",
      "13:49:58.214",
      "13:49:58.351",
      "13:49:58.629",
      "13:49:59.050",
      "13:49:59.421",
      "13:50:00.000",
    ];
    consoleLog.replaceChildren();
    consoleLog.setAttribute("aria-busy", "true");

    for (const [index, entry] of buildDeveloperSequence().entries()) {
      await wait(index === 0 ? 120 : 360);
      if (id !== sequenceId || invitation.dataset.mode !== "developer") return;
      const line = createLogLine(entry, times[index]);
      consoleLog.appendChild(line);
      scrollToLatest(line);
    }

    consoleLog.setAttribute("aria-busy", "false");
    state = "developer.ready";
    startAgentRotation();
  }

  async function enterDeveloperMode() {
    cancelAnimations();
    const id = sequenceId;
    state = "switching";
    invitation.dataset.mode = "switching";
    document.body.classList.add("is-developer-mode", "is-switching-mode");
    toggle.setAttribute("aria-pressed", "true");
    toggle.disabled = true;
    transitionLines.replaceChildren();
    transition.hidden = false;
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });

    for (const command of DEVELOPER_TRANSITION_COMMANDS) {
      appendTransition(command);
      await wait(550);
      if (id !== sequenceId) return;
    }
    appendTransition("Switched to branch 'develop' ✓", true);
    await wait(300);
    if (id !== sequenceId) return;

    transitionLines.replaceChildren();
    transition.hidden = true;
    invitation.dataset.mode = "developer";
    document.body.classList.remove("is-switching-mode");
    toggle.disabled = false;
    state = "developer.booting";
    renderWeddingBoot(id);
  }

  function leaveDeveloperMode() {
    cancelAnimations();
    state = "normal";
    invitation.dataset.mode = "normal";
    document.body.classList.remove("is-developer-mode", "is-switching-mode");
    toggle.setAttribute("aria-pressed", "false");
    toggle.disabled = false;
    transition.hidden = true;
    transitionLines.replaceChildren();
    consoleLog.replaceChildren();
    rsvpLog.replaceChildren();
    response.hidden = true;
    approved.hidden = true;
    messageInput.value = "";
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
  }

  function launchParticles(agent) {
    particles.replaceChildren();
    if (reducedMotion.matches) return;
    const symbols = ["♥", "{ }", "< />", agent.icon, "*", "+"];
    for (let index = 0; index < 42; index += 1) {
      const particle = document.createElement("span");
      particle.textContent = symbols[index % symbols.length];
      particle.style.left = `${12 + Math.random() * 76}%`;
      particle.style.top = `${48 + Math.random() * 12}%`;
      particle.style.setProperty("--particle-accent", agent.accent);
      particle.style.setProperty("--particle-x", `${-80 + Math.random() * 160}px`);
      particle.style.animationDelay = `${Math.random() * 120}ms`;
      particles.appendChild(particle);
    }
    schedule(() => particles.replaceChildren(), 1_300);
  }

  toggle.addEventListener("click", () => {
    if (invitation.dataset.mode === "normal") {
      enterDeveloperMode();
      return;
    }
    leaveDeveloperMode();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state !== "developer.ready" && state !== "celebrated") return;
    const agent = AI_GUEST_MESSAGES[agentIndex];
    const message = messageInput.value.trim() || "두 분의 새로운 시작을 축하합니다!";
    const line = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent = "VISITOR";
    line.append(label, ` : ${message}`);
    rsvpLog.appendChild(line);
    approved.hidden = false;
    response.textContent = "200 OK — 축하의 마음이 전달되었습니다.";
    response.hidden = false;
    submit.disabled = true;
    state = "celebrated";
    launchParticles(agent);
    schedule(() => {
      submit.disabled = false;
      state = "developer.ready";
    }, 1_300);
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
