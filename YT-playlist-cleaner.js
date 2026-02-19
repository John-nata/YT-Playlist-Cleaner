// ==UserScript==
// @name YT Playlist Cleaner
// @version 2.0.4
// @description A handy tool to tidy up your YouTube playlists with custom settings and smart features
// @author John-nata
// @match http*://*.youtube.com/playlist*
// @match http*://youtube.com/playlist*
// @run-at document-idle
// @homepageURL https://github.com/John-nata/YT-Playlist-Cleaner
// ==/UserScript==

// Main settings for the cleaner
let config = {
  threshold: 0,
  minDelay: 2,
  maxDelay: 12,
  maxDelete: 400,
  pauseAfter: 100,
  pauseDuration: 60,
  shuffleDelete: false,
  autoScrollEvery: 25,
  darkMode: false,
  // Only delete unavailable (private/deleted) videos
  onlyUnavailable: false,
  // Skip videos added within last N days (0 = disabled)
  deleteOlderThanDays: 0,
};

// Keeps track of what's happening during the clean-up
let state = {
  deletedCount: 0,
  totalVideos: 0,
  currentVideo: 0,
  skippedCount: 0,
  isPaused: false,
  isAutoPaused: false,
  pauseState: 'running',
  pauseNotificationId: null,
  startTime: null,
  consecutiveErrors: 0,
  lastErrorTime: null,
  statistics: {
    totalTimeSpent: 0,
    sessionsCount: 0,
    totalVideosDeleted: 0,
    averageDeleteTime: 0
  }
};

// Store original console methods to prevent infinite recursion
const originalLog = console.log.bind(console);
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

// Check if it's first time and show welcome message
if (!localStorage.getItem('ytPlaylistCleanerFirstTime')) {
  window.addEventListener('load', () => {
    setTimeout(showFirstTimeMessage, 2000);
  });
}

// Add Trusted Types policy for innerHTML safety
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  try {
    window.trustedTypes.createPolicy('ytPlaylistCleaner', {
      createHTML: (string) => string
    });
  } catch (e) {
    // Policy already exists, ignore
  }
}

function showFirstTimeMessage() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 32px;
    border-radius: 16px;
    max-width: 500px;
    text-align: center;
    font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
  `;
  content.innerHTML = `
    <h2 style="margin: 0 0 24px 0; color: #030303; font-size: 32px;">G'day! 👋</h2>
    <p style="margin: 0 0 20px 0; color: #606060; line-height: 1.6; font-size: 18px;">
      Thanks heaps for using YouTube Playlist Cleaner!
    </p>
    <p style="margin: 0 0 32px 0; color: #606060; line-height: 1.6; font-size: 18px;">
      <strong>Pro tip:</strong> Sort your playlist by "Date added (oldest)" before cleaning.
      If you can't see the sorting dropdown, remove all the shorts in your Watch Later list.
      Please, don't forget to click Star on the Github repo.
    </p>
    <button id="welcome-close-btn" style="
      background: #065fd4;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 24px;
      font-size: 18px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    ">Got it, thanks!</button>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  const button = content.querySelector('#welcome-close-btn');
  button.onclick = () => {
    modal.remove();
    localStorage.setItem('ytPlaylistCleanerFirstTime', 'false');
  };
}

// Grab the YouTube app element
const app = document.querySelector("ytd-app");
if (!app) {
  originalLog("[YT Playlist Cleaner] ytd-app not found, exiting");
}

// Helper function to pause
const sleep = (timeout) => new Promise((res) => setTimeout(res, timeout));

