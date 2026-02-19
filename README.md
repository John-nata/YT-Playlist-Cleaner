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

## What's New in **v2.0** (2026‑02‑09) 

Now at **v2.0.4** (2026‑02‑19) — incremental fixes, optimisations, and UI refinements. [See full changelog ›](https://github.com/John-nata/YT-Playlist-Cleaner/blob/main/changelog.md)

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
  minDelay: 2,               // Min seconds between deletions
  maxDelay: 12,               // Max seconds between deletions
  maxDelete: 400,            // Max videos to delete per session
  pauseAfter: 100,           // Pause after N deletions
  pauseDuration: 60,         // Pause duration in seconds
  shuffleDelete: false,      // Randomize deletion order
  autoScrollEvery: 25,       // Auto-scroll every N deletions
  darkMode: false,           // Dark theme
  onlyUnavailable: false,    // NEW: Only delete [Private]/[Deleted] videos
  deleteOlderThanDays: 0,    // NEW: Skip videos newer than N days (0 = off)
};
```

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
