// ==UserScript==
// @name         YT Playlist Cleaner
// @version      2.0
// @description  A handy tool to tidy up your YouTube playlists with custom settings and smart features
// @author       John-nata
// @match        http*://*.youtube.com/playlist*
// @match        http*://youtube.com/playlist*
// @run-at       document-idle
// @homepageURL  https://github.com/John-nata/YT-Playlist-Cleaner
// ==/UserScript==

// Main settings for the cleaner
let config = {
  threshold: 0,
  minDelay: 3,
  maxDelay: 7,
  maxDelete: 200,
  pauseAfter: 100,
  pauseDuration: 60,
  deletePrivate: false,
  shuffleDelete: false,
  autoScrollEvery: 10,
  darkMode: false,
  maxBatchSize: 10,
  batchPauseTime: 50,
  uiUpdateInterval: 100,
  // New feature: only delete unavailable (private/deleted) videos
  onlyUnavailable: false,
  // New feature: skip videos added within last N days (0 = disabled)
  deleteOlderThanDays: 0,
};

// Keeps track of what's happening during the clean-up
let state = {
  deletedCount: 0,
  totalVideos: 0,
  currentVideo: 0,
  skippedCount: 0,  // Track skipped videos for batch logging
  isPaused: false,
  isAutoPaused: false,
  pauseState: 'running',
  pauseNotificationId: null,  // Reference to persistent pause notification
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

// Check if it's first time and show welcome message
if (!localStorage.getItem('ytPlaylistCleanerFirstTime')) {
  window.addEventListener('load', () => {
    setTimeout(showFirstTimeMessage, 2000);
  });
}

// Add Trusted Types policy for innerHTML safety
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    window.trustedTypes.createPolicy('default', {
      createHTML: (string) => string
    });
  }

// Add this function
function showFirstTimeMessage() {
  // Create modal container
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

  // Create modal content
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
      <strong>Pro tip:</strong> For best results, try sorting your playlist by "Date added (oldest)" before cleaning. This way you'll clear out those old videos first!
    </p>
    <button style="
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

  // Add modal to page
  modal.appendChild(content);
  document.body.appendChild(modal);

  // Close modal on button click
  const button = content.querySelector('button');
  button.onclick = () => {
    modal.remove();
    localStorage.setItem('ytPlaylistCleanerFirstTime', 'false');
  };
}

// Note: App reference is now dynamically queried in waitForElement to avoid early return

// Helper function to pause for a bit
const sleep = (timeout) => new Promise((res) => setTimeout(res, timeout));

// Multi-language support for "Remove from Watch Later" string
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
  zh: ["删除", "从稍后观看中删除"],   // Simplified Chinese
  he: ["מחק", "מחק מהסט של צפייה בהמשך"],
  ar: ["إزالة", "إزالة من مشاهدة لاحقًا"],
  nl: ["Verwijderen", "Verwijderen van Later bekijken"],
  pl: ["Usuń", "Usuń z listy Do obejrzenia"],  // Polish
  tr: ["Sil", "Daha sonra izle listesinden kaldır"],  // Fixed: correct Turkish
  hu: ["Törlés", "Törlés a Később megnézéshez"],
  cs: ["Odstranit", "Odstranit z Přehrát později"],  // Fixed: complete Czech translation
  // New languages added
  sv: ["Ta bort", "Ta bort från Titta senare"],
  da: ["Slet", "Fjern fra Se senere"],  // Danish
  no: ["Slett", "Fjern fra Se senere"],  // Norwegian
  fi: ["Poista", "Poista Katso myöhemmin -luettelosta"],  // Finnish
  uk: ["Видалити", "Видалити зі списку «Переглянути пізніше»"],  // Ukrainian
  ro: ["Șterge", "Elimină din Vizionează mai târziu"],  // Romanian
  sk: ["Odstrániť", "Odstrániť zo zoznamu Pozrieť neskôr"],  // Slovak
  bg: ["Изтриване", "Премахване от Гледай по-късно"],  // Bulgarian
  hr: ["Izbriši", "Ukloni s popisa Pogledaj kasnije"],  // Croatian
  el: ["Διαγραφή", "Κατάργηση από το Παρακολούθηση αργότερα"],  // Greek
  ca: ["Suprimeix", "Suprimeix de Mira-ho més tard"],  // Catalan
  hi: ["हटाएं", "बाद में देखें से हटाएं"],  // Hindi
  th: ["ลบ", "นำออกจากดูภายหลัง"],  // Thai
  vi: ["Xóa", "Xóa khỏi danh sách Xem sau"],  // Vietnamese
  id: ["Hapus", "Hapus dari Tonton nanti"],  // Indonesian
  ms: ["Padam", "Alih keluar daripada Tonton kemudian"],  // Malay
  tl: ["Tanggalin", "Alisin sa Panoorin sa ibang pagkakataon"],  // Filipino/Tagalog
};

