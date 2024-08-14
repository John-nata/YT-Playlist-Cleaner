# YouTube Playlist Cleaner

## Overview

YouTube Playlist Cleaner is a userscript that helps you tidy up your YouTube playlists by automatically removing videos based on customisable settings. 
It features auto-scroll functionality and an improved user interface for a seamless experience.

The development of this script was greatly inspired by [@colejd's work](https://gist.github.com/astamicu/eb351ce10451f1a51b71a1287d36880f?permalink_comment_id=4489588#gistcomment-4489588) .

## Features

- Automatically remove videos from YouTube playlists
- Customisable settings for deletion criteria
- Auto-scroll functionality to process large playlists
- Improved user interface with progress bar and status updates
- Pause and resume functionality
- Configurable delays between deletions to avoid rate limiting

## Screenshot

![image](https://github.com/user-attachments/assets/48dd8e03-d608-4a87-9dd6-3f67e3c77e15)

## Installation

1. Install a userscript manager like Tampermonkey or Greasemonkey in your browser.
2. Click on the following link to install the script: [Install YouTube Playlist Cleaner](https://github.com/John-nata/YT-Playlist-Cleaner/raw/main/YT-playlist-cleaner.js)
3. The script will automatically run when you visit a YouTube playlist page.

## Usage

1. Navigate to any YouTube playlist page.
2. The script will add a "Cleanse Playlist" button to the page.
3. Click the button to open the settings panel.
4. Adjust the settings as desired:
   - Threshold: Minimum watched percentage for deletion
   - Max Delete: Maximum number of videos to delete
   - Delete Private: Choose whether to delete private videos
   - Pause After: Number of deletions before pausing
   - Pause Duration: Duration of pause in seconds
   - Auto-scroll Every: Frequency of auto-scrolling
   - Min/Max Delay: Range for random delay between deletions
5. Click "Start Cleansing" to begin the process.
6. Use the "Pause" and "Resume" buttons to control the cleansing process as needed.

## Configuration

You can customise the script's default behaviour by modifying the `config` object in the script:

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

## Compatibility

This script is designed to work on the following URLs:
- `http*://*.youtube.com/playlist*`
- `http*://youtube.com/playlist*`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This script is not affiliated with or endorsed by YouTube. Use it at your own risk and in compliance with YouTube's terms of service.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

---

Happy playlist cleaning!
