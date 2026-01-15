#!/usr/bin/env python3
"""Quick script to verify test image dimensions"""

import sys
from pathlib import Path
from PIL import Image

if len(sys.argv) < 2:
    print("Usage: python verify_images.py <test_folder>")
    sys.exit(1)

folder = Path(sys.argv[1])

print("=" * 60)
print("Image Verification")
print("=" * 60)
print()

for img_path in sorted(folder.glob("*.jpg")):
    try:
        with Image.open(img_path) as img:
            print(f"{img_path.name:20s} - {img.width}x{img.height} - {img.format}")
    except Exception as e:
        print(f"{img_path.name:20s} - ERROR: {e}")

print()
print("Expected:")
print("  001.jpg - 800x1800 (3 segments * 600)")
print("  002.jpg - 800x600  (single)")
print("  003.jpg - 800x1200 (2 segments * 600)")
