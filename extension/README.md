# Book Page Capture Extension

Chrome extension for capturing book pages from web-based book services with automatic scrolling and navigation.

---

## ⚠️ IMPORTANT: Required Chrome Setting

**Before using this extension, you MUST change this Chrome setting:**

### Turn OFF "Ask where to save each file before downloading"

```
1. Open Chrome Settings
   - Click ⋮ menu (top-right) → Settings
   - OR type in address bar: chrome://settings/downloads

2. Find "Downloads" section (left sidebar)

3. Turn OFF this toggle:
   "Ask where to save each file before downloading"

   Toggle should be gray/left (OFF)

4. Verify download location is set to your Downloads folder
```

**Why this is required:**
- Without this, Chrome will show a "Save As" dialog for every image
- This makes automatic capture impossible
- The extension code cannot override this Chrome setting

---

## Installation

### 1. Download Extension Files
Ensure you have the complete `extension/` folder with all files.

### 2. Load Extension in Chrome

```
1. Open Chrome
2. Go to: chrome://extensions/
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension/ folder
6. Extension icon appears in toolbar
```

### 3. Verify Installation
- Extension appears in chrome://extensions/ list
- No errors shown
- Icon visible in Chrome toolbar

---

## Usage

### Basic Capture

1. **Open a book** in your web browser
2. **Click extension icon** in Chrome toolbar
3. **Configure settings:**
   - Delay: Time between pages (default: 1000ms)
   - Pages: Number to capture (0 = unlimited)
   - Scroll Capture: Enable for long pages
   - Scroll delay: Time for page rendering (default: 1200ms)
   - Quality: JPG compression (default: 90%)

4. **Click "Start"** to begin capture
5. **Click "Stop"** to end capture anytime

### Settings Explained

| Setting | Default | Description |
|---------|---------|-------------|
| Delay | 1000ms | Wait time between pages |
| Pages | 0 (all) | Total pages to capture (0 = unlimited) |
| Scroll Capture | ON | Capture long pages in segments |
| Scroll delay | 1200ms | Wait time after scrolling for rendering |
| Quality | 90% | JPG compression quality (50-100%) |

---

## Features

### ✅ Automatic Page Capture
- Captures visible page content
- Saves as high-quality JPG images

### ✅ Scroll Capture
- Detects scrollable pages automatically
- Captures entire page in segments
- Visible scrolling with indicators

### ✅ Auto-Navigation
- Automatically presses → (right arrow) key to advance
- Works with most book reader websites
- No manual intervention needed

### ✅ Smart File Management
- Saves to Downloads/YYYY-MM-DD/ folder
- Sequential naming: 001.jpg, 002.jpg, etc.
- Scrollable pages: 001_p1.jpg, 001_p2.jpg, etc.

---

## How It Works

### Single Page (Not Scrollable)
```
[Capture] → [Save as 001.jpg] → [Press →] → [Next page]
```

### Scrollable Page
```
[Detect scrollable]
→ [Capture top] → [Save as 001_p1.jpg]
→ [Scroll down] → [Capture middle] → [Save as 001_p2.jpg]
→ [Scroll down] → [Capture bottom] → [Save as 001_p3.jpg]
→ [Press →] → [Next page]
```

### Visual Indicators
- **Blue indicator** at top shows progress: "📸 Segment 1/3 - Scrolling..."
- **"↓ SCROLLING ↓"** badge appears during scroll
- **Red/blue flash** when capturing segment

---

## File Output

### Structure
```
Downloads/
└── 2026-01-14/           ← Date folder
    ├── 001.jpg           ← Single page
    ├── 002_p1.jpg        ← Scrollable page segment 1
    ├── 002_p2.jpg        ← Scrollable page segment 2
    ├── 002_p3.jpg        ← Scrollable page segment 3
    ├── 003.jpg
    └── ...
```

### Merging Segments
For scrollable pages with multiple segments, use the Python merge program:

```bash
cd ../python
python merge_pages.py --input "C:\Users\YourName\Downloads\2026-01-14"
```

This combines segments into complete page images:
- `002_p1.jpg` + `002_p2.jpg` + `002_p3.jpg` → `002.jpg`

---

## Navigation

The extension uses **arrow key navigation** (not clicking):

- **→ (Right arrow)** = Next page
- **← (Left arrow)** = Previous page (if supported)

This works with most book reader websites:
- ✅ Ridibooks
- ✅ Yes24
- ✅ Google Books
- ✅ Most web-based readers

---

## Troubleshooting

### "Save As" Dialog Appears