// Multi-language support
const deleteButtonTexts = {
  en: ["Delete", "Remove from Watch Later"],
  es: ["Eliminar", "Quitar de Ver más tarde"],
  fr: ["Supprimer", "Supprimer de À regarder plus tard"],
  de: ["Löschen", "Aus 'Später ansehen' entfernen"],
  it: ["Elimina", "Rimuovi da Guarda più tardi"],
  pt: ["Excluir", "Remover de Assistir mais tarde"],
  ru: ["Удалить", "Удалить из списка «Смотреть позже»"],
  ja: ["削除", "後で見るから削除"],
  ko: ["삭제", "나중에 볼 동영상에서 제거"],
  zh: ["删除", "从稍后观看中删除"],
  he: ["מחק", "מחק מהסט של צפייה בהמשך"],
  ar: ["إزالة", "إزالة من مشاهدة لاحقًا"],
  nl: ["Verwijderen", "Verwijderen van Later bekijken"],
  pl: ["Usuń", "Usuń z listy Do obejrzenia"],
  tr: ["Sil", "Daha sonra izle listesinden kaldır"],
  hu: ["Törlés", "Törlés a Később megnézéshez"],
  cs: ["Odstranit", "Odstranit z Přehrát později"],
  sv: ["Ta bort", "Ta bort från Titta senare"],
  da: ["Slet", "Fjern fra Se senere"],
  no: ["Slett", "Fjern fra Se senere"],
  fi: ["Poista", "Poista Katso myöhemmin -luettelosta"],
  uk: ["Видалити", "Видалити зі списку «Переглянути пізніше»"],
  ro: ["Șterge", "Elimină din Vizionează mai târziu"],
  sk: ["Odstrániť", "Odstrániť zo zoznamu Pozrieť neskôr"],
  bg: ["Изтриване", "Премахване от Гледай по-късно"],
  hr: ["Izbriši", "Ukloni s popisa Pogledaj kasnije"],
  el: ["Διαγραφή", "Κατάργηση από το Παρακολούθηση αργότερα"],
  ca: ["Suprimeix", "Suprimeix de Mira-ho més tard"],
  hi: ["हटाएं", "बाद में देखें से हटाएं"],
  th: ["ลบ", "นำออกจากดูภายหลัง"],
  vi: ["Xóa", "Xóa khỏi danh sách Xem sau"],
  id: ["Hapus", "Hapus dari Tonton nanti"],
  ms: ["Padam", "Alih keluar daripada Tonton kemudian"],
  tl: ["Tanggalin", "Alisin sa Panoorin sa ibang pagkakataon"],
};

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) {
      return resolve(existing);
    }
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement: "${selector}" not found within ${timeout}ms`));
    }, timeout);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

function createFloatingUI() {
  const existingUI = document.getElementById("yt-playlist-cleaner-ui");
  if (existingUI) {
    return {
      progressBar: existingUI.querySelector(".progress-fill"),
      statusText: existingUI.querySelector(".status-text"),
      countdownText: existingUI.querySelector(".countdown-text")
    };
  }

  const floatingUI = document.createElement("div");
  floatingUI.id = "yt-playlist-cleaner-ui";
  floatingUI.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
    border: none;
    border-radius: 16px;
    padding: 0;
    z-index: 9999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
    width: 360px;
    min-width: 320px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    font-family: 'YouTube Sans', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
    transition: box-shadow 0.3s ease, transform 0.2s ease;
    overflow: hidden;
  `;

  floatingUI.addEventListener('mouseenter', () => {
    if (config.darkMode) {
      floatingUI.style.boxShadow = '0 16px 48px rgba(255,0,0,0.2), 0 8px 24px rgba(0,0,0,0.4)';
    } else {
      floatingUI.style.boxShadow = '0 16px 48px rgba(255,0,0,0.15), 0 8px 24px rgba(0,0,0,0.12)';
    }
    floatingUI.style.transform = 'translateY(-2px)';
  });

  floatingUI.addEventListener('mouseleave', () => {
    if (config.darkMode) {
      floatingUI.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)';
    } else {
      floatingUI.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)';
    }
    floatingUI.style.transform = 'translateY(0)';
  });

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    padding: 14px 16px;
    background: linear-gradient(135deg, #ff0000 0%, #cc0000 50%, #ff3333 100%);
    background-size: 200% 200%;
    animation: gradientShift 8s ease infinite;
    cursor: move;
    border-radius: 16px 16px 0 0;
    flex-shrink: 0;
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes slideIn {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(20px); opacity: 0; }
    }
    @keyframes shrink {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
  `;
  document.head.appendChild(styleSheet);

  const icon = document.createElement("div");
  icon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#ffffff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>`;
  icon.style.cssText = `display: flex; align-items: center; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));`;

  const title = document.createElement("h3");
  title.textContent = "YT Playlist Cleaner";
  title.style.cssText = `margin: 0 0 0 10px; font-size: 15px; font-weight: 600; color: #ffffff; letter-spacing: 0.3px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);`;

  const statusBadge = document.createElement("span");
  statusBadge.id = "cleaner-status-badge";
  statusBadge.textContent = "Ready";
  statusBadge.style.cssText = `
    margin-left: auto;
    padding: 4px 10px;
    background: rgba(255,255,255,0.25);
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;

  const darkModeToggle = document.createElement("button");
  darkModeToggle.id = "dark-mode-toggle";
  darkModeToggle.innerHTML = '🌙';
  darkModeToggle.title = "Toggle Dark Mode";
  darkModeToggle.style.cssText = `
    margin-left: 8px;
    padding: 4px 8px;
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  `;

  darkModeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    config.darkMode = !config.darkMode;
    darkModeToggle.innerHTML = config.darkMode ? '☀️' : '🌙';
    updateTheme();
  });

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(statusBadge);
  header.appendChild(darkModeToggle);
  floatingUI.appendChild(header);

  const content = document.createElement("div");
  content.id = "cleaner-content";
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    max-height: calc(85vh - 60px);
  `;

  const minDelayContainer = createInputContainer("Min Delay (s):", "minDelay", "number", config.minDelay, 1, 60);
  const maxDelayContainer = createInputContainer("Max Delay (s):", "maxDelay", "number", config.maxDelay, 1, 60);
  const maxDeleteContainer = createInputContainer("Max videos to delete:", "maxDelete", "number", config.maxDelete, 1, 1000);
  const pauseAfterContainer = createInputContainer("Pause after (videos):", "pauseAfter", "number", config.pauseAfter, 1, 1000);

  const deleteButton = createButton("▶ Start Deleting", "#ff0000", true);
  const pauseResumeButton = createButton("⏸ Pause", "#606060", false);
  pauseResumeButton.id = "pause-resume-btn";

  const advancedOptionsToggle = createButton("⚙ Advanced Options", "transparent", false, true);
  advancedOptionsToggle.style.color = "#065fd4";
  advancedOptionsToggle.style.border = "1px solid #e0e0e0";

  const advancedOptions = createAdvancedOptions();
  advancedOptions.style.display = "none";

  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = `margin-top: 16px; padding-top: 16px; border-top: 1px solid #e8e8e8;`;

  const progressBar = document.createElement("div");
  progressBar.style.cssText = `width: 100%; height: 8px; background: #e8e8e8; border-radius: 4px; overflow: hidden; position: relative;`;

  const progressFill = document.createElement("div");
  progressFill.className = "progress-fill";
  progressFill.style.cssText = `width: 0%; height: 100%; background: linear-gradient(90deg, #ff0000 0%, #ff4444 100%); border-radius: 4px; transition: width 0.3s ease;`;
  progressBar.appendChild(progressFill);

  const statusText = document.createElement("div");
  statusText.className = "status-text";
  statusText.style.cssText = `margin-top: 10px; font-size: 13px; color: #606060; font-weight: 500;`;

  const countdownText = document.createElement("div");
  countdownText.className = "countdown-text";
  countdownText.style.cssText = `margin-top: 6px; font-size: 12px; color: #909090;`;

  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(statusText);
  progressContainer.appendChild(countdownText);

  content.appendChild(minDelayContainer);
  content.appendChild(maxDelayContainer);
  content.appendChild(maxDeleteContainer);
  content.appendChild(pauseAfterContainer);
  content.appendChild(deleteButton);
  content.appendChild(pauseResumeButton);
  content.appendChild(advancedOptionsToggle);
  content.appendChild(advancedOptions);
  content.appendChild(progressContainer);
  floatingUI.appendChild(content);
  document.body.appendChild(floatingUI);

  deleteButton.addEventListener("click", function () {
    updateConfigFromInputs();
    const badge = document.getElementById("cleaner-status-badge");
    if (badge) {
      badge.textContent = "Running";
      badge.style.background = "rgba(46, 204, 113, 0.3)";
    }
    cleanse(progressFill, statusText, countdownText);
  });

  pauseResumeButton.addEventListener("click", function () {
    state.isPaused = !state.isPaused;
    const badge = document.getElementById("cleaner-status-badge");
    if (state.isPaused) {
      pauseResumeButton.innerHTML = "▶ Resume";
      pauseResumeButton.style.background = "#2ecc71";
      if (badge) {
        badge.textContent = "Paused";
        badge.style.background = "rgba(243, 156, 18, 0.3)";
      }
      state.pauseNotificationId = showPersistentNotification('⏸ Deletion paused. Click Resume to continue.', 'warning');
    } else {
      pauseResumeButton.innerHTML = "⏸ Pause";
      pauseResumeButton.style.background = "#606060";
      if (badge) {
        badge.textContent = "Running";
        badge.style.background = "rgba(46, 204, 113, 0.3)";
      }
      removePersistentNotification(state.pauseNotificationId);
      state.pauseNotificationId = null;
    }
    originalLog(`Pause state changed: ${state.isPaused}`);
  });

  advancedOptionsToggle.addEventListener("click", function () {
    advancedOptions.style.display = advancedOptions.style.display === "none" ? "block" : "none";
  });

  makeDraggable(floatingUI, header);
  floatingUI.progressFill = progressFill;

  return { progressBar: progressFill, statusText, countdownText };
}

