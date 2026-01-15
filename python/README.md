# Book Page Merge

Python program to merge captured page segments into single images.

## Overview

This program processes the output from the Book Page Capture Chrome extension, combining multi-segment images (created from scrollable pages) into single page images.

## Requirements

- Python 3.7+
- Pillow (image processing)
- watchdog (folder watching)

## Installation

```bash
pip install -r requirements.txt
```

Or install dependencies manually:
```bash
pip install Pillow watchdog
```

## Usage

### One-Time Merge (Batch Processing)

Merge all segment files in a folder:

```bash
python merge_pages.py --input ./Downloads/2026-01-14
```

### Watch Mode (Continuous)

Watch a folder and automatically merge new segments as they appear:

```bash
python merge_pages.py --watch c:\Users\chjfr\Downloads\2026-01-15
```

Press `Ctrl+C` to stop watching.

### Options

| Option | Description |
|--------|-------------|
| `--input`, `-i` | Folder to merge (one-time batch) |
| `--watch`, `-w` | Folder to watch (continuous mode) |
| `--quality`, `-q` | JPG quality 1-100 (default: 90) |
| `--no-delete` | Keep original segment files after merge |

### Examples

```bash
# Merge with custom quality
python merge_pages.py --input ./Downloads/2026-01-14 --quality 95

# Watch mode without deleting originals
python merge_pages.py --watch ./Downloads/2026-01-14 --no-delete

# Keep segments for manual review
python merge_pages.py -i ./Downloads/2026-01-14 --no-delete
```

## How It Works

### Input Files
The program looks for segment files matching the pattern `NNN_pX.jpg`:
- `NNN` = page number (e.g., 001, 002, 003)
- `X` = segment number (e.g., 1, 2, 3)

Example:
```
Downloads/2026-01-14/
├── 001_p1.jpg  ← page 1, segment 1
├── 001_p2.jpg  ← page 1, segment 2
├── 001_p3.jpg  ← page 1, segment 3
├── 002.jpg     ← page 2 (single, no segments)
├── 003_p1.jpg
└── 003_p2.jpg
```

### Processing

1. Scans folder for segment files
2. Groups segments by page number
3. For each page with segments:
   - Opens all segment images
   - Verifies they have the same width
   - Combines them vertically (stacks top to bottom)
   - Saves as `NNN.jpg`
   - Optionally deletes original segments

### Output Files
```
Downloads/2026-01-14/
├── 001.jpg  ← merged from 001_p1, 001_p2, 001_p3
├── 002.jpg  ← unchanged (was already single)
└── 003.jpg  ← merged from 003_p1, 003_p2
```

## Watch Mode Details

In watch mode, the program:
- Monitors the folder for new segment files
- Waits 2 seconds after the last segment is detected
- Automatically merges complete sets of segments
- Continues running until stopped with `Ctrl+C`

This is useful when running the Chrome extension, as pages are merged in real-time as they're captured.

## Troubleshooting

### "No segment files found"
- Check the folder path is correct
- Ensure segment files match the pattern `NNN_p*.jpg`
- Run the Chrome extension first to create segment files

### "All segments must have the same width"
- This indicates corrupted or mismatched captures
- Use `--no-delete` to inspect segment files manually
- Recapture the problematic page

### Watch mode not detecting files
- Ensure the folder exists before starting watch mode
- Check file permissions
- Try batch mode first to verify setup

## Integration with Chrome Extension

**Recommended workflow:**

1. Start watch mode:
   ```bash
   python merge_pages.py --watch ./Downloads/2026-01-14
   ```

2. Start Chrome extension capture

3. Segments are automatically merged as pages are captured

4. Stop watch mode when capture is complete

**Alternative workflow:**

1. Run Chrome extension to capture all pages

2. Run merge in batch mode:
   ```bash
   python merge_pages.py --input ./Downloads/2026-01-14
   ```

## Notes

- Merged images use JPG format with configurable quality
- Original segments are deleted by default (use `--no-delete` to keep)
- Single-page files (no segments) are left untouched
- Date folder format: `YYYY-MM-DD`