// Waits for something to show up on the page
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const app = document.querySelector("ytd-app");
    if (!app) {
      return reject(new Error("ytd-app not found"));
    }

    let timeoutId;

    // Keep an eye out for when it appears
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        clearTimeout(timeoutId);
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(app, {
      childList: true,
      subtree: true,
    });

    // Add timeout to prevent hanging forever
    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}
// Creates the main interface for the cleaner
function createFloatingUI() {
  // Check if UI already exists
  const existingUI = document.getElementById("yt-playlist-cleaner-ui");
  if (existingUI) {
    return {
      progressBar: existingUI.querySelector("progress"),
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

  // Add hover effect for elevation
  floatingUI.addEventListener('mouseenter', () => {
    floatingUI.style.boxShadow = '0 16px 48px rgba(255,0,0,0.15), 0 8px 24px rgba(0,0,0,0.12)';
    floatingUI.style.transform = 'translateY(-2px)';
  });
  floatingUI.addEventListener('mouseleave', () => {
    floatingUI.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)';
    floatingUI.style.transform = 'translateY(0)';
  });

  // Add a header with animated gradient background
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

  // Add gradient animation keyframes
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
  `;
  document.head.appendChild(styleSheet);

  const icon = document.createElement("div");
  icon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24">
    <path fill="#ffffff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
  </svg>`;
  icon.style.cssText = `
    display: flex;
    align-items: center;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
  `;

  const title = document.createElement("h3");
  title.textContent = "YT Playlist Cleaner";
  title.style.cssText = `
    margin: 0 0 0 10px;
    font-size: 15px;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: 0.3px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  `;

  // Status badge with glow effect
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
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.3);
  `;

  // Dark mode toggle in header
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
  darkModeToggle.addEventListener('mouseenter', () => {
    darkModeToggle.style.background = 'rgba(255,255,255,0.35)';
    darkModeToggle.style.transform = 'scale(1.1)';
  });
  darkModeToggle.addEventListener('mouseleave', () => {
    darkModeToggle.style.background = 'rgba(255,255,255,0.2)';
    darkModeToggle.style.transform = 'scale(1)';
  });
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

  // Scrollable content container
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
  const maxDeleteContainer = createInputContainer("Max videos to delete:", "maxDelete", "number", config.maxDelete, 1, Infinity);
  const pauseAfterContainer = createInputContainer("Pause after (videos):", "pauseAfter", "number", config.pauseAfter, 1, Infinity);

  const deleteButton = createButton("▶ Start Deleting", "#ff0000", true);
  const pauseResumeButton = createButton("⏸ Pause", "#606060", false);
  pauseResumeButton.id = "pause-resume-btn";

  const advancedOptionsToggle = createButton("⚙ Advanced Options", "transparent", false, true);
  advancedOptionsToggle.style.color = "#065fd4";
  advancedOptionsToggle.style.border = "1px solid #e0e0e0";
  const advancedOptions = createAdvancedOptions();
  advancedOptions.style.display = "none";

  // Styled progress container
  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = `
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e8e8e8;
  `;

  const progressBar = document.createElement("div");
  progressBar.style.cssText = `
    width: 100%;
    height: 8px;
    background: #e8e8e8;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  `;

  const progressFill = document.createElement("div");
  progressFill.className = "progress-fill";
  progressFill.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #ff0000 0%, #ff4444 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
  `;
  progressBar.appendChild(progressFill);

  const statusText = document.createElement("div");
  statusText.className = "status-text";
  statusText.style.cssText = `
    margin-top: 10px;
    font-size: 13px;
    color: #606060;
    font-weight: 500;
  `;

  const countdownText = document.createElement("div");
  countdownText.className = "countdown-text";
  countdownText.style.cssText = `
    margin-top: 6px;
    font-size: 12px;
    color: #909090;
  `;

  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(statusText);
  progressContainer.appendChild(countdownText);

  // Add all elements to content container
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
      // Show persistent pause notification
      state.pauseNotificationId = showPersistentNotification('⏸ Deletion paused. Click Resume to continue.', 'warning');
    } else {
      pauseResumeButton.innerHTML = "⏸ Pause";
      pauseResumeButton.style.background = "#606060";
      if (badge) {
        badge.textContent = "Running";
        badge.style.background = "rgba(46, 204, 113, 0.3)";
      }
      // Remove persistent pause notification
      removePersistentNotification(state.pauseNotificationId);
      state.pauseNotificationId = null;
    }
  });

  advancedOptionsToggle.addEventListener("click", function () {
    advancedOptions.style.display = advancedOptions.style.display === "none" ? "block" : "none";
  });

  makeDraggable(floatingUI, header);

  // Store progressFill reference for updates
  floatingUI.progressFill = progressFill;

  return { progressBar: progressFill, statusText, countdownText };
}

// Makes the interface draggable around the screen
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
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

// Sets up the advanced settings panel
function createAdvancedOptions() {
  const container = document.createElement("div");
  container.style.marginTop = "10px";
  container.style.padding = "10px";
  container.style.border = "1px solid #ccc";
  container.style.borderRadius = "5px";

  const thresholdContainer = createInputContainer("Threshold %:", "threshold", "number", config.threshold, 0, 100);
  const pauseDurationContainer = createInputContainer("Pause duration (s):", "pauseDuration", "number", config.pauseDuration, 1, 3600);
  const autoScrollContainer = createInputContainer("Auto-scroll every (videos):", "autoScrollEvery", "number", config.autoScrollEvery, 1, Infinity);
  // New feature: age-based deletion (0 = disabled)
  const ageFilterContainer = createInputContainer("Delete videos older than (days, 0=off):", "deleteOlderThanDays", "number", config.deleteOlderThanDays, 0, 9999);

  const deletePrivateCheckbox = createCheckbox("Delete private videos", "deletePrivate", config.deletePrivate);
  const shuffleDeleteCheckbox = createCheckbox("Shuffle delete order", "shuffleDelete", config.shuffleDelete);
  // New feature: only delete unavailable (private/deleted) videos
  const onlyUnavailableCheckbox = createCheckbox("Delete only unavailable videos (deleted/private)", "onlyUnavailable", config.onlyUnavailable);

  container.appendChild(thresholdContainer);
  container.appendChild(pauseDurationContainer);
  container.appendChild(autoScrollContainer);
  container.appendChild(ageFilterContainer);
  container.appendChild(deletePrivateCheckbox);
  container.appendChild(shuffleDeleteCheckbox);
  container.appendChild(onlyUnavailableCheckbox);

  return container;
}


function createInputContainer(labelText, id, type, value, min, max) {
  const container = document.createElement("div");
  container.style.cssText = `
    margin-bottom: 16px;
    position: relative;
  `;

  const label = document.createElement("label");
  label.textContent = labelText;
  label.style.cssText = `
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    color: #606060;
    font-weight: 500;
  `;

  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.value = value;
  input.min = min;
  input.max = max;
  input.className = 'yt-cleanser-input';
  input.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  `;

  container.appendChild(label);
  container.appendChild(input);
  return container;
}