function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.addEventListener('mousedown', dragMouseDown);

  function dragMouseDown(e) {
    if (e.target.closest('button, input, select, a')) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function createAdvancedOptions() {
  const container = document.createElement("div");
  container.style.marginTop = "10px";
  container.style.padding = "10px";
  container.style.border = "1px solid #ccc";
  container.style.borderRadius = "5px";

  const thresholdContainer = createInputContainer("Threshold %:", "threshold", "number", config.threshold, 0, 100);
  const pauseDurationContainer = createInputContainer("Pause duration (s):", "pauseDuration", "number", config.pauseDuration, 1, 3600);
  const autoScrollContainer = createInputContainer("Auto-scroll every (videos):", "autoScrollEvery", "number", config.autoScrollEvery, 1, 1000);
  const ageFilterContainer = createInputContainer("Delete videos older than (days, 0=off):", "deleteOlderThanDays", "number", config.deleteOlderThanDays, 0, 9999);
  const shuffleDeleteCheckbox = createCheckbox("Shuffle delete order", "shuffleDelete", config.shuffleDelete);
  const onlyUnavailableCheckbox = createCheckbox("Delete only unavailable videos (deleted/private)", "onlyUnavailable", config.onlyUnavailable);

  const tooltipWrapper = document.createElement("span");
  tooltipWrapper.style.cssText = `position: relative; display: inline-block; margin-left: 6px; cursor: help;`;
  tooltipWrapper.innerHTML = 'ℹ️';
  tooltipWrapper.title = 'You must click the 3-dots button (⋮) in the playlist sidebar and select "Show unavailable videos" for this to work!';

  onlyUnavailableCheckbox.appendChild(tooltipWrapper);
  container.appendChild(thresholdContainer);
  container.appendChild(pauseDurationContainer);
  container.appendChild(autoScrollContainer);
  container.appendChild(ageFilterContainer);
  container.appendChild(shuffleDeleteCheckbox);
  container.appendChild(onlyUnavailableCheckbox);
  return container;
}

function createInputContainer(labelText, id, type, value, min, max) {
  const container = document.createElement("div");
  container.style.cssText = `margin-bottom: 16px; position: relative;`;

  const label = document.createElement("label");
  label.textContent = labelText;
  label.style.cssText = `display: block; margin-bottom: 6px; font-size: 14px; color: #606060; font-weight: 500;`;

  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.className = `cleaner-input cleaner-input-${id}`;
  input.value = value;
  input.min = min;
  input.max = max;
  input.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
    outline: none;
  `;

  input.addEventListener('focus', () => {
    input.style.borderColor = '#065fd4';
    input.style.boxShadow = '0 0 0 2px rgba(6, 95, 212, 0.15)';
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = config.darkMode ? '#404040' : '#e0e0e0';
    input.style.boxShadow = 'none';
  });

  container.appendChild(label);
  container.appendChild(input);
  return container;
}

function createCheckbox(labelText, id, checked) {
  const container = document.createElement("div");
  container.style.marginBottom = "10px";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = id;
  checkbox.checked = checked;
  const label = document.createElement("label");
  label.textContent = labelText;
  label.style.marginLeft = "5px";
  container.appendChild(checkbox);
  container.appendChild(label);
  return container;
}

function createButton(text, bgColor, isPrimary = false, isOutline = false) {
  const button = document.createElement("button");
  button.innerHTML = text;
  button.style.cssText = `
    padding: ${isPrimary ? '12px 24px' : '10px 16px'};
    background: ${isOutline ? 'transparent' : bgColor};
    color: ${isOutline ? bgColor : 'white'};
    border: ${isOutline ? '1px solid currentColor' : 'none'};
    border-radius: 20px;
    cursor: pointer;
    font-size: ${isPrimary ? '14px' : '13px'};
    font-weight: 500;
    margin-right: 10px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-1px)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    if (!isOutline) button.style.filter = 'brightness(1.1)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = 'none';
    button.style.filter = 'none';
  });

  return button;
}

