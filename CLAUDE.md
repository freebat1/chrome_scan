# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Two-component system for capturing book pages from web-based book services:
1. **Chrome Extension** - Captures page segments, handles scrolling and navigation
2. **Python Program** - Merges segment images into single page images

## Architecture

```
project/
├── extension/               # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js
│   ├── background.js
│   └── content.js
│
└── python/                  # Python Image Merger
    ├── merge_pages.py       # Main merge script
    ├── watcher.py           # Folder watch mode (optional)
    └── requirements.txt     # Pillow, watchdog
```

## Chrome Extension

### Component Communication
- **popup.js** ↔ **background.js**: `chrome.runtime.sendMessage`
- **background.js** ↔ **content.js**: `chrome.tabs.sendMessage`

### Key APIs
- `chrome.tabs.captureVisibleTab()` - Screenshot current tab
- `chrome.downloads.download()` - Save JPG files
- `chrome.storage.local` - Persist user settings
- `window.scrollBy()` - Scroll for segment capture
- `document.elementFromPoint().click()` - Simulate page turn

### Load Extension
```bash
# chrome://extensions/ → Developer mode → Load unpacked → Select extension/
```

## Python Program

### Install Dependencies
```bash
pip install Pillow watchdog
```

### Run Commands
```bash
# One-time merge
python merge_pages.py --input ./Downloads/2026-01-14

# Watch mode
python merge_pages.py --watch ./Downloads/2026-01-14
```

## File Naming Convention
- Scrollable page segments: `{NNN}_p{N}.jpg` (e.g., `001_p1.jpg`, `001_p2.jpg`)
- Single viewport page: `{NNN}.jpg` (e.g., `002.jpg`)
- After merge: All become `{NNN}.jpg`
