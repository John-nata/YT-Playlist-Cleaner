// ==UserScript==
// @name         YT Playlist Cleaner
// @version      1.6
// @description  A handy tool to tidy up your YouTube playlists with custom settings and smart features
// @author       John-nata
// @match        http*://*.youtube.com/playlist*
// @match        http*://youtube.com/playlist*
// @run-at       document-idle
// @homepageURL  https://github.com/John-nata/Youtube-Playlist-Cleaner/
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
};

// Keeps track of what's happening during the clean-up
let state = {
  deletedCount: 0,
  totalVideos: 0,
  currentVideo: 0,
  isPaused: false,
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

// Grab the YouTube app element - if it's not there, we'll pack it in
const app = document.querySelector("ytd-app");
if (!app) return;

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
  zh: ["删除", "从稍后观看中删除"],
  he: ["מחק", "מחק מהסט של צפייה בהמשך"],
  ar: ["إزالة", "إزالة من مشاهدة لاحقًا"],
  nl: ["Verwijderen", "Verwijderen van Later bekijken"],
  pl: ["Usuń", "Usuń z listy "],
  tr: ["Sil", "Silinecek listeye ekle"],
  hu: ["Törlés", "Törlés a Később megnézéshez"],
  cs: ["Odstranit", "Odstranit z listy "],
  // ... other languages ...
};