function updateConfigFromInputs() {
  const thresholdEl = document.getElementById("threshold");
  if (thresholdEl) config.threshold = parseInt(thresholdEl.value, 10) || 0;

  const minDelayEl = document.getElementById("minDelay");
  if (minDelayEl) config.minDelay = parseInt(minDelayEl.value, 10) || 3;

  const maxDelayEl = document.getElementById("maxDelay");
  if (maxDelayEl) config.maxDelay = parseInt(maxDelayEl.value, 10) || 7;

  const maxDeleteEl = document.getElementById("maxDelete");
  if (maxDeleteEl) config.maxDelete = parseInt(maxDeleteEl.value, 10) || 200;

  const pauseAfterEl = document.getElementById("pauseAfter");
  if (pauseAfterEl) config.pauseAfter = parseInt(pauseAfterEl.value, 10) || 100;

  const pauseDurationEl = document.getElementById("pauseDuration");
  if (pauseDurationEl) config.pauseDuration = parseInt(pauseDurationEl.value, 10) || 60;

  const autoScrollEveryEl = document.getElementById("autoScrollEvery");
  if (autoScrollEveryEl) config.autoScrollEvery = parseInt(autoScrollEveryEl.value, 10) || 10;

  const shuffleDeleteEl = document.getElementById("shuffleDelete");
  if (shuffleDeleteEl) config.shuffleDelete = shuffleDeleteEl.checked;

  const onlyUnavailableEl = document.getElementById("onlyUnavailable");
  if (onlyUnavailableEl) config.onlyUnavailable = onlyUnavailableEl.checked;

  const deleteOlderThanDaysEl = document.getElementById("deleteOlderThanDays");
  if (deleteOlderThanDaysEl) config.deleteOlderThanDays = parseInt(deleteOlderThanDaysEl.value, 10) || 0;

  saveConfig();
}