// Creates tick boxes for yes/no options
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

// Creates nice-looking buttons
function createButton(text, bgColor, isPrimary = false, isOutline = false) {
  const button = document.createElement("button");
  button.innerHTML = text;
  const baseStyles = `
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
  button.style.cssText = baseStyles;

  // Add hover effects
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

// Updates the settings when changed
function updateConfigFromInputs() {
  config.threshold = parseInt(document.getElementById("threshold").value, 10);
  config.minDelay = parseInt(document.getElementById("minDelay").value, 10);
  config.maxDelay = parseInt(document.getElementById("maxDelay").value, 10);
  config.maxDelete = parseInt(document.getElementById("maxDelete").value, 10);
  config.pauseAfter = parseInt(document.getElementById("pauseAfter").value, 10);
  config.pauseDuration = parseInt(document.getElementById("pauseDuration").value, 10);
  config.autoScrollEvery = parseInt(document.getElementById("autoScrollEvery").value, 10);
  config.deletePrivate = document.getElementById("deletePrivate").checked;
  config.shuffleDelete = document.getElementById("shuffleDelete").checked;
  // New options
  config.onlyUnavailable = document.getElementById("onlyUnavailable").checked;
  config.deleteOlderThanDays = parseInt(document.getElementById("deleteOlderThanDays").value, 10) || 0;
  saveConfig();
}

// Gets all the videos from the playlist
function* getVideos() {
  // Cache the selector results
  const videoSelector = "ytd-playlist-video-renderer";
  let videos = Array.from(document.querySelectorAll(videoSelector));

  if (config.shuffleDelete) {
    videos = shuffleArray(videos);
  }

  // Use more efficient selectors and cache DOM queries
  for (const video of videos) {
    const titleEl = video.querySelector("#video-title");
    const progressEl = video.querySelector("ytd-thumbnail-overlay-resume-playback-renderer");
    const menuEl = video.querySelector("ytd-menu-renderer");

    // Skip invalid videos
    if (!titleEl || !menuEl) continue;

    // Get menu button with fallback selectors
    const menuButton = menuEl.querySelector("yt-icon-button#button") || menuEl.querySelector("button#button");
    if (!menuButton) {
      originalLog(`No menu button found for video: ${titleEl.innerText}`);
      continue;
    }

    // Detect unavailable videos (private/deleted)
    // YouTube marks these with specific badge text or title patterns
    const titleText = titleEl.innerText || "";

    // Check multiple indicators for unavailable videos:
    // 1. Badge element (usually contains "Private" or similar)
    const badgeEl = video.querySelector("yt-formatted-string.ytd-badge-supported-renderer, ytd-badge-supported-renderer");
    const badgeText = badgeEl?.textContent?.toLowerCase() || "";

    // 2. Thumbnail overlay (unavailable videos often have overlays)
    const thumbnailOverlay = video.querySelector("ytd-thumbnail-overlay-playability-renderer");
    const hasUnavailableOverlay = !!thumbnailOverlay;

    // 3. Check if title contains unavailable markers
    const titleLower = titleText.toLowerCase();
    const hasUnavailableTitle =
      titleLower.includes("[private") ||
      titleLower.includes("[deleted") ||
      titleLower.includes("private video") ||
      titleLower.includes("deleted video") ||
      titleLower.includes("video unavailable");

    const isUnavailable =
      badgeText.includes("private") ||
      badgeText.includes("deleted") ||
      hasUnavailableOverlay ||
      hasUnavailableTitle;

    // Extract date added for age-based filtering
    // In playlists, YouTube shows "Added" date in a specific location
    let dateAdded = null;
    let dateSource = "none";
    let dateText = "";

    // Strategy 1: Look for all text content and search for date patterns
    // This is more reliable than guessing selectors
    const allTextElements = video.querySelectorAll("span, yt-formatted-string");

    for (const el of allTextElements) {
      const text = el.textContent?.trim() || "";

      // Look for patterns that indicate "added" date:
      // German: "Hinzugefügt am", "vor X Tagen"
      // English: "Added", "ago"
      // Check if this text contains a relative date pattern
      if (text && (
        text.toLowerCase().includes('ago') ||
        text.toLowerCase().includes('vor') ||
        text.toLowerCase().includes('hinzugefügt') ||
        text.toLowerCase().includes('hace') ||
        text.toLowerCase().includes('il y a')
      )) {
        // Exclude view counts (contains "Aufrufe" or "views")
        if (!text.toLowerCase().includes('aufrufe') &&
            !text.toLowerCase().includes('views') &&
            !text.toLowerCase().includes('visualizaciones')) {
          dateText = text;
          dateSource = "text pattern search";
          dateAdded = parseRelativeDate(text);

          if (dateAdded) {
            break; // Found and parsed successfully
          }
        }
      }
    }

    // Only log date parsing issues when age filter is active and parsing fails
    if (config.deleteOlderThanDays > 0 && !dateAdded) {
      const videoIndex = Array.from(document.querySelectorAll("ytd-playlist-video-renderer")).indexOf(video);
      if (videoIndex < 3) {
        originalLog(`[Date Parse WARNING] Could not parse date for: "${titleText.substring(0, 30)}..."`);
        originalLog(`[Date Parse WARNING] Text found: "${dateText}" from source: ${dateSource}`);
      }
    }

    yield {
      container: video,
      title: titleText,
      progress: progressEl?.data?.percentDurationWatched ?? 0,
      menu: menuEl,
      menuButton: menuButton,
      isPrivate: badgeText === "private",
      isUnavailable: isUnavailable,
      dateAdded: dateAdded
    };
  }
}

// Parses relative date strings like "3 days ago" or "vor 3 Tagen" into a Date object
// Returns null if parsing fails
function parseRelativeDate(text) {
  if (!text) return null;

  const now = new Date();
  const lowerText = text.toLowerCase();

  // Match patterns in multiple languages
  // English: "3 days ago"
  // German: "vor 3 Tagen"
  // Pattern: (number) (unit) with various formats
  const patterns = [
    // English: "3 days ago", "3 day ago"
    /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i,
    // German: "vor 3 Tagen", "vor 3 Tag"
    /vor\s+(\d+)\s*(sekunde|minute|stunde|tag|woche|monat|jahr)(?:en)?/i,
    // Spanish: "hace 3 días"
    /hace\s+(\d+)\s*(segundo|minuto|hora|día|semana|mes|año)s?/i,
    // French: "il y a 3 jours"
    /il\s+y\s+a\s+(\d+)\s*(seconde|minute|heure|jour|semaine|mois|année)s?/i
  ];

  let match = null;
  for (const pattern of patterns) {
    match = lowerText.match(pattern);
    if (match) break;
  }

  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unitText = match[2].toLowerCase();

  // Map units to English for consistency
  const unitMap = {
    'second': 'second', 'sekunde': 'second', 'segundo': 'second', 'seconde': 'second',
    'minute': 'minute', 'minuto': 'minute',
    'hour': 'hour', 'stunde': 'hour', 'hora': 'hour', 'heure': 'hour',
    'day': 'day', 'tag': 'day', 'día': 'day', 'jour': 'day',
    'week': 'week', 'woche': 'week', 'semana': 'week', 'semaine': 'week',
    'month': 'month', 'monat': 'month', 'mes': 'month', 'mois': 'month',
    'year': 'year', 'jahr': 'year', 'año': 'year', 'année': 'year'
  };

  const unit = unitMap[unitText];
  if (!unit) return null;

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

// Checks if a video is old enough based on deleteOlderThanDays config
// Returns true if video should be deleted (is old enough or filter disabled)
function isVideoOldEnough(video) {
  if (config.deleteOlderThanDays <= 0) return true; // Filter disabled

  // IMPORTANT: If we can't determine age, DON'T delete (safer default)
  if (!video.dateAdded) {
    // Only log first few warnings to avoid spam
    if (state.skippedCount < 3) {
      originalLog(`[Age Filter WARNING] Can't determine age for: ${video.title.substring(0, 40)}... - SKIPPING for safety`);
    }
    return false;
  }

  const now = new Date();
  // Use Math.floor to treat partial days consistently (365.8 days = 365 days)
  const ageInDays = Math.floor((now - video.dateAdded) / (1000 * 60 * 60 * 24));
  // "older than X days" means STRICTLY older (> not >=)
  return ageInDays > config.deleteOlderThanDays;
}