// Waits for something to show up on the page
function waitForElement(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    // Keep an eye out for when it appears
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(app, {
      childList: true,
      subtree: true,
    });
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
    background-color: #ffffff;
    border: none;
    border-radius: 12px;
    padding: 16px;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    width: 320px;
    resize: both;
    overflow: auto;
    min-width: 280px;
    min-height: 200px;
    font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
  `;

  // Add a header with icon
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    cursor: move;
  `;

  const icon = document.createElement("div");
  icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="#FF0000" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
  </svg>`;

  const title = document.createElement("h3");
  title.textContent = "YT Playlist Cleaner";
  title.style.cssText = `
    margin: 0 0 0 8px;
    font-size: 18px;
    font-weight: 500;
    color: #030303;
  `;

  header.appendChild(icon);
  header.appendChild(title);
  floatingUI.appendChild(header);

  const minDelayContainer = createInputContainer("Min Delay (s):", "minDelay", "number", config.minDelay, 1, 60);
  const maxDelayContainer = createInputContainer("Max Delay (s):", "maxDelay", "number", config.maxDelay, 1, 60);
  const maxDeleteContainer = createInputContainer("Max videos to delete:", "maxDelete", "number", config.maxDelete, 1, Infinity);
  const pauseAfterContainer = createInputContainer("Pause after (videos):", "pauseAfter", "number", config.pauseAfter, 1, Infinity);

  const deleteButton = createButton("Start Deleting", "#ff0000");
  const pauseResumeButton = createButton("Pause", "#f39c12");

  const advancedOptionsToggle = createButton("Advanced Options", "#3498db");
  const advancedOptions = createAdvancedOptions();
  advancedOptions.style.display = "none";

  const progressContainer = document.createElement("div");
  progressContainer.style.marginTop = "10px";

  const progressBar = document.createElement("progress");
  progressBar.style.width = "100%";
  progressBar.style.height = "20px";

  const statusText = document.createElement("div");
  statusText.style.marginTop = "5px";
  statusText.style.fontSize = "12px";

  const countdownText = document.createElement("div");
  countdownText.style.marginTop = "5px";
  countdownText.style.fontSize = "12px";

  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(statusText);
  progressContainer.appendChild(countdownText);

  floatingUI.appendChild(minDelayContainer);
  floatingUI.appendChild(maxDelayContainer);
  floatingUI.appendChild(maxDeleteContainer);
  floatingUI.appendChild(pauseAfterContainer);
  floatingUI.appendChild(deleteButton);
  floatingUI.appendChild(pauseResumeButton);
  floatingUI.appendChild(advancedOptionsToggle);
  floatingUI.appendChild(advancedOptions);
  floatingUI.appendChild(progressContainer);

  // Add dark mode toggle
  const darkModeToggle = document.createElement("button");
  darkModeToggle.textContent = '🌓';
  darkModeToggle.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    background: none;
    border: none;
    font-size: 16px;
  `;

  darkModeToggle.addEventListener('click', () => {
    config.darkMode = !config.darkMode;
    updateTheme();
  });

  floatingUI.appendChild(darkModeToggle);

  document.body.appendChild(floatingUI);

  deleteButton.addEventListener("click", function () {
    updateConfigFromInputs();
    cleanse(progressBar, statusText, countdownText);
  });

  pauseResumeButton.addEventListener("click", function () {
    state.isPaused = !state.isPaused;
    console.log(`Pause state changed: ${state.isPaused}`);
    pauseResumeButton.textContent = state.isPaused ? "Resume" : "Pause";
  });

  advancedOptionsToggle.addEventListener("click", function () {
    advancedOptions.style.display = advancedOptions.style.display === "none" ? "block" : "none";
  });

  makeDraggable(floatingUI, title);

  return { progressBar, statusText, countdownText };
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

  const deletePrivateCheckbox = createCheckbox("Delete private videos", "deletePrivate", config.deletePrivate);
  const shuffleDeleteCheckbox = createCheckbox("Shuffle delete order", "shuffleDelete", config.shuffleDelete);

  container.appendChild(thresholdContainer);
  container.appendChild(pauseDurationContainer);
  container.appendChild(autoScrollContainer);
  container.appendChild(deletePrivateCheckbox);
  container.appendChild(shuffleDeleteCheckbox);

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
  input.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
    &:focus {
      border-color: #065fd4;
      outline: none;
    }
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
function createButton(text, bgColor) {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.cssText = `
    padding: 10px 16px;
    background-color: ${bgColor};
    color: white;
    border: none;
    border-radius: 18px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    margin-right: 12px;
    margin-bottom: 12px;
    transition: opacity 0.2s, transform 0.2s;
    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    &:active {
      transform: translateY(1px);
    }
  `;
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
  saveConfig();
}

// Gets all the videos from the playlist
function* getVideos() {
  // Cache the selector results
  const videoSelector = "ytd-playlist-video-renderer";
  const videos = Array.from(document.querySelectorAll(videoSelector));

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

    yield {
      container: video,
      title: titleEl.innerText,
      progress: progressEl?.data?.percentDurationWatched ?? 0,
      menu: menuEl,
      menuButton: menuEl.querySelector("yt-icon-button#button"),
      isPrivate: video.querySelector("yt-formatted-string.ytd-badge-supported-renderer")
        ?.textContent.toLowerCase() === "private"
    };
  }
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
  console.log("Cleansing...");
  state.deletedCount = 0;
  state.totalVideos = Array.from(getVideos()).length;
  state.currentVideo = 0;
  state.startTime = Date.now();

  // Set the maximum value for progressBar to config.maxDelete
  progressBar.max = config.maxDelete;
  progressBar.value = 0;

  // Initial scroll to bottom and back to top
  await autoScroll();
  console.log("Initial scroll completed. Waiting for 5 seconds...");
  await countdown(5, countdownText);

  let batchSize = 0;
  for (const video of getVideos()) {
    if (state.deletedCount >= config.maxDelete) break;

    // Process in batches to prevent UI freezes
    if (++batchSize >= 10) {
      await new Promise(resolve => setTimeout(resolve, 50));
      batchSize = 0;
    }

    while (state.isPaused) {
      console.log("Deletion paused...");
      await sleep(1000);
    }
    console.log("Resuming deletion...");

    console.log(`${video.title} (${video.progress}%)`);
    state.currentVideo++;

    if ((video.progress >= config.threshold) && (config.deletePrivate || !video.isPrivate)) {
      console.log("  Deleting...");
      await retry(() => deleteVideo(video, countdownText));
      state.deletedCount++;

      if (state.deletedCount % config.pauseAfter === 0) {
        console.log(`Pausing for ${config.pauseDuration} seconds after deleting ${config.pauseAfter} videos.`);
        await countdown(config.pauseDuration, countdownText);
      }

      if (state.deletedCount % config.autoScrollEvery === 0) {
        await autoScroll();
      }
    } else {
      console.log("  Skipping");
    }

    progressBar.value = state.deletedCount;
    statusText.textContent = `Progress: ${state.deletedCount}/${config.maxDelete} (Deleted: ${state.deletedCount})`;
  }

// Shows the final results of the clean-up
  const endTime = Date.now();
  const duration = Math.round((endTime - state.startTime) / 1000); // in seconds, rounded
  console.log(`Done! Deleted ${state.deletedCount} videos in ${duration} seconds`);
  statusText.textContent = `Completed! Deleted ${state.deletedCount} out of ${state.totalVideos} videos in ${duration} seconds.`;

  showSummaryNotification(state.totalVideos, state.deletedCount, state.totalVideos - state.deletedCount, duration);
  updateStatistics(state.deletedCount, duration);
}

