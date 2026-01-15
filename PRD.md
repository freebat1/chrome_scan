# PRD: Book Page Capture Chrome Extension

## Overview
A Chrome extension that automatically captures book pages from web-based book services and saves them as JPG images.

## Problem Statement
Users need to capture pages from online book services for offline reading or archival purposes. Manual screenshotting is tedious and time-consuming.

## Target Users
- Users with legitimate access to online book services
- Users who need offline copies of their purchased books

## Core Features

### 1. Page Capture
- Capture the visible book page area as a JPG image
- Trigger capture manually or automatically in sequence

### 2. Full-Page Scroll Capture
- Detect if current page content is scrollable (content height > viewport height)
- If scrollable:
  1. Capture visible area
  2. Scroll down by viewport height
  3. Capture again
  4. Repeat until reaching bottom
  5. Stitch all captured segments into a single JPG image
- If not scrollable: capture as single image (normal behavior)
- Handle overlap between segments to avoid content gaps

### 3. Auto-Navigation
- After capturing (including scroll capture completion), automatically click the right side of the page to advance to the next page
- Configurable delay between captures to allow page loading

### 4. File Management
- Save captured images as JPG format
- Auto-create subfolder named with current date (e.g., `2026-01-14`)
- Sequential file naming (e.g., `001.jpg`, `002.jpg`, ...)

## User Flow
1. User logs into book service and opens the book
2. User clicks extension icon to open control panel
3. User sets capture settings (optional) and starts capture
4. Extension workflow per page:
   - Check if page is scrollable
   - If scrollable: capture segment → scroll → capture segment → ... → save as `NNN_p1.jpg`, `NNN_p2.jpg`
   - If not scrollable: capture single image → save as `NNN.jpg`
   - Click right side to advance to next page
   - Wait for page load → repeat
5. User stops capture when done
6. Segment images saved to `Downloads/{date}/` folder
7. User runs Python program to merge segments into final images

## Technical Requirements

### Chrome Extension Components
| Component | Purpose |
|-----------|---------|
| `manifest.json` | Extension configuration (Manifest V3) |
| `popup.html/js` | Control panel UI |
| `content.js` | Page interaction, scroll, click simulation |
| `background.js` | Service worker for file saving |

### Python Program Components
| Component | Purpose |
|-----------|---------|
| `merge_pages.py` | Main script - merge segment images |
| `watcher.py` | Optional - watch folder for new segments |
| `requirements.txt` | Dependencies (Pillow, watchdog) |

### Permissions Needed
- `activeTab` - Access current tab for capture
- `downloads` - Save files to local storage
- `storage` - Store user preferences
- `scripting` - Inject content scripts

### Architecture: Extension + Python Program

The system consists of two independent components:

#### Component 1: Chrome Extension
- Captures visible viewport segments
- Saves segments to dated folder with part numbering
- Does NOT combine images (keeps extension simple)

#### Component 2: Python Program (Image Combiner)
- Watches or processes the download folder
- Combines segment images into single page image
- Runs independently from the extension

### Scroll Capture File Output (Before Merge)
```
Downloads/
└── 2026-01-14/
    ├── 001_p1.jpg    ← segment 1 of page 1
    ├── 001_p2.jpg    ← segment 2 of page 1
    ├── 001_p3.jpg    ← segment 3 of page 1
    ├── 002.jpg       ← page 2 (no scroll needed)
    ├── 003_p1.jpg
    ├── 003_p2.jpg
    └── ...
```

### Python Program Specification

#### Features
- Scan folder for segment files (`*_p*.jpg` pattern)
- Combine segments vertically using Pillow
- Output merged file (e.g., `001_p1.jpg` + `001_p2.jpg` → `001.jpg`)
- Delete original segments after successful merge
- Support batch processing and watch mode

#### Dependencies
```
pip install Pillow watchdog
```

#### Usage
```bash
# One-time merge
python merge_pages.py --input ./Downloads/2026-01-14

# Watch mode (auto-merge new files)
python merge_pages.py --watch ./Downloads/2026-01-14
```

#### Core Logic (Pillow)
```python
from PIL import Image
import glob

def merge_segments(pattern):
    segments = sorted(glob.glob(pattern))  # 001_p1.jpg, 001_p2.jpg, ...
    images = [Image.open(s) for s in segments]

    width = images[0].width
    total_height = sum(img.height for img in images)

    merged = Image.new('RGB', (width, total_height))
    y = 0
    for img in images:
        merged.paste(img, (0, y))
        y += img.height

    return merged
```

### Capture Settings (User Configurable)
| Setting | Default | Description |
|---------|---------|-------------|
| Delay between pages | 1000ms | Wait time after click before next capture |
| Image quality | 90% | JPG compression quality |
| Click position | Right 10% | Where to click to advance page |
| Total pages | Unlimited | Number of pages to capture (0 = until stopped) |
| Scroll capture | ON | Enable full-page scroll capture for scrollable content |
| Scroll delay | 800ms | Wait time between scroll segments for rendering |
| Overlap pixels | 50px | Overlap between segments to prevent content gaps |

## UI Design

### Popup Panel
```
┌─────────────────────────────┐
│  📖 Book Capture            │
├─────────────────────────────┤
│  Status: Ready              │
│  Captured: 0 pages          │
│                             │
│  Delay: [1000] ms           │
│  Pages: [0] (0=all)         │
│  [✓] Scroll Capture         │
│                             │
│  [▶ Start] [⏹ Stop]         │
└─────────────────────────────┘
```

## File Output Structure

### Before Python Merge (Extension Output)
```
Downloads/
└── 2026-01-14/
    ├── 001_p1.jpg    ← scrollable page segments
    ├── 001_p2.jpg
    ├── 002.jpg       ← single viewport page
    ├── 003_p1.jpg
    ├── 003_p2.jpg
    └── ...
```

### After Python Merge (Final Output)
```
Downloads/
└── 2026-01-14/
    ├── 001.jpg       ← merged from 001_p1 + 001_p2
    ├── 002.jpg       ← unchanged (was single)
    ├── 003.jpg       ← merged from 003_p1 + 003_p2
    └── ...
```

## Out of Scope (v1)
- PDF export
- OCR text extraction
- Multiple book service presets
- Cloud sync

## Success Metrics
- Capture accuracy: 100% of pages captured correctly
- User can capture 100+ pages without manual intervention
- File naming is consistent and sorted

## Legal Considerations
- This tool is intended for personal use with legitimately accessed content
- Users are responsible for compliance with service terms and copyright laws