function* getVideos() {
  const videoSelector = "ytd-playlist-video-renderer";
  let videos = Array.from(document.querySelectorAll(videoSelector));
  if (config.shuffleDelete) {
    videos = shuffleArray(videos);
  }

  for (const video of videos) {
    const titleEl = video.querySelector("#video-title");
    const progressEl = video.querySelector("ytd-thumbnail-overlay-resume-playback-renderer");
    const menuEl = video.querySelector("ytd-menu-renderer");

    if (!titleEl || !menuEl) continue;

    const badgeEl = video.querySelector("yt-formatted-string.ytd-badge-supported-renderer");
    const badgeText = badgeEl?.textContent?.toLowerCase() || "";
    const titleText = titleEl.innerText || "";
    const isUnavailable = badgeText.includes("private") ||
                         badgeText.includes("deleted") ||
                         titleText.includes("[Private video]") ||
                         titleText.includes("[Deleted video]");

    const secondaryInfoEl = video.querySelector("#video-info yt-formatted-string");
    let dateAdded = null;
    if (secondaryInfoEl) {
      const infoText = secondaryInfoEl.textContent || "";
      dateAdded = parseRelativeDate(infoText);
    }

    const menuButton = menuEl.querySelector("yt-icon-button#button");

    yield {
      container: video,
      title: titleText,
      progress: progressEl?.data?.percentDurationWatched ?? 0,
      menu: menuEl,
      menuButton: menuButton,
      isUnavailable: isUnavailable,
      dateAdded: dateAdded
    };
  }
}

function parseRelativeDate(text) {
  if (!text) return null;
  const now = new Date();
  const lowerText = text.toLowerCase();
  const match = lowerText.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const date = new Date(now);

  switch (unit) {
    case 'second': date.setSeconds(date.getSeconds() - amount); break;
    case 'minute': date.setMinutes(date.getMinutes() - amount); break;
    case 'hour': date.setHours(date.getHours() - amount); break;
    case 'day': date.setDate(date.getDate() - amount); break;
    case 'week': date.setDate(date.getDate() - (amount * 7)); break;
    case 'month': date.setMonth(date.getMonth() - amount); break;
    case 'year': date.setFullYear(date.getFullYear() - amount); break;
    default: return null;
  }
  return date;
}

