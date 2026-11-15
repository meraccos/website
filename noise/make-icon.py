"""Render the code-native home-screen icon at Apple touch icon resolution."""
from pathlib import Path
from PIL import Image, ImageDraw

scale = 4
image = Image.new('RGB', (180 * scale, 180 * scale))
pixels = image.load()
for y in range(image.height):
    for x in range(image.width):
        glow = max(0, 1 - (((x / scale - 65) / 160) ** 2 + ((y / scale - 50) / 180) ** 2))
        pixels[x, y] = (int(14 + 12 * glow), int(21 + 16 * glow), int(35 + 25 * glow))
background = image.copy()
draw = ImageDraw.Draw(image)
moon = Image.new('L', image.size)
mask = ImageDraw.Draw(moon)
mask.ellipse(tuple(v * scale for v in (42, 40, 139, 137)), fill=255)
mask.ellipse(tuple(v * scale for v in (69, 25, 151, 112)), fill=0)
image.paste('#e4e6de', mask=moon)
draw = ImageDraw.Draw(image)
draw.polygon([(131*scale,45*scale),(134*scale,53*scale),(142*scale,56*scale),(134*scale,59*scale),(131*scale,67*scale),(128*scale,59*scale),(120*scale,56*scale),(128*scale,53*scale)], fill='#a9bfd4')
draw.ellipse((146*scale,84*scale,149*scale,87*scale), fill='#829bb5')
image.resize((180, 180), Image.Resampling.LANCZOS).save(Path(__file__).with_name('apple-touch-icon.png'))