// Deletes a video from the playlist
async function deleteVideo(video, countdownText) {
  try {
    video.menuButton.click();

    const popup = await waitForElement("ytd-menu-popup-renderer");

    // Wait for the menu items to load
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
      showNotification(`Removing video: ${video.title}`, 'info');
    } else {
      state.consecutiveErrors++;

      if (state.consecutiveErrors >= 3) {
        const waitTime = Math.min(30 * state.consecutiveErrors, 300); // Max 5 minutes
        showNotification(`Too many errors. Waiting ${waitTime} seconds...`, 'warning');
        await countdown(waitTime, countdownText);
      }

      throw new Error('Delete button not found');
    }
  } catch (error) {
    console.error(`Error deleting video: ${error.message}`);
    state.lastErrorTime = Date.now();
  }

  const randomDelay = Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay;
  await countdown(randomDelay, countdownText);
}

// Add debouncing for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Scrolls through the playlist to load all videos
const autoScroll = debounce(async () => {
  // Use more efficient scrolling
  const scrollStep = window.innerHeight;
  const maxScroll = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );

  // Scroll down in chunks
  for (let currentScroll = 0; currentScroll < maxScroll; currentScroll += scrollStep) {
    window.scrollTo({
      top: currentScroll,
      behavior: 'smooth'
    });
    await sleep(100); // Small pause between scrolls
  }

  // Return to top
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  await sleep(500);
}, 250);

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
    &:hover {
      opacity: 1;
    }
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

  // Add CSS animations
  const style = document.createElement('style');
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
  `;
  document.head.appendChild(style);

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

// Override console.log, console.warn, and console.error to show notifications
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function(...args) {
  showNotification(args.join(' '), 'info');
  originalLog.apply(console, args);
};

console.warn = function(...args) {
  showNotification(args.join(' '), 'warning');
  originalWarn.apply(console, args);
};

console.error = function(...args) {
  showNotification(args.join(' '), 'error');
  originalError.apply(console, args);
};

const { progressBar, statusText, countdownText } = createFloatingUI();
showNotification('YT Playlist Cleaner is ready!', 'info');

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
  if (!ui) return;

  if (config.darkMode) {
    ui.style.cssText += `
      background-color: #232323;
      color: #ffffff;
      border-color: #444444;
    `;

    // Update input fields
    ui.querySelectorAll('input').forEach(input => {
      input.style.cssText += `
        background-color: #333333;
        color: #ffffff;
        border: 1px solid #444444;
      `;
    });

    // Update buttons
    ui.querySelectorAll('button').forEach(button => {
      if (!button.style.backgroundColor.includes('rgb')) {  // Don't override colored buttons
        button.style.backgroundColor = '#444444';
      }
    });

    // Update notifications
    const notificationContainer = document.getElementById('yt-cleanser-notifications');
    if (notificationContainer) {
      notificationContainer.querySelectorAll('.notification').forEach(notification => {
        if (!notification.classList.contains('info') &&
            !notification.classList.contains('warning') &&
            !notification.classList.contains('error')) {
          notification.style.backgroundColor = '#333333';
        }
      });
    }
  } else {
    ui.style.cssText += `
      background-color: #ffffff;
      color: #000000;
      border-color: #cccccc;
    `;

    // Reset input fields
    ui.querySelectorAll('input').forEach(input => {
      input.style.cssText += `
        background-color: #ffffff;
        color: #000000;
        border: 1px solid #cccccc;
      `;
    });

    // Reset buttons
    ui.querySelectorAll('button').forEach(button => {
      if (!button.style.backgroundColor.includes('rgb')) {  // Don't override colored buttons
        button.style.backgroundColor = '#f0f0f0';
      }
    });
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

// Call loadConfig() when script starts
loadConfig();

// Retry mechanism for failed operations
async function retry(operation, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            await sleep(delay * attempt);
            showNotification(`Retrying operation (${attempt}/${maxAttempts})...`, 'warning');
        }
    }
}

// Keeps track of usage statistics
function updateStatistics(deletedCount, duration) {
    const stats = state.statistics;
    stats.sessionsCount++;
    stats.totalVideosDeleted += deletedCount;
    stats.totalTimeSpent += duration;
    stats.averageDeleteTime = stats.totalTimeSpent / stats.totalVideosDeleted;

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

  // Add debug logging
  console.log('Config loaded:', config);
  console.log('First time message status:', config.firstTimeMessage);

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

    console.log('UI initialized');

    // Check for first time message
    if (config.firstTimeMessage === true) {
      console.log('Showing welcome popup');
      showFirstTimeMessage();

      // Update config after showing popup
      config.firstTimeMessage = false;
      saveConfig();
      console.log('Welcome popup shown and config updated');
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Move script initialization to after DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScript);
} else {
  initializeScript();
}