function isVideoOldEnough(video) {
  if (config.deleteOlderThanDays <= 0) return true;
  if (!video.dateAdded) return true;
  const now = new Date();
  const ageInDays = (now - video.dateAdded) / (1000 * 60 * 60 * 24);
  return ageInDays >= config.deleteOlderThanDays;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function cleanse(progressBar, statusText, countdownText) {
  originalLog("Cleansing...");
  state.deletedCount = 0;
  state.skippedCount = 0;
  state.totalVideos = Array.from(getVideos()).length;
  state.currentVideo = 0;
  state.startTime = Date.now();
  state.pauseState = 'running';
  state.isAutoPaused = false;

  progressBar.style.width = '0%';

  await autoScroll();
  originalLog("Initial scroll completed. Waiting for 5 seconds...");
  await countdown(5, countdownText);

  let emptyPasses = 0;
  const MAX_EMPTY_PASSES = 3;

  while (state.deletedCount < config.maxDelete) {
    let processedAny = false;
    let batchSize = 0;

    for (const video of getVideos()) {
      if (state.deletedCount >= config.maxDelete) {
        originalLog(`[state] Reached maxDelete limit (${config.maxDelete}), stopping`);
        break;
      }
      processedAny = true;

      if (++batchSize >= 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        batchSize = 0;
      }

      while (state.isPaused) {
        if (state.pauseState !== 'pausing') {
          state.pauseState = 'pausing';
          originalLog(`[state] pausing → User paused deletion`);
        }
        await sleep(1000);
      }

      if (state.pauseState === 'pausing') {
        state.pauseState = 'resuming';
        originalLog(`[state] resuming → User resumed deletion`);
        state.pauseState = 'running';
        originalLog(`[state] running → Continuing deletion (deleted: ${state.deletedCount}/${config.maxDelete})`);
      }

      originalLog(`${video.title} (${video.progress}%)`);
      state.currentVideo++;

      const meetsThreshold = video.progress >= config.threshold;
      const meetsUnavailableFilter = !config.onlyUnavailable || video.isUnavailable;
      const meetsAgeFilter = isVideoOldEnough(video);

      if (meetsThreshold && meetsUnavailableFilter && meetsAgeFilter) {
        originalLog(" Deleting...");
        const deleteSuccess = await retry(() => deleteVideo(video, countdownText));
        if (deleteSuccess) {
          state.deletedCount++;
          state.consecutiveErrors = 0;
        }

        if (state.deletedCount % config.pauseAfter === 0 && state.deletedCount < config.maxDelete) {
          state.pauseState = 'pausing';
          state.isAutoPaused = true;
          originalLog(`[state] pausing → Auto-pause triggered after ${config.pauseAfter} videos`);
          state.pauseState = 'waiting';
          originalLog(`[state] waiting → Pausing for ${config.pauseDuration} seconds...`);
          await countdown(config.pauseDuration, countdownText);
          state.pauseState = 'resuming';
          state.isAutoPaused = false;
          originalLog(`[state] resuming → Pause duration complete, continuing deletion`);
          state.pauseState = 'running';
          originalLog(`[state] running → Resuming (deleted: ${state.deletedCount}/${config.maxDelete}, remaining videos in queue)`);
        }

        if (state.deletedCount % config.autoScrollEvery === 0) {
          await autoScroll();
        }
      } else {
        state.skippedCount++;
        let skipReason = [];
        if (!meetsThreshold) skipReason.push(`threshold not met`);
        if (!meetsUnavailableFilter) skipReason.push('not unavailable');
        if (!meetsAgeFilter) skipReason.push(`too recent`);
        originalLog(` Skipping "${video.title.substring(0, 30)}...": ${skipReason.join(', ')}`);
      }

      const progressPercent = (state.deletedCount / config.maxDelete) * 100;
      progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
      statusText.textContent = `Deleted: ${state.deletedCount} / ${config.maxDelete} target`;
    }

    if (state.deletedCount >= config.maxDelete) break;

    if (!processedAny) {
      emptyPasses++;
      originalLog(`[state] No videos found in pass (attempt ${emptyPasses}/${MAX_EMPTY_PASSES}). Scrolling to load more...`);
      if (emptyPasses >= MAX_EMPTY_PASSES) {
        originalLog(`[state] No more videos available after ${MAX_EMPTY_PASSES} attempts. Stopping.`);
        break;
      }
    } else {
      emptyPasses = 0;
    }

    await autoScroll();
    originalLog(`[state] Re-scanning for more videos (deleted so far: ${state.deletedCount}/${config.maxDelete})...`);
    await sleep(2000);
  }

  if (state.skippedCount > 0) {
    originalLog(`[summary] Skipped ${state.skippedCount} videos that didn't match criteria`);
  }

  state.pauseState = 'running';
  const badge = document.getElementById("cleaner-status-badge");
  if (badge) {
    badge.textContent = "Done";
    badge.style.background = "rgba(46, 204, 113, 0.3)";
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - state.startTime) / 1000);
  originalLog(`Done! Deleted ${state.deletedCount} videos in ${duration} seconds`);
  statusText.textContent = `✓ Finished: ${state.deletedCount}/${config.maxDelete} videos deleted (${state.totalVideos} scanned)`;
  showSummaryNotification(state.totalVideos, state.deletedCount, state.skippedCount, duration);
  updateStatistics(state.deletedCount, duration);
}