// Shuffling logic (mixes up the order of videos
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Cleansing logic initializing the cleaning process and sets up the UI for tasks
async function cleanse(progressBar, statusText, countdownText) {
  showNotification("Starting cleanup - loading all videos...", 'info');
  state.deletedCount = 0;
  state.skippedCount = 0;  // Reset skip counter
  state.totalVideos = Array.from(getVideos()).length;
  state.currentVideo = 0;
  state.startTime = Date.now();
  state.pauseState = 'running';
  state.isAutoPaused = false;

  // Reset progress bar
  progressBar.style.width = '0%';

  // Initial scroll to bottom and back to top
  await autoScroll();
  await countdown(5, countdownText);

  let batchSize = 0;
  for (const video of getVideos()) {
    if (state.deletedCount >= config.maxDelete) {
      break;
    }

    // Process in batches to prevent UI freezes
    if (++batchSize >= 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      batchSize = 0;
    }

    // Handle manual pause
    while (state.isPaused) {
      if (state.pauseState !== 'pausing') {
        state.pauseState = 'pausing';
      }
      await sleep(1000);
    }
    if (state.pauseState === 'pausing') {
      state.pauseState = 'resuming';
      state.pauseState = 'running';
    }

    state.currentVideo++;

    // Check all deletion criteria
    const meetsThreshold = video.progress >= config.threshold;
    const meetsPrivateFilter = config.deletePrivate || !video.isPrivate;
    // New: unavailable filter - if enabled, only delete unavailable videos
    const meetsUnavailableFilter = !config.onlyUnavailable || video.isUnavailable;
    // New: age filter - only delete videos older than specified days
    const meetsAgeFilter = isVideoOldEnough(video);

    const willDelete = meetsThreshold && meetsPrivateFilter && meetsUnavailableFilter && meetsAgeFilter;

    if (willDelete) {
      try {
        await retry(() => deleteVideo(video, countdownText));
        state.deletedCount++;
      } catch (error) {
        // Only log detailed info on error
        let reasons = [];
        reasons.push(`${video.progress}% watched`);
        if (config.threshold > 0) reasons.push(`threshold: >=${config.threshold}%`);
        if (config.onlyUnavailable) reasons.push(video.isUnavailable ? 'is unavailable ✓' : 'is unavailable?');
        if (video.isPrivate) reasons.push('is private');
        if (config.deleteOlderThanDays > 0 && video.dateAdded) {
          const ageInDays = Math.floor((Date.now() - video.dateAdded) / (1000 * 60 * 60 * 24));
          reasons.push(`${ageInDays} days old (need >${config.deleteOlderThanDays})`);
        }
        const reasonStr = ` [${reasons.join(', ')}]`;
        originalLog(`✗ Failed to delete #${state.deletedCount + 1}: "${video.title.substring(0, 40)}..."${reasonStr}`);
        originalLog(`   Error: ${error.message}`);
        continue;
      }

      // Check for automatic pause after N deletions
      if (state.deletedCount % config.pauseAfter === 0 && state.deletedCount < config.maxDelete) {
        state.pauseState = 'pausing';
        state.isAutoPaused = true;

        state.pauseState = 'waiting';
        showNotification(`Auto-pause: waiting ${config.pauseDuration} seconds...`, 'info');
        await countdown(config.pauseDuration, countdownText);

        state.pauseState = 'resuming';
        state.isAutoPaused = false;

        state.pauseState = 'running';
      }

      if (state.deletedCount % config.autoScrollEvery === 0) {
        await autoScroll();
      }
    } else {
      // Skip silently - user doesn't need to see every skipped video
      state.skippedCount++;
    }

    // Update progress bar (now using percentage-based width)
    const progressPercent = (state.deletedCount / config.maxDelete) * 100;
    progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
    statusText.textContent = `Deleted: ${state.deletedCount} / ${config.maxDelete} target`;
  }

  // Shows the final results of the clean-up
  state.pauseState = 'running';
  const badge = document.getElementById("cleaner-status-badge");
  if (badge) {
    badge.textContent = "Done";
    badge.style.background = "rgba(46, 204, 113, 0.3)";
  }
  const endTime = Date.now();
  const duration = Math.round((endTime - state.startTime) / 1000);
  statusText.textContent = `✓ Completed: ${state.deletedCount} of ${config.maxDelete} target deleted (${state.totalVideos} in playlist)`;

  // If nothing was deleted, show helpful message
  if (state.deletedCount === 0 && state.totalVideos > 0) {
    let reasons = [];
    if (config.threshold > 0) {
      reasons.push(`Videos must be watched ${config.threshold}% or more`);
    }
    if (!config.deletePrivate) {
      reasons.push("Private videos are excluded");
    }
    if (config.onlyUnavailable) {
      reasons.push("Only unavailable (deleted/private) videos will be deleted");
    }
    if (config.deleteOlderThanDays > 0) {
      reasons.push(`Only videos older than ${config.deleteOlderThanDays} days`);
    }

    const reasonText = reasons.length > 0 ? "\n\nActive filters:\n• " + reasons.join("\n• ") : "";
    showNotification(`No videos were deleted. Check your filter settings.${reasonText}`, 'warning', 15000);
  } else {
    showSummaryNotification(state.totalVideos, state.deletedCount, state.skippedCount, duration);
  }

  updateStatistics(state.deletedCount, duration);
}

