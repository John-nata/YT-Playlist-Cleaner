# Changelog

All notable changes to the script are documented in this file.
Dates use the format YYYY-MM-DD.

## [2.0.4] - 2026-02-19

### Changed
- Updated default settings values
- Updated welcome message

### Fixed
- Logging: fixed `originalLog` initialisation order and removed duplicate declaration
- Stability: added null/existence guards for UI elements (`countdownText`, `menuButton`, `updateConfigFromInputs`)
- Scrolling: fixed `autoScroll` to better handle dynamic/lazy-loaded content
- Security: mitigated TrustedTypes policy conflicts with try/catch
- Notifications: added a guard to prevent infinite recursion

### Removed
- Removed stray `focus_chain()` call at end of file
- Removed unused `createProgressBar()` function


## [2.0.2] - 2026-02-11

### Fixed
- Early stopping: fixed an issue where the script stopped after the first batch due to YouTube lazy loading; the script now scrolls and re-scans until the deletion target is met
- Dark mode button: fixed a drag-and-drop vs header-buttons conflict that made the toggle unresponsive for some users

### Improved
- Unavailable video handling: removed the legacy “Delete private videos” option; use “Delete only unavailable videos” (covers private + deleted more reliably)
- UX: added an ℹ️ tooltip next to “Delete unavailable” reminding users to enable “Show unavailable videos” in the playlist sidebar


## [2.0.1] - 2026-02-10
Based on @zorak1103’s commit.

### Fixed
- Notification spam: suppressed video progress logs and auto-pause messages (console-only until next update)
- `waitForElement` crash: fixed undefined `app` variable; added a 5s timeout to prevent infinite waiting

### Improved
- Error handling: `deleteVideo` now distinguishes “menu timeout” vs “missing button” and increments count only on success
- CSS/input: replaced invalid inline pseudo-classes with JS event listeners; added specific class names (e.g., `cleaner-input-threshold`)
- Logging: moved retry/status logs to console with ✓/✗ indicators


## [2.0.0] - 2026-02-09

### Added
- Unavailable video filter: only delete [Private video] or [Deleted video] entries
- Age-based deletion: skip videos added within the last N days
- 17 new language translations: Swedish, Danish, Norwegian, Finnish, Ukrainian, Romanian, Slovak, Bulgarian, Croatian, Greek, Catalan, Hindi, Thai, Vietnamese, Indonesian, Malay, Filipino

### Changed
- UI redesign with a YouTube/Material Design hybrid aesthetic
- Header, status badge, dark mode toggle, scrollable content area, progress bar, and button styling improvements

### Fixed
- Fixed completion message showing the wrong video count
- Fixed skip notifications spamming the UI
- Fixed pause/resume state machine with proper logging
- Fixed dark mode not styling all elements correctly
- Fixed Polish, Turkish, Czech incomplete translations
- Fixed Chinese typo in translations

### Technical
- Added `skippedCount` state tracking
- Added `pauseNotificationId` for persistent notification management
- Skip reasons now log to console only via `originalLog`
- Progress bar now uses CSS width instead of a `<progress>` element


## [1.6.0]

### Fixed
- Chrome Trusted Types policy issue: resolved `TrustedHTML` assignment error by implementing a Trusted Types policy (credits: @f0x4, see issue #2)

### Changed
- Pause/resume logic: updated outdated logic for smoother playlist management
- Logging: enhanced logs for better debugging and user feedback


## [1.2.0 → 1.5.1]

### Improved
- Error handling: smart pauses for excessive errors, progressive backoff for consecutive failures, more detailed error messages
- Performance: improved scrolling with debouncing, more efficient DOM queries, lower memory usage during processing
- UI: upgraded notifications (animations, progress bars), responsive design, close buttons

### Technical
- Configuration: settings stored locally and persist between sessions, validation added
- Code: refactored processing logic, robust error handling, correct initialisation sequence

### Fixed
- Resolved scrolling issues on longer playlists
- Fixed deletion confirmation glitches
- Addressed UI issues with large playlists
- Eliminated notification memory leaks
- Fixed multiple instances of the UI appearing
