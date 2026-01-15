#!/usr/bin/env python3
"""
Test script to verify merge_pages.py setup

Creates sample segment images and tests the merge functionality
"""

import os
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def create_test_segment(width, height, color, text):
    """Create a test image segment"""
    img = Image.new('RGB', (width, height), color=color)
    draw = ImageDraw.Draw(img)

    # Draw text in center
    try:
        # Try to use a default font
        font = ImageFont.load_default()
    except:
        font = None

    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]

    x = (width - text_width) // 2
    y = (height - text_height) // 2

    draw.text((x, y), text, fill='white', font=font)

    return img


def create_test_files(test_dir):
    """Create test segment files"""
    print(f"Creating test files in {test_dir}")

    # Page 1: 3 segments (scrollable page)
    img1 = create_test_segment(800, 600, 'red', 'Page 1 - Segment 1')
    img1.save(test_dir / '001_p1.jpg', 'JPEG')

    img2 = create_test_segment(800, 600, 'green', 'Page 1 - Segment 2')
    img2.save(test_dir / '001_p2.jpg', 'JPEG')

    img3 = create_test_segment(800, 600, 'blue', 'Page 1 - Segment 3')
    img3.save(test_dir / '001_p3.jpg', 'JPEG')

    # Page 2: single page (no segments)
    img4 = create_test_segment(800, 600, 'purple', 'Page 2 - Single')
    img4.save(test_dir / '002.jpg', 'JPEG')

    # Page 3: 2 segments
    img5 = create_test_segment(800, 600, 'orange', 'Page 3 - Segment 1')
    img5.save(test_dir / '003_p1.jpg', 'JPEG')

    img6 = create_test_segment(800, 600, 'cyan', 'Page 3 - Segment 2')
    img6.save(test_dir / '003_p2.jpg', 'JPEG')

    print("[OK] Created 6 test images (2 pages with segments, 1 single page)")
    print()
    print("Files created:")
    for file in sorted(test_dir.glob('*.jpg')):
        print(f"  - {file.name}")
    print()


def main():
    print("=" * 60)
    print("Book Page Merge - Test Script")
    print("=" * 60)
    print()

    # Create temporary directory
    test_dir = Path(tempfile.mkdtemp(prefix='book_merge_test_'))

    try:
        create_test_files(test_dir)

        print("To test the merge program, run:")
        print()
        print(f"  python merge_pages.py --input {test_dir}")
        print()
        print("Expected result:")
        print("  - 001.jpg (merged from 001_p1, 001_p2, 001_p3)")
        print("  - 002.jpg (unchanged)")
        print("  - 003.jpg (merged from 003_p1, 003_p2)")
        print()
        print(f"Test files location: {test_dir}")
        print()

        # Import and run merge
        print("Running merge...")
        print()

        from merge_pages import merge_folder
        merge_folder(str(test_dir), quality=90, delete_segments=False)

        print()
        print("Files after merge:")
        for file in sorted(test_dir.glob('*.jpg')):
            print(f"  - {file.name}")
        print()
        print("[OK] Test complete!")
        print()
        print(f"Check the merged images in: {test_dir}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
