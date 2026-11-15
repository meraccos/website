"""Render the code-native home-screen icon at Apple touch icon resolution."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

scale = 4
image = Image.new('RGB', (180 * scale, 180 * scale), '#141820')
draw = ImageDraw.Draw(image)
for text, x, y, size, color in [
    ('z', 43, 92, 37, '#73839b'),
    ('z', 78, 62, 45, '#99aac2'),
    ('Z', 113, 28, 51, '#d5dfed'),
]:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', size * scale)
    draw.text((x * scale, y * scale), text, font=font, fill=color)
image.resize((180, 180), Image.Resampling.LANCZOS).save(Path(__file__).with_name('apple-touch-icon.png'))
