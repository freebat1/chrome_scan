#!/usr/bin/env python3
"""
Book Page Merge - Combine captured page segments into single images
"""

import os
import re
import glob
import argparse
from pathlib import Path
from typing import List, Dict
from PIL import Image


def find_segment_groups(folder: Path) -> Dict[int, List[Path]]:
    """
    Find all segment files and group them by page number.

    Pattern: NNN_pX.jpg where NNN is page number, X is segment number
    Returns: {page_number: [segment_files]}
    """
    pattern = str(folder / "*_p*.jpg")
    segment_files = glob.glob(pattern)

    groups = {}
    segment_pattern = re.compile(r'(\d+)_p(\d+)\.jpg$')

    for file_path in segment_files:
        match = segment_pattern.search(file_path)
        if match:
            page_num = int(match.group(1))
            segment_num = int(match.group(2))

            if page_num not in groups:
                groups[page_num] = []

            groups[page_num].append((segment_num, Path(file_path)))

    # Sort segments within each group
    for page_num in groups:
        groups[page_num].sort(key=lambda x: x[0])
        groups[page_num] = [path for _, path in groups[page_num]]

    return groups


def merge_segments(segment_paths: List[Path], output_path: Path, quality: int = 90):
    """
    Merge multiple image segments vertically into a single image.

    Args:
        segment_paths: List of image file paths in order
        output_path: Output file path
        quality: JPG quality (1-100)
    """
    if not segment_paths:
        raise ValueError("No segments to merge")

    # Open all images
    images = [Image.open(path) for path in segment_paths]

    # Verify all images have same width
    width = images[0].width
    if not all(img.width == width for img in images):
        raise ValueError("All segments must have the same width")

    # Calculate total height
    total_height = sum(img.height for img in images)

    # Create merged image
    merged = Image.new('RGB', (width, total_height))

    # Paste each segment
    y_offset = 0
    for img in images:
        merged.paste(img, (0, y_offset))
        y_offset += img.height

    # Save merged image
    merged.save(output_path, 'JPEG', quality=quality)

    # Close all images
    for img in images:
        img.close()

    print(f"[OK] Merged {len(segment_paths)} segments -> {output_path.name}")


def merge_page(page_number: int, segments: List[Path], folder: Path, quality: int = 90, delete_segments: bool = True):
    """
    Merge segments for a single page.

    Args:
        page_number: Page number
        segments: List of segment file paths
        folder: Output folder
        quality: JPG quality
        delete_segments: Delete original segments after merge
    """
    # Output filename
    output_filename = f"{page_number:03d}.jpg"
    output_path = folder / output_filename

    # Check if output already exists
    if output_path.exists():
        print(f"[SKIP] Skipped page {page_number} (output already exists)")
        return

    try:
        # Merge segments
        merge_segments(segments, output_path, quality)

        # Delete original segments
        if delete_segments:
            for segment_path in segments:
                segment_path.unlink()
            print(f"  Deleted {len(segments)} segment files")

    except Exception as e:
        print(f"[ERROR] Error merging page {page_number}: {e}")


def merge_folder(folder_path: str, quality: int = 90, delete_segments: bool = True):
    """
    Merge all segment files in a folder.

    Args:
        folder_path: Path to folder containing segment files
        quality: JPG quality
        delete_segments: Delete original segments after merge
    """
    folder = Path(folder_path)

    if not folder.exists():
        print(f"Error: Folder not found: {folder}")
        return

    # Find segment groups
    groups = find_segment_groups(folder)

    if not groups:
        print(f"No segment files found in {folder}")
        return

    print(f"Found {len(groups)} pages with segments to merge")
    print()

    # Merge each page
    for page_number in sorted(groups.keys()):
        segments = groups[page_number]
        merge_page(page_number, segments, folder, quality, delete_segments)

    print()
    print(f"[OK] Complete! Merged {len(groups)} pages")


def watch_folder(folder_path: str, quality: int = 90, delete_segments: bool = True):
    """
    Watch folder for new segment files and merge them automatically.

    Args:
        folder_path: Path to folder to watch
        quality: JPG quality
        delete_segments: Delete original segments after merge
    """
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    import time

    folder = Path(folder_path)

    if not folder.exists():
        print(f"Error: Folder not found: {folder}")
        return

    print(f"Watching folder: {folder}")
    print("Press Ctrl+C to stop")
    print()

    class SegmentHandler(FileSystemEventHandler):
        def __init__(self):
            self.pending_pages = set()
            self.last_modified = {}

        def on_created(self, event):
            if event.is_directory:
                return

            # Check if it's a segment file
            match = re.search(r'(\d+)_p(\d+)\.jpg$', event.src_path)
            if match:
                page_num = int(match.group(1))
                self.pending_pages.add(page_num)
                self.last_modified[page_num] = time.time()

        def check_and_merge(self):
            """Check for pages that are ready to merge"""
            current_time = time.time()
            ready_pages = []

            for page_num in list(self.pending_pages):
                # Wait 2 seconds after last segment to ensure all segments are captured
                if current_time - self.last_modified.get(page_num, 0) > 2.0:
                    ready_pages.append(page_num)
                    self.pending_pages.discard(page_num)

            for page_num in ready_pages:
                groups = find_segment_groups(folder)
                if page_num in groups:
                    segments = groups[page_num]
                    merge_page(page_num, segments, folder, quality, delete_segments)

    handler = SegmentHandler()
    observer = Observer()
    observer.schedule(handler, str(folder), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
            handler.check_and_merge()
    except KeyboardInterrupt:
        print("\nStopping...")
        observer.stop()

    observer.join()


def main():
    parser = argparse.ArgumentParser(
        description='Merge book page segment images into single pages',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Merge all segments in a folder
  python merge_pages.py --input ./Downloads/2026-01-14

  # Watch folder and auto-merge new segments
  python merge_pages.py --watch ./Downloads/2026-01-14

  # Merge without deleting original segments
  python merge_pages.py --input ./Downloads/2026-01-14 --no-delete

  # Custom quality setting
  python merge_pages.py --input ./Downloads/2026-01-14 --quality 95
        '''
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--input', '-i', type=str, help='Folder to merge (one-time)')
    group.add_argument('--watch', '-w', type=str, help='Folder to watch (continuous)')

    parser.add_argument('--quality', '-q', type=int, default=90,
                        help='JPG quality 1-100 (default: 90)')
    parser.add_argument('--no-delete', action='store_true',
                        help='Keep original segment files after merge')

    args = parser.parse_args()

    # Validate quality
    if not 1 <= args.quality <= 100:
        parser.error("Quality must be between 1 and 100")

    delete_segments = not args.no_delete

    if args.input:
        merge_folder(args.input, args.quality, delete_segments)
    elif args.watch:
        watch_folder(args.watch, args.quality, delete_segments)


if __name__ == '__main__':
    main()
