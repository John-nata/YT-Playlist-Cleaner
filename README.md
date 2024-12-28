# YouTube Playlist Cleaner

## Overview

YouTube Playlist Cleaner is a userscript that helps you tidy up your YouTube playlists by automatically removing videos based on customisable settings. It now includes advanced features like batch processing, dark mode, and usage statistics for a better experience.

The development of this script was inspired by [@colejd's work](https://gist.github.com/astamicu/eb351ce10451f1a51b71a1287d36880f?permalink_comment_id=4489588#gistcomment-4489588).

This script has been further optimised with the help of Claude AI.

## Installation

1. Install a userscript manager like Tampermonkey or Greasemonkey in your browser.
2. Click on the following link to install the script: [Install YouTube Playlist Cleaner](https://github.com/John-nata/YT-Playlist-Cleaner/raw/main/YT-playlist-cleaner.js)
3. The script will automatically run when you visit a YouTube playlist page.

## What's New in v1.5.0 

### ✨ New Features
- **First-Time Welcome Message**: A friendly popup with tips for new users.
- **Dark Mode**: Tackle playlists comfortably at night.
- **Smart Retry System**: Automatically retries failed operations up to 3 times.
- **Usage Statistics**: Track cleaning sessions, videos deleted, and average processing time.
- **Batch Processing**: Processes videos in smaller batches to avoid browser issues.
- Improved error handling, performance, and UI responsiveness.
- Introduced batch processing, config persistence, and refactored code.
- Fixed scrolling, deletion, and notification issues.

Full changelog [here](#changelog) 

---

## Features

- Automatically remove videos from YouTube playlists.
- Customisable settings for deletion criteria.
- Auto-scroll functionality to process large playlists.
- Improved user interface with progress bar and status updates.
- Pause and resume functionality.
- Configurable delays between deletions to avoid rate limiting.
- First-time welcome message for new users.
- Usage statistics to track your progress.
- Dark mode for a comfortable experience.

## Screenshot

![image](https://github.com/user-attachments/assets/48dd8e03-d608-4a87-9dd6-3f67e3c77e15)

## Usage

1. Navigate to any YouTube playlist page.
2. The script will add a "Cleanse Playlist" button to the page.
3. Click the button to open the settings panel.
4. Adjust the settings as desired:
 - Threshold: Minimum watched percentage for deletion.
 - Max Delete: Maximum number of videos to delete.
 - Delete Private: Choose whether to delete private videos.
 - Pause After: Number of deletions before pausing.
 - Pause Duration: Duration of pause in seconds.
 - Auto-scroll Every: Frequency of auto-scrolling.
 - Min/Max Delay: Range for random delay between deletions.
5. Click "Start Cleansing" to begin the process.
6. Use the "Pause" and "Resume" buttons to control the cleansing process as needed.

## Configuration

Customise the script's default behaviour by modifying the `config` object in the script:

```javascript
let config = {
  threshold: 0,
  minDelay: 2,
  maxDelay: 7,
  maxDelete: Infinity,
  pauseAfter: Infinity,
  pauseDuration: 60,
  deletePrivate: false,
  shuffleDelete: false,
  autoScrollEvery: 10,
};
```
## Changelog 
(1.2.0 => 1.5.0)

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