// Deletes a video from the playlist
// Returns true if deletion was successful, false otherwise
async function deleteVideo(video, countdownText) {
  let success = false;
  let error = null;

  try {
    if (!video.menuButton) {
      throw new Error('Menu button is null/undefined');
    }

    // Scroll video into view to ensure menu loads properly
    video.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300); // Wait for scroll and menu to be ready

    video.menuButton.click();
    const popup = await waitForElement("ytd-menu-popup-renderer", 5000);

    // Wait for the menu items to load
    await sleep(500);

    const menuItems = Array.from(popup.querySelectorAll("ytd-menu-service-item-renderer"));

    const deleteButton = menuItems.find((item) => {
      // Get text content and normalize it
      const text = item.textContent.toLowerCase().trim().replace(/\s+/g, ' ');

      // First, try exact matches from the deleteButtonTexts dictionary
      const allDeleteTexts = Object.values(deleteButtonTexts).flat();
      for (const buttonText of allDeleteTexts) {
        const normalizedButtonText = buttonText.toLowerCase().trim();
        if (text.includes(normalizedButtonText)) {
          return true;
        }
      }

      // Fallback: Check for generic "remove from playlist" patterns
      // These patterns work for ANY playlist name (e.g., "aus 'dust' entfernen", "remove from My Playlist")

      // German: "aus ... entfernen" - matches any playlist name
      if (/aus\s+[""']?.+?[""']?\s+entfernen/i.test(text)) {
        return true;
      }

      // English: "remove from ..." - matches any playlist name
      if (/remove\s+from\s+.+/i.test(text)) {
        return true;
      }

      // Spanish: "eliminar de ..." or "quitar de ..."
      if (/(eliminar|quitar)\s+de\s+.+/i.test(text)) {
        return true;
      }

      // French: "supprimer de ..." or "retirer de ..."
      if (/(supprimer|retirer)\s+de\s+.+/i.test(text)) {
        return true;
      }

      // Simple fallback: just "delete" or "remove" with "playlist" somewhere
      const hasDeleteWord = /\b(löschen|delete)\b/i.test(text);
      const hasRemoveWord = /\b(remove|entfernen)\b/i.test(text);
      const hasPlaylistWord = /\b(playlist|liste|lista|список|再生リスト|wiedergabe)\b/i.test(text);

      if ((hasDeleteWord || hasRemoveWord) && hasPlaylistWord) {
        return true;
      }

      return false;
    });

    if (deleteButton) {
      deleteButton.click();
      state.consecutiveErrors = 0;
      success = true;
    } else {
      // Only log menu details when delete button is NOT found
      originalLog(`✗ Delete button not found for: ${video.title.substring(0, 40)}...`);
      originalLog(`[deleteVideo ERROR] Menu has ${menuItems.length} items:`);
      menuItems.forEach((item, idx) => {
        const text = item.textContent.toLowerCase().trim().replace(/\s+/g, ' ');
        originalLog(`  [${idx}] "${text.substring(0, 80)}"`);
      });

      state.consecutiveErrors++;

      if (state.consecutiveErrors >= 3) {
        const waitTime = Math.min(30 * state.consecutiveErrors, 300); // Max 5 minutes
        showNotification(`Too many errors. Waiting ${waitTime} seconds...`, 'warning');
        await countdown(waitTime, countdownText);
      }

      error = new Error('Delete button not found');
    }
  } catch (err) {
    originalLog(`✗ Error deleting video: ${err.message}`);
    state.lastErrorTime = Date.now();
    error = err;
  }

  // Always execute random delay, even on error
  const randomDelay = Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay;
  await countdown(randomDelay, countdownText);

  // Propagate error if deletion failed
  if (error) {
    throw error;
  }

  return success;
}

