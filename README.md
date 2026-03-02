# YouTube Playlist Cleaner

[Installation](#installation) · [Changelog](https://github.com/John-nata/YT-Playlist-Cleaner/blob/main/changelog.md) · [Features](#features) · [Configuration](#configuration) · [Support](#support)


## Overview

YouTube Playlist Cleaner is a userscript that helps you tidy up your YouTube playlists by automatically removing videos based on customisable settings. Version 2.0 introduces advanced features like batch processing, dark mode, unavailable-video filtering, age-based deletion rules, and 17 new language translations for a refined experience.

The development of this script was inspired by [@colejd's work](https://gist.github.com/astamicu/eb351ce10451f1a51b71a1287d36880f?permalink_comment_id=4489588#gistcomment-4489588).

This script has been further optimised with the help of Antigravity.

## Screenshot

![image](https://github.com/user-attachments/assets/93373b7a-6087-4336-b87d-86066c73c498)

## Installation

1. Install a userscript manager like Tampermonkey or Greasemonkey in your browser.
2. Click on the following link to install the script: [Install YouTube Playlist Cleaner]([https://github.com/John-nata/YT-Playlist-Cleaner/raw/main/YT-playlist-cleaner.js](https://github.com/John-nata/YT-Playlist-Cleaner/raw/refs/heads/main/YT-playlist-cleaner.user.js))
3. The script will automatically run when you visit a YouTube playlist page.

---

## Features

-   **Automatically remove videos** from YouTube playlists based on watch-percentage thresholds.    
-   **Unavailable video filter** — target only private and deleted videos.    
-   **Age-based deletion** — skip videos added within the last N days.    
-   **Batch processing** with configurable delays between deletions to avoid rate limiting.    
-   **Auto-scroll functionality** to process large playlists without manual intervention.    
-   **Pause and resume** with persistent state notifications.    
-   **Complete UI redesign** featuring dark mode, status badges, and YouTube-native Material Design theming.    
-   **Multi-language support** with 18 total translations.

Now at **v2.0.5** (2026‑03‑02) [See full changelog ›](https://github.com/John-nata/YT-Playlist-Cleaner/blob/main/changelog.md)

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