async function deleteVideo(video, countdownText) {
  let success = false;
  try {
    if (!video.menuButton) {
      originalLog(` ✗ Menu button not found for: "${video.title.substring(0, 50)}"`);
      state.consecutiveErrors++;
      return false;
    }

    video.menuButton.click();
    const popup = await waitForElement("ytd-menu-popup-renderer", 5000);
    await sleep(500);

    const menuItems = Array.from(popup.querySelectorAll("ytd-menu-service-item-renderer"));
    const deleteButton = menuItems.find((item) => {
      const text = item.textContent.toLowerCase().trim();
      return Object.values(deleteButtonTexts).flat().some(buttonText =>
        text.includes(buttonText.toLowerCase())
      );
    });

    if (deleteButton) {
      deleteButton.click();
      state.consecutiveErrors = 0;
      success = true;
      originalLog(` ✓ Removed: "${video.title.substring(0, 50)}"`);
    } else {
      state.consecutiveErrors++;
      originalLog(` ✗ Delete button not found for: "${video.title.substring(0, 50)}"`);
      if (state.consecutiveErrors >= 3) {
        const waitTime = Math.min(30 * state.consecutiveErrors, 300);
        showNotification(`⚠ ${state.consecutiveErrors} consecutive errors. Cooling down ${waitTime}s...`, 'warning');
        await countdown(waitTime, countdownText);
      }
      throw new Error(`Delete button not found (consecutive errors: ${state.consecutiveErrors})`);
    }
  } catch (error) {
    state.lastErrorTime = Date.now();
    if (error.message.includes('not found within')) {
      originalLog(` ✗ Menu popup timed out for: "${video.title.substring(0, 50)}"`);
      state.consecutiveErrors++;
    } else if (!error.message.includes('Delete button not found')) {
      originalLog(` ✗ Unexpected error: ${error.message}`);
      state.consecutiveErrors++;
    }
  }

  const randomDelay = Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay;
  await countdown(randomDelay, countdownText);
  return success;
}

const autoScroll = async () => {
  const scrollStep = window.innerHeight;
  let lastScroll = -1;
  let stableScrolls = 0;
  let attempts = 0;
  const maxAttempts = 10;

  while (stableScrolls < 2 && attempts < maxAttempts) {
    const maxScroll = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );

    if (lastScroll === maxScroll) {
      stableScrolls++;
    } else {
      stableScrolls = 0;
    }
    lastScroll = maxScroll;

    window.scrollTo({ top: maxScroll, behavior: 'smooth' });
    await sleep(800);
    attempts++;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  await sleep(2000);
};

async function countdown(seconds, countdownText) {
  if (!countdownText) return;
  for (let i = seconds; i > 0; i--) {
    countdownText.textContent = `Next action in: ${i} seconds`;
    await sleep(1000);
  }
  countdownText.textContent = '';
}

function showSummaryNotification(totalProcessed, deleted, skipped, duration) {
  const message = `
    Summary:
    Total videos processed: ${totalProcessed}
    Deleted: ${deleted}
    Skipped: ${skipped}
    Time taken: ${duration} seconds
  `;
  showNotification(message, 'info', 10000);
}

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'yt-cleanser-notifications';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  document.body.appendChild(container);
  return container;
}

let persistentNotificationCounter = 0;
function showPersistentNotification(message, type = 'info') {
  const container = document.getElementById('yt-cleanser-notifications') || createNotificationContainer();
  const id = `persistent-notification-${++persistentNotificationCounter}`;
  const notification = document.createElement('div');
  notification.id = id;
  notification.style.cssText = `
    padding: 16px;
    margin-bottom: 8px;
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s forwards;
  `;

  const colors = {
    info: 'rgba(6, 95, 212, 0.95)',
    warning: 'rgba(243, 156, 18, 0.95)',
    error: 'rgba(231, 76, 60, 0.95)',
    success: 'rgba(46, 204, 113, 0.95)'
  };
  notification.style.backgroundColor = colors[type];

  const icon = document.createElement('div');
  icon.innerHTML = getNotificationIcon(type);
  icon.style.flexShrink = '0';

  const messageContainer = document.createElement('div');
  messageContainer.style.flex = '1';
  messageContainer.innerHTML = message;

  notification.appendChild(icon);
  notification.appendChild(messageContainer);
  container.appendChild(notification);
  return id;
}

function removePersistentNotification(id) {
  if (!id) return;
  const notification = document.getElementById(id);
  if (notification) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(20px)';
    setTimeout(() => notification.remove(), 300);
  }
}