// Scrolls through the playlist to load all videos
let isScrolling = false;
async function autoScroll() {
  // Prevent duplicate scroll operations
  if (isScrolling) {
    return;
  }

  isScrolling = true;
  try {
    let previousHeight = 0;
    let currentHeight = document.documentElement.scrollHeight;
    let noChangeCount = 0;
    let iteration = 0;
    const maxIterations = 50; // Safety limit

    // Keep scrolling until no new content loads
    while (noChangeCount < 3 && iteration < maxIterations) {
      iteration++;
      previousHeight = currentHeight;

      // Scroll to bottom
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });

      // Wait for YouTube to load new content
      await sleep(800);

      // Check if new content was loaded
      currentHeight = document.documentElement.scrollHeight;

      if (currentHeight === previousHeight) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
      }
    }

    if (iteration >= maxIterations) {
      originalLog(`[autoScroll WARNING] Reached max iterations (${maxIterations}), may not have loaded all videos`);
    }

    // Return to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    await sleep(500);

    const finalCount = document.querySelectorAll('ytd-playlist-video-renderer').length;
    originalLog(`Loaded ${finalCount} videos from playlist`);
  } finally {
    isScrolling = false;
  }
}

// Shows a countdown between actions
async function countdown(seconds, countdownText) {
  for (let i = seconds; i > 0; i--) {
    countdownText.textContent = `Next action in: ${i} seconds`;
    await sleep(1000);
  }
  countdownText.textContent = '';
}

