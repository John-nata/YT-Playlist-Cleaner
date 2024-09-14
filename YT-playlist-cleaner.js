// ==UserScript==
// @name         YT Playlist Cleaner
// @version      1.2.0
// @description  YouTube playlist cleaner with customizable settings, auto-scroll functionality, and improved UI
// @author       John-nata
// @match        http*://*.youtube.com/playlist*
// @match        http*://youtube.com/playlist*
// @run-at       document-idle
// @homepageURL  https://github.com/John-nata/Youtube-Playlist-Cleaner/
// ==/UserScript==

let config = {
  threshold: 0,
  minDelay: 2,
  maxDelay: 7,
  maxDelete: 200,
  pauseAfter: 100,
  pauseDuration: 60,
  deletePrivate: false,
  shuffleDelete: false,
  autoScrollEvery: 10, // Auto-scroll every 10 videos deleted
};

let state = {
  deletedCount: 0,
  totalVideos: 0,
  currentVideo: 0,
  isPaused: false,
  startTime: null,
};

const app = document.querySelector("ytd-app");
if (!app) return;

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
};

function waitForElement(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

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

function createFloatingUI() {
  const floatingUI = document.createElement("div");
  floatingUI.id = "yt-playlist-cleaner-ui";
  floatingUI.style.position = "fixed";
  floatingUI.style.top = "20px";
  floatingUI.style.right = "20px";
  floatingUI.style.backgroundColor = "#fff";
  floatingUI.style.border = "1px solid #ccc";
  floatingUI.style.borderRadius = "5px";
  floatingUI.style.padding = "10px";
  floatingUI.style.zIndex = "9999";
  floatingUI.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  floatingUI.style.width = "300px";
  floatingUI.style.resize = "both";
  floatingUI.style.overflow = "auto";
  floatingUI.style.minWidth = "250px";
  floatingUI.style.minHeight = "200px";

  const title = document.createElement("h3");
  title.textContent = "YT Playlist Cleaner";
  title.style.marginTop = "0";
  title.style.marginBottom = "10px";
  title.style.cursor = "move";

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

  floatingUI.appendChild(title);
  floatingUI.appendChild(minDelayContainer);
  floatingUI.appendChild(maxDelayContainer);
  floatingUI.appendChild(maxDeleteContainer);
  floatingUI.appendChild(pauseAfterContainer);
  floatingUI.appendChild(deleteButton);
  floatingUI.appendChild(pauseResumeButton);
  floatingUI.appendChild(advancedOptionsToggle);
  floatingUI.appendChild(advancedOptions);
  floatingUI.appendChild(progressContainer);

  document.body.appendChild(floatingUI);

  deleteButton.addEventListener("click", function () {
    updateConfigFromInputs();
    cleanse(progressBar, statusText, countdownText);
  });

  pauseResumeButton.addEventListener("click", function () {
    state.isPaused = !state.isPaused;
    pauseResumeButton.textContent = state.isPaused ? "Resume" : "Pause";
  });

  advancedOptionsToggle.addEventListener("click", function () {
    advancedOptions.style.display = advancedOptions.style.display === "none" ? "block" : "none";
  });

  makeDraggable(floatingUI, title);

  return { progressBar, statusText, countdownText };
}

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
  container.style.marginBottom = "10px";

  const label = document.createElement("label");
  label.textContent = labelText;
  label.style.display = "block";
  label.style.marginBottom = "5px";

  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.value = value;
  input.min = min;
  input.max = max;
  input.style.width = "100%";

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

function createButton(text, bgColor) {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.padding = "8px";
  button.style.backgroundColor = bgColor;
  button.style.color = "white";
  button.style.border = "none";
  button.style.borderRadius = "3px";
  button.style.cursor = "pointer";
  button.style.marginRight = "10px";
  button.style.marginBottom = "10px";
  return button;
}

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
}

function* getVideos() {
  let videos = Array.from(document.querySelectorAll("ytd-playlist-video-renderer"));

  if (config.shuffleDelete) {
    videos = shuffleArray(videos);
  }

  for (const video of videos) {
    const title = video.querySelector("#video-title").innerText;
    const progress = video.querySelector("ytd-thumbnail-overlay-resume-playback-renderer")?.data.percentDurationWatched ?? 0;
    const menu = video.querySelector("ytd-menu-renderer");
    const menuButton = menu.querySelector("yt-icon-button#button");
    const isPrivate = video.querySelector("yt-formatted-string.ytd-badge-supported-renderer")?.textContent.toLowerCase() === "private";

    yield {
      container: video,
      title,
      progress,
      menu,
      menuButton,
      isPrivate,
    };
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

  for (const video of getVideos()) {
    if (state.deletedCount >= config.maxDelete) {
      console.log("Reached maximum delete limit. Stopping.");
      break;
    }

    while (state.isPaused) {
      await sleep(1000);
    }

    console.log(`${video.title} (${video.progress}%)`);
    state.currentVideo++;

    if ((video.progress >= config.threshold) && (config.deletePrivate || !video.isPrivate)) {
      console.log("  Deleting...");
      await deleteVideo(video, countdownText);
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

  const endTime = Date.now();
  const duration = Math.round((endTime - state.startTime) / 1000); // in seconds, rounded
  console.log(`Done! Deleted ${state.deletedCount} videos in ${duration} seconds`);
  statusText.textContent = `Completed! Deleted ${state.deletedCount} out of ${state.totalVideos} videos in ${duration} seconds.`;

  showSummaryNotification(state.totalVideos, state.deletedCount, state.totalVideos - state.deletedCount, duration);
}

async function deleteVideo(video, countdownText) {
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
    showNotification(`Removing video: ${video.title}`, 'info');
  } else {
    showNotification(`Remove button not found. Skipping video: ${video.title}`, 'warning');
    console.warn("Remove button not found. Available menu items:", menuItems.map(item => item.textContent));
    return;
  }

  const randomDelay = Math.floor(Math.random() * (config.maxDelay - config.minDelay + 1)) + config.minDelay;
  await countdown(randomDelay, countdownText);
}

async function autoScroll() {
  const scrollHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight
  );

  // Scroll to bottom
  window.scrollTo(0, scrollHeight);
  await sleep(2000); // Give time for new videos to load

  // Scroll back to top
  window.scrollTo(0, 0);
  await sleep(1000); // Short pause at the top
}

async function countdown(seconds, countdownText) {
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
  showNotification(message, 'info', 10000); // Show for 10 seconds
}

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'yt-cleanser-notifications';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '300px';
  container.style.zIndex = '9999';
  document.body.appendChild(container);
  return container;
}

function showNotification(message, type = 'info', duration = 5000) {
  const container = document.getElementById('yt-cleanser-notifications') || createNotificationContainer();
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.padding = '10px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '5px';
  notification.style.color = '#fff';
  notification.style.fontSize = '14px';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

  switch(type) {
    case 'info':
      notification.style.backgroundColor = '#3498db';
      break;
    case 'warning':
      notification.style.backgroundColor = '#f39c12';
      break;
    case 'error':
      notification.style.backgroundColor = '#e74c3c';
      break;
  }

  container.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => {
      container.removeChild(notification);
    }, 500);
  }, duration);
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