let isShowingNotification = false;
function showNotification(message, type = 'info', duration = 5000) {
  if (isShowingNotification) return;

  const container = document.getElementById('yt-cleanser-notifications') || createNotificationContainer();
  const notification = document.createElement('div');
  notification.style.cssText = `
    padding: 16px;
    margin-bottom: 8px;
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s forwards, fadeOut 0.3s ${duration - 300}ms forwards;
  `;

  const colors = {
    info: 'rgba(6, 95, 212, 0.95)',
    warning: 'rgba(243, 156, 18, 0.95)',
    error: 'rgba(231, 76, 60, 0.95)',
    success: 'rgba(46, 204, 113, 0.95)'
  };
  notification.style.backgroundColor = colors[type];

  const icon = document.createElement('div');
  icon.innerHTML = getNotificationIcon(type);
  icon.style.flexShrink = '0';

  const messageContainer = document.createElement('div');
  messageContainer.style.flex = '1';
  messageContainer.innerHTML = message;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0 4px;
    opacity: 0.7;
    transition: opacity 0.2s;
  `;
  closeButton.addEventListener('click', () => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(20px)';
    setTimeout(() => notification.remove(), 300);
  });

  notification.appendChild(icon);
  notification.appendChild(messageContainer);
  notification.appendChild(closeButton);
  container.appendChild(notification);

  isShowingNotification = true;
  setTimeout(() => {
    notification.remove();
    isShowingNotification = false;
  }, duration);
}

function getNotificationIcon(type) {
  const icons = {
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
  };
  return icons[type] || icons.info;
}

function updateTheme() {
  const ui = document.getElementById("yt-playlist-cleaner-ui");
  const content = document.getElementById("cleaner-content");
  if (!ui) return;

  if (config.darkMode) {
    ui.style.background = 'linear-gradient(145deg, #1a1a1a 0%, #222222 100%)';
    ui.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)';
    if (content) content.style.background = '#1a1a1a';

    ui.querySelectorAll('input').forEach(input => {
      input.style.background = '#2a2a2a';
      input.style.color = '#ffffff';
      input.style.border = '1px solid #404040';
    });
    ui.querySelectorAll('label').forEach(label => {
      label.style.color = '#b0b0b0';
    });

    const statusText = ui.querySelector('.status-text');
    if (statusText) statusText.style.color = '#b0b0b0';
    const countdownText = ui.querySelector('.countdown-text');
    if (countdownText) countdownText.style.color = '#808080';

    const progressBar = ui.querySelector('.progress-fill')?.parentElement;
    if (progressBar) progressBar.style.background = '#333333';

    const advOptions = ui.querySelector('div[style*="border: 1px solid"]');
    if (advOptions) {
      advOptions.style.borderColor = '#404040';
      advOptions.style.background = '#222222';
    }
  } else {
    ui.style.background = 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)';
    ui.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)';
    if (content) content.style.background = 'transparent';

    ui.querySelectorAll('input').forEach(input => {
      input.style.background = '#ffffff';
      input.style.color = '#030303';
      input.style.border = '1px solid #e0e0e0';
    });
    ui.querySelectorAll('label').forEach(label => {
      label.style.color = '#606060';
    });

    const statusText = ui.querySelector('.status-text');
    if (statusText) statusText.style.color = '#606060';
    const countdownText = ui.querySelector('.countdown-text');
    if (countdownText) countdownText.style.color = '#909090';

    const progressBar = ui.querySelector('.progress-fill')?.parentElement;
    if (progressBar) progressBar.style.background = '#e8e8e8';

    const advOptions = ui.querySelector('div[style*="border: 1px solid"]');
    if (advOptions) {
      advOptions.style.borderColor = '#ccc';
      advOptions.style.background = 'transparent';
    }
  }
  saveConfig();
}

function saveConfig() {
  localStorage.setItem('ytPlaylistCleanerConfig', JSON.stringify(config));
}

function loadConfig() {
  const savedConfig = localStorage.getItem('ytPlaylistCleanerConfig');
  if (savedConfig) {
    config = { ...config, ...JSON.parse(savedConfig) };
  }
}

loadConfig();

async function retry(operation, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        originalLog(`[retry] All ${maxAttempts} attempts failed: ${error.message}`);
        return false;
      }
      const backoffDelay = delay * attempt;
      originalLog(`[retry] Attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${backoffDelay}ms...`);
      await sleep(backoffDelay);
    }
  }
}

function updateStatistics(deletedCount, duration) {
  const stats = state.statistics;
  stats.sessionsCount++;
  stats.totalVideosDeleted += deletedCount;
  stats.totalTimeSpent += duration;
  if (stats.totalVideosDeleted > 0) {
    stats.averageDeleteTime = stats.totalTimeSpent / stats.totalVideosDeleted;
  }
  localStorage.setItem('ytPlaylistCleanerStats', JSON.stringify(stats));
}

async function initializeScript() {
  if (document.getElementById("yt-playlist-cleaner-ui")) {
    return;
  }

  loadConfig();
  originalLog('Config loaded:', config);

  try {
    await new Promise((resolve) => {
      const checkYouTube = setInterval(() => {
        if (document.querySelector('ytd-app')) {
          clearInterval(checkYouTube);
          resolve();
        }
      }, 100);
    });

    await sleep(3000);
    const { progressBar, statusText, countdownText } = createFloatingUI();
    originalLog('UI initialized');

    if (config.firstTimeMessage === true) {
      originalLog('Showing welcome popup');
      showFirstTimeMessage();
      config.firstTimeMessage = false;
      saveConfig();
      originalLog('Welcome popup shown and config updated');
    }
  } catch (error) {
    originalLog('Error during initialization:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScript);
} else {
  initializeScript();
}
