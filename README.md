# Book Page Capture System

Complete system for capturing and processing book pages from web-based book services.

## System Components

### 1. Chrome Extension (`extension/`)
Captures book pages from web services, handles scrolling and navigation.

**Features:**
- Auto-capture with configurable delay
- Full-page scroll capture for long pages
- Auto-navigation to next page
- Saves to dated folders
- Configurable quality and settings

### 2. Python Merge Program (`python/`)
Merges multi-segment page captures into single images.

**Features:**
- Batch processing
- Watch mode (auto-merge as files are created)
- Configurable quality
- Optional segment deletion

## Quick Start

### 1. Install Chrome Extension

```bash
# Navigate to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" → Select extension/ folder
```

### 2. Install Python Program

```bash
cd python
pip install -r requirements.txt
```

### 3. Capture Pages

**Option A: With real-time merge (recommended)**

1. Start watch mode:
   ```bash
   python merge_pages.py --watch ./Downloads/2026-01-14
   ```

2. Open book in browser, click extension icon, start capture

3. Pages are automatically merged as they're captured

**Option B: Batch merge after capture**

1. Run Chrome extension to capture all pages

2. Merge after capture:
   ```bash
   python merge_pages.py --input ./Downloads/2026-01-14
   ```

## File Flow

```
Chrome Extension              Python Program
─────────────                ──────────────
Capture segments             Merge segments
      ↓                            ↓
001_p1.jpg ──┐
001_p2.jpg ──┼──→ merge → 001.jpg
001_p3.jpg ──┘
002.jpg ──────────────────→ 002.jpg (no merge needed)
003_p1.jpg ──┐
003_p2.jpg ──┴──→ merge → 003.jpg
```

## Project Structure

```
01_scan/
├── extension/              # Chrome Extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── icons/
│
├── python/                 # Python Merge Program
│   ├── merge_pages.py
│   ├── requirements.txt
│   ├── test_merge.py
│   └── README.md
│
├── PRD.md                  # Product Requirements
├── CLAUDE.md               # Development Guide
└── README.md               # This file
```

## Documentation

- **Extension Usage:** See `extension/README.md`
- **Python Program:** See `python/README.md`
- **Requirements:** See `PRD.md`
- **Development:** See `CLAUDE.md`

## Testing

### Test Chrome Extension
1. Load extension in Chrome
2. Navigate to any scrollable web page
3. Click extension icon, configure settings
4. Click "Start" to test capture

### Test Python Program
```bash
cd python
python test_merge.py
```

This creates sample segment files and tests the merge functionality.

## Configuration

### Extension Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Delay | 1000ms | Wait time between pages |
| Pages | 0 (all) | Number of pages to capture |
| Scroll Capture | ON | Enable multi-segment capture |
| Scroll Delay | 300ms | Wait time after scrolling |
| Quality | 90% | JPG compression quality |

### Python Settings
| Option | Default | Description |
|--------|---------|-------------|
| --quality | 90 | JPG quality (1-100) |
| --no-delete | false | Keep original segments |

## Output

Images are saved to Downloads folder with date-based structure:

```
Downloads/
└── 2026-01-14/
    ├── 001.jpg
    ├── 002.jpg
    ├── 003.jpg
    └── ...
```

## Legal Notice

This tool is intended for personal use with legitimately accessed content. Users are responsible for compliance with service terms and copyright laws.

## Troubleshooting

### Extension not capturing
- Check permissions in chrome://extensions/
- Ensure you're on a valid web page
- Check browser console for errors

### Python merge errors
- Verify Python 3.7+ installed
- Install dependencies: `pip install -r requirements.txt`
- Check file naming matches pattern `NNN_pX.jpg`

### Missing icons warning
- Extension works without icons
- Add 16x16, 32x32, 48x48, 128x128 PNG files to `extension/icons/`

## Development

To modify or extend this system, see:
- `CLAUDE.md` - Architecture and development guide
- `PRD.md` - Product requirements and specifications

## Version

v1.0.0 - Initial release