**Problem:** Chrome shows save dialog for every file

**Solution:** Turn OFF Chrome setting (see Required Chrome Setting above)

This is **NOT an extension bug** - it's a Chrome setting that overrides the extension.

---

### Scrolling Not Visible

**Problem:** Can't see page scrolling during capture

**Solutions:**
1. Increase scroll delay to 2000-3000ms in extension settings
2. Watch the scrollbar on right side of browser
3. Check console (F12) for scroll messages

---

### No Files Created

**Problem:** No images appear in Downloads folder

**Solutions:**
1. Check Downloads permission in chrome://extensions/
2. Verify download location in Chrome Settings → Downloads
3. Look for error messages in extension popup
4. Check browser console (F12) for errors

---

### Arrow Key Not Working

**Problem:** Extension doesn't advance to next page

**Solutions:**
1. Verify the website supports arrow key navigation
2. Check console for "Pressing right arrow key" message
3. Try manual navigation (press → yourself)
4. Some sites may need manual navigation

---

### Page Not Detected as Scrollable

**Problem:** Long page captured as single segment

**Solutions:**
1. Check if Scroll Capture is enabled
2. Increase scroll delay
3. Page may use iframe or special container
4. Check console: shows scroll height detection

---

## Testing

### Test with Included Test Page

1. Open `test_page.html` in Chrome
2. Test manual arrow keys (→ / ←)
3. Run extension capture (Pages: 3)
4. Verify scrolling is visible
5. Check Downloads folder for files

### Test Console Output

Press F12 → Console tab to see:
```
[Book Capture] Starting capture for page 1
[Book Capture] Page is scrollable: 2500px (viewport: 800px)
[Book Capture] Will capture 4 segments
[Book Capture] Scrolling from 0px to 800px in 16 steps
[Book Capture] Pressing right arrow key to go to next page
```

---

## Compatibility

### Works With
- ✅ Chrome 88+
- ✅ Manifest V3
- ✅ Windows, macOS, Linux
- ✅ Most web-based book readers

### Tested On
- Ridibooks
- Yes24
- Google Books
- Generic web book viewers

---

## Permissions

The extension requires these permissions:

| Permission | Purpose |
|------------|---------|
| `activeTab` | Capture current tab screenshot |
| `downloads` | Save images to Downloads folder |
| `storage` | Store user settings |
| `scripting` | Inject content script for scrolling |
| `<all_urls>` | Work on any website |

---

## Privacy

- ✅ **No data collection** - Extension doesn't send data anywhere
- ✅ **Local only** - All processing happens in your browser
- ✅ **No tracking** - No analytics or telemetry
- ✅ **Open source** - All code is visible

---

## Support

### For Issues:
1. Check troubleshooting section above
2. Verify Chrome setting is turned OFF
3. Check browser console for errors (F12)
4. Create issue with console output

### Common Questions:

**Q: Why do I see a save dialog?**
A: Turn OFF "Ask where to save" in Chrome Settings → Downloads

**Q: Can I change the download folder?**
A: Yes, in Chrome Settings → Downloads → Location

**Q: How do I merge segment files?**
A: Use the Python merge program in ../python/ folder

**Q: Does this work on all websites?**
A: Works on most sites with arrow key navigation

**Q: Is this legal?**
A: Tool is for personal use. You're responsible for complying with service terms and copyright laws.

---

## Related Tools

### Python Merge Program
Located in `../python/` folder - merges page segments into complete images.

```bash
cd ../python
pip install -r requirements.txt
python merge_pages.py --input "./Downloads/2026-01-14"
```

See `../python/README.md` for details.

---

## Version

**v1.2** - Current version
- Visible scrolling with indicators
- Arrow key navigation
- File overwrite support
- Console logging

---

## License

This tool is intended for personal use with legitimately accessed content. Users are responsible for compliance with service terms and copyright laws.

---

## Quick Reference

### Required Setup:
```
1. Load extension in chrome://extensions/
2. ⚠️  Turn OFF "Ask where to save" in Chrome Settings
3. Open book website
4. Click extension → Start
```

### File Output:
```
Downloads/YYYY-MM-DD/NNN.jpg or NNN_pX.jpg
```

### Navigation:
```
→ arrow key = Next page (automatic)
```

### Troubleshooting:
```
Save dialog → Fix Chrome setting
Not scrolling → Increase scroll delay
Not navigating → Check console
```

---

## Remember!

⚠️ **Most important:** Turn OFF "Ask where to save each file before downloading" in Chrome Settings → Downloads

Without this, the extension cannot auto-save files!