// Shows the final results of the clean-up
function showSummaryNotification(totalProcessed, deleted, skipped, duration) {
  const message = `
    Summary:
    Total videos processed: ${totalProcessed}
    Deleted: ${deleted}
    Skipped: ${skipped}
    Time taken: ${duration} seconds
  `;
  showNotification(message, 'info', 10000); // Show for 10 seconds
}

// Sets up the notification system
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

// Shows a persistent notification that stays until manually removed
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
    backdrop-filter: blur(8px);
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

// Removes a persistent notification by ID
function removePersistentNotification(id) {
  if (!id) return;
  const notification = document.getElementById(id);
  if (notification) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(20px)';
    setTimeout(() => notification.remove(), 300);
  }
}

// Shows a notification with an optional progress bar
function showNotification(message, type = 'info', duration = 5000) {
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
    backdrop-filter: blur(8px);
    animation: slideIn 0.3s forwards, fadeOut 0.3s ${duration - 300}ms forwards;
  `;

  const colors = {
    info: 'rgba(6, 95, 212, 0.95)',
    warning: 'rgba(243, 156, 18, 0.95)',
    error: 'rgba(231, 76, 60, 0.95)',
    success: 'rgba(46, 204, 113, 0.95)'
  };

  notification.style.backgroundColor = colors[type];

  // Add icon
  const icon = document.createElement('div');
  icon.innerHTML = getNotificationIcon(type);
  icon.style.flexShrink = '0';

  // Add message with possible HTML
  const messageContainer = document.createElement('div');
  messageContainer.style.flex = '1';
  messageContainer.innerHTML = message;

  // Add progress bar
  const progress = document.createElement('div');
  progress.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    width: 100%;
    background: rgba(255, 255, 255, 0.3);
  `;

  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 100%;
    width: 100%;
    background: rgba(255, 255, 255, 0.7);
    transform-origin: left;
    animation: shrink ${duration}ms linear forwards;
  `;

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'yt-cleanser-close-btn';
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

  closeButton.onclick = () => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(20px)';
    setTimeout(() => notification.remove(), 300);
  };

  progress.appendChild(progressBar);
  notification.appendChild(icon);
  notification.appendChild(messageContainer);
  notification.appendChild(closeButton);
  notification.appendChild(progress);
  container.appendChild(notification);

  // Add CSS animations only once
  if (!document.getElementById('yt-cleanser-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'yt-cleanser-notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(20px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(20px);
          opacity: 0;
        }
      }

      @keyframes shrink {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }

      .yt-cleanser-input:focus {
        border-color: #065fd4 !important;
        outline: none;
      }

      .yt-cleanser-close-btn:hover {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Remove notification after duration
  setTimeout(() => {
    notification.remove();
  }, duration);
}

// Gets the icon for the notification
function getNotificationIcon(type) {
  const icons = {
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>`,
    error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
    </svg>`
  };
  return icons[type] || icons.info;
}

// Keep reference to original console methods for internal debug logging
const originalLog = console.log;

// Creates a progress bar for the UI
function createProgressBar() {
  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = `
    margin-top: 16px;
    background-color: #f8f8f8;
    border-radius: 8px;
    overflow: hidden;
  `;

  const progressBar = document.createElement("div");
  progressBar.style.cssText = `
    width: 0%;
    height: 6px;
    background-color: #065fd4;
    transition: width 0.3s ease;
  `;

  const statusText = document.createElement("div");
  statusText.style.cssText = `
    margin-top: 8px;
    font-size: 13px;
    color: #606060;
    display: flex;
    justify-content: space-between;
  `;

  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(statusText);
  return { progressContainer, progressBar, statusText };
}

// Toggles the dark mode, obviously
function toggleDarkMode() {
  config.darkMode = !config.darkMode;
  updateTheme();
}

// Updates the UI theme
function updateTheme() {
  const ui = document.getElementById("yt-playlist-cleaner-ui");
  const content = document.getElementById("cleaner-content");
  if (!ui) return;

  if (config.darkMode) {
    // Dark mode styles
    ui.style.background = 'linear-gradient(145deg, #1a1a1a 0%, #222222 100%)';
    ui.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)';

    if (content) {
      content.style.background = '#1a1a1a';
    }

    // Update input fields
    ui.querySelectorAll('input').forEach(input => {
      input.style.background = '#2a2a2a';
      input.style.color = '#ffffff';
      input.style.border = '1px solid #404040';
    });

    // Update labels
    ui.querySelectorAll('label').forEach(label => {
      label.style.color = '#b0b0b0';
    });

    // Update status text
    const statusText = ui.querySelector('.status-text');
    if (statusText) statusText.style.color = '#b0b0b0';

    const countdownText = ui.querySelector('.countdown-text');
    if (countdownText) countdownText.style.color = '#808080';

    // Update progress bar background
    const progressBar = ui.querySelector('.progress-fill')?.parentElement;
    if (progressBar) progressBar.style.background = '#333333';

    // Update advanced options border
    const advOptions = ui.querySelector('div[style*="border: 1px solid"]');
    if (advOptions) {
      advOptions.style.borderColor = '#404040';
      advOptions.style.background = '#222222';
    }

  } else {
    // Light mode styles
    ui.style.background = 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)';
    ui.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)';

    if (content) {
      content.style.background = 'transparent';
    }

    // Reset input fields
    ui.querySelectorAll('input').forEach(input => {
      input.style.background = '#ffffff';
      input.style.color = '#030303';
      input.style.border = '1px solid #e0e0e0';
    });

    // Reset labels
    ui.querySelectorAll('label').forEach(label => {
      label.style.color = '#606060';
    });

    // Reset status text
    const statusText = ui.querySelector('.status-text');
    if (statusText) statusText.style.color = '#606060';

    const countdownText = ui.querySelector('.countdown-text');
    if (countdownText) countdownText.style.color = '#909090';

    // Reset progress bar background
    const progressBar = ui.querySelector('.progress-fill')?.parentElement;
    if (progressBar) progressBar.style.background = '#e8e8e8';

    // Reset advanced options
    const advOptions = ui.querySelector('div[style*="border: 1px solid"]');
    if (advOptions) {
      advOptions.style.borderColor = '#ccc';
      advOptions.style.background = 'transparent';
    }
  }

  // Save the theme preference
  saveConfig();
}

// Saves the current configuration
function saveConfig() {
  localStorage.setItem('ytPlaylistCleanerConfig', JSON.stringify(config));
}

// Loads saved settings
function loadConfig() {
  const savedConfig = localStorage.getItem('ytPlaylistCleanerConfig');
  if (savedConfig) {
    config = { ...config, ...JSON.parse(savedConfig) };
  }
}

// Retry mechanism for failed operations
async function retry(operation, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            await sleep(delay * attempt);
            // Only show notification on last retry before failure
            if (attempt === maxAttempts - 1) {
                showNotification(`Retrying operation (last attempt)...`, 'warning');
            }
        }
    }
}

// Keeps track of usage statistics
function updateStatistics(deletedCount, duration) {
    const stats = state.statistics;
    stats.sessionsCount++;
    stats.totalVideosDeleted += deletedCount;
    stats.totalTimeSpent += duration;
    stats.averageDeleteTime = stats.totalVideosDeleted > 0 ? stats.totalTimeSpent / stats.totalVideosDeleted : 0;

    localStorage.setItem('ytPlaylistCleanerStats', JSON.stringify(stats));
}

// Modify the initializeScript function
async function initializeScript() {
  // Check if already initialized
  if (document.getElementById("yt-playlist-cleaner-ui")) {
    return;
  }

  // Load config first
  loadConfig();

  try {
    // Wait for YouTube to be fully loaded
    await new Promise((resolve) => {
      const checkYouTube = setInterval(() => {
        if (document.querySelector('ytd-app')) {
          clearInterval(checkYouTube);
          resolve();
        }
      }, 100);
    });

    // Add a longer delay to ensure YouTube's UI is stable
    await sleep(3000);

    // Initialize UI
    const { progressBar, statusText, countdownText } = createFloatingUI();
    showNotification('YT Playlist Cleaner is ready!', 'info');

    // Check for first time message
    if (config.firstTimeMessage === true) {
      showFirstTimeMessage();

      // Update config after showing popup
      config.firstTimeMessage = false;
      saveConfig();
    }
  } catch (error) {
    originalLog('Error during initialization:', error);
    showNotification('Error initializing YT Playlist Cleaner', 'error');
  }
}

// Move script initialization to after DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScript);
} else {
  initializeScript();
}
