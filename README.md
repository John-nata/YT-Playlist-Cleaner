# YouTube Playlist Cleaner

## Overview

YouTube Playlist Cleaner is a userscript that helps you tidy up your YouTube playlists by automatically removing videos based on customisable settings. It now includes advanced features like batch processing, dark mode, and usage statistics for a better experience.

The development of this script was inspired by [@colejd's work](https://gist.github.com/astamicu/eb351ce10451f1a51b71a1287d36880f?permalink_comment_id=4489588#gistcomment-4489588).

This script has been further optimised with the help of Claude AI.

## Screenshot

![image](https://github.com/user-attachments/assets/93373b7a-6087-4336-b87d-86066c73c498)

## Installation

1. Install a userscript manager like Tampermonkey or Greasemonkey in your browser.
2. Click on the following link to install the script: [Install YouTube Playlist Cleaner](https://github.com/John-nata/YT-Playlist-Cleaner/raw/main/YT-playlist-cleaner.js)
3. The script will automatically run when you visit a YouTube playlist page.

## What's New in v2.0 (09/02/2026)

### ✨ New Features

-   **Unavailable video filter**  — Only delete private and deleted videos
-   **Age-based deletion**  — Skip videos added within the last N days
-   **17 new language translations**  — Swedish, Danish, Norwegian, Finnish, Ukrainian, Romanian, Slovak, Bulgarian, Croatian, Greek, Catalan, Hindi, Thai, Vietnamese, Indonesian, Malay, Filipino
-   **Persistent pause notification**  — Stays visble until Resume is clicked

### 🎨 Complete UI Redesign

-   **Modern interface**  with YouTube-native + Material Design blend
-   **Status badge**  showing real-time state (Ready → Running → Paused → Done)
-   **Hover lift effect**  with subtle red glow shadow
-   **Proper theme colors**  for all elements (inputs, labels, progress bar)
-   **Sun/moon icons**  that swap on toggle (🌙 ↔ ☀️)
-   **Glassmorphism-ish badge**  

### 🔧 Bug Fixes

-   **Fixed pause/resume logic**  — Proper state machine with corrct transition logging
-   **Fixed completion message**  — Now correctly shows "X of Y target deleted"
-   **Persistent pause notification**  — Stays visible until you click Resume
-   **Fixed Polish, Turkish, Czech translations**  that were incomplete

Full changelog [here](#changelog) 

---

## Features

- Automatically remove videos from YouTube playlists.
- Customisable settings for deletion criteria.
- Auto-scroll functionality to process large playlists.
- Pause and resume functionality.
- Configurable delays between deletions to avoid rate limiting.
- Dark mode for a cmfortable experience.

## Usage

1. Navigate to any YouTube playlist page.
2. The script will add a "YT Playlist Cleaner" window to the page.
3. Adjust the settings as desired
4. Click "Start Deleting" to begin the process.
5. Use the "Pause" and "Resume" buttons to control the cleansing process as needed.

## Configuration

Customise the script's default behaviour by modifying the `config` object in the script:

```javascript
let config = {
  threshold: 0,              // Min watched % to delete (0 = any)
  minDelay: 3,               // Min seconds between deletions
  maxDelay: 7,               // Max seconds between deletions
  maxDelete: 200,            // Max videos to delete per session
  pauseAfter: 100,           // Pause after N deletions
  pauseDuration: 60,         // Pause duration in seconds
  deletePrivate: false,      // Include private videos
  shuffleDelete: false,      // Randomize deletion order
  autoScrollEvery: 10,       // Auto-scroll every N deletions
  darkMode: false,           // Dark theme
  onlyUnavailable: false,    // NEW: Only delete [Private]/[Deleted] videos
  deleteOlderThanDays: 0,    // NEW: Skip videos newer than N days (0 = off)
};
```

## Changelog 

v2.0.2 (11/02/2026)
### 🐛 Bug Fixes
-   Fixed Early Stopping: Solved a critical issue where the script would stop after processing the first batch of videos due to YouTube's lazy loading. The script now intelligently scrolls and re-scans the playlist until the full deletion target is met.
-   Fixed Dark Mode Button: Resolved a conflict between the drag-and-drop system and the header buttons, which caused the Dark Mode toggle to be unresponsive or require over 3 clicks for some users.

### ✨ Improvements
-   Better Unavailable Video Handling: Removed the unreliable "Delete private videos" legacy option. Users should now use the "Delete only unavailable videos" filter, which covers both private and deleted videos accurately.
-   New Tooltip: Added a helper icon (ℹ️) next to the "Delete unavailable" option to remind users that they must enable "Show unavailable videos" in the YouTube playlist sidebar for the feature to detect them.

v2.0.1 (10/02/2026) (based on @zorak1103's commit)

### 🐛 Bug Fixes
-   Notification Spam: Suppressed video progress logs and auto-pause messages (console-only until next update)
-   waitForElement Crash: Fixed undefined `app` variable; added 5s timeout to prevent infinite waiting

### ⚡ Improvements
-   Error Handling: `deleteVideo` now distinguishes menu timeout vs. missing button; increments count only on success    
-   CSS/Input: Replaced invalid inline pseudo-classes with JS event listeners; added specific class names (e.g., `cleaner-input-threshold`)    
-   Logging: Retry/status logs moved to console with ✓/✗ indicators

v2.0.0 (2026-02-09)

### ✨ New Features

-   **Unavailable video filter**  — Only delete [Private video] or [Deleted video] entries
-   **Age-based deletion**  — Skip videos added within the last N days
-   **17 new language translations**  — 🇸🇪 Swedish, 🇩🇰 Danish, 🇳🇴 Norwegian, 🇫🇮 Finnish, 🇺🇦 Ukrainian, 🇷🇴 Romanian, 🇸🇰 Slovak, 🇧🇬 Bulgarian, 🇭🇷 Croatian, 🇬🇷 Greek, 🇪🇸 Catalan, 🇮🇳 Hindi, 🇹🇭 Thai, 🇻🇳 Vietnamese, 🇮🇩 Indonesian, 🇲🇾 Malay and 🇵🇭 Filipino

### 🎨 UI/UX Improvements

-   Complete redesign with YouTube/Material Design hybrid aesthetic
-   Animated gradient header with color shifting
-   Status badge with glassmorphism effect (Ready/Running/Paused/Done)
-   Dark mode toggle moved to header with 🌙/☀️ icons
-   Scrollable content area (max-height: 85vh)
-   Hover elevation effect with red glow shadow
-   Styled gradient progress bar
-   Buttons with hover lift and shadow effects

### 🐛 Bug Fixes

-   Fixed completion message showing wrong video count
-   Fixed skip notifications spamming the UI
-   Fixed pause/resume state machine with proper logging
-   Fixed dark mode not styling all elements correctly
-   Fixed Polish, Turkish, Czech incomplete translations
-   Fixed Chinese typo in translations

### 🔧 Technical

-   Added "skippedCount" state tracking
-   Added "pauseNotificationId" for persistent notification management
-   Skip reasons now log to console only via "originalLog"
-   Progress bar now uses CSS width instead of "<progress>" element

v1.6.0

### 🪛 Fixes

**Chrome Trusted Types Policy Issue**  
 - Resolved the `TrustedHTML` assignment error in Chrome by implementing a Trusted Types policy.  
  Credits to [@f0x4](https://github.com/f0x4) for the [fix](https://github.com/John-nata/YT-Playlist-Cleaner/issues/2)

**Pause/Resume Logic Update**  
 - Updated outdated logic for the pause/resume functionality to ensure smoother playlist management.
 - Enhanced logging for better debugging and user feedback during script execution.

v1.2.0 => v1.5.1

### 🔧 Improvements

**Error Handling**:
 - Smart pauses for excessive errors.
 - Progressive backoff for consecutive failures.
 - Detailed error messages for easier troubleshooting.

**Performance**:
 - Improved scrolling with debouncing.
 - More efficient DOM queries.
 - Lower memory usage during video processing.

**UI Enhancements**:
 - Upgraded notification system with animations and progress bars.
 - Responsive design and added close buttons for notifications.

### 💾 Technical Updates

**Configuration**:
 - User settings are now stored locally and persist between sessions.
 - Validation for configuration settings.

**Code Enhancements**:
 - Refactored video processing logic.
 - Robust error handling and proper initialisation sequence.

### 🐛 Bug Fixes
- Resolved scrolling issues on longer playlists.
- Fixed video deletion confirmation glitches.
- Addressed UI issues with large playlists.
- Eliminated memory leaks in notifications.
- Fix for multiple instances of the UI appearing.


## Compatibility

This script is designed to work on the following URLs:

-   `http*://*.youtube.com/playlist*`
-   `http*://youtube.com/playlist*`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This script is not affiliated with or endorsed by YouTube. Use it at your own risk and in compliance with YouTube's terms of service.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

----------

Happy playlist cleaning!
