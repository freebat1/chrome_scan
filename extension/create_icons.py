#!/usr/bin/env python3
"""
Generate placeholder icons for Chrome extension
"""

from PIL import Image, ImageDraw, ImageFont

def create_icon(size, output_path):
    """Create a simple book icon"""
    # Create image with blue background
    img = Image.new('RGB', (size, size), color='#4285F4')
    draw = ImageDraw.Draw(img)

    # Draw a simple book shape
    margin = size // 6
    book_left = margin
    book_right = size - margin
    book_top = margin
    book_bottom = size - margin

    # Book outline (white)
    draw.rectangle([book_left, book_top, book_right, book_bottom],
                   fill='white', outline='#333333', width=max(1, size // 32))

    # Book spine (vertical line in middle)
    center_x = size // 2
    draw.line([(center_x, book_top), (center_x, book_bottom)],
              fill='#333333', width=max(1, size // 32))

    # Save
    img.save(output_path, 'PNG')
    print(f"Created {output_path}")

if __name__ == '__main__':
    import os

    # Create icons directory if it doesn't exist
    icons_dir = 'icons'
    os.makedirs(icons_dir, exist_ok=True)

    # Generate all required sizes
    sizes = [16, 32, 48, 128]
    for size in sizes:
        create_icon(size, f'{icons_dir}/icon{size}.png')

    print("\nAll icons created successfully!")
    print("Icons are located in: extension/icons/")
