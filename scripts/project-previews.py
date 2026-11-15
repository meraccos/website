#!/usr/bin/env python3
"""Render project SVGs as opaque social-preview PNGs (macOS Quick Look)."""
from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ICONS = {
    'movie': 'movies.svg',
    'hangman': 'th_.svg',
    'language': 'language.svg',
    'satellite': 'satellite.svg',
}

with tempfile.TemporaryDirectory(prefix='project-previews-') as temporary:
    for project, filename in ICONS.items():
        source = ROOT / 'media' / project / filename
        subprocess.run(['qlmanage', '-t', '-s', '1000', '-o', temporary, str(source)],
                       check=True, stdout=subprocess.DEVNULL)
        icon = Image.open(Path(temporary) / (filename + '.png')).convert('RGBA')
        # Composite onto white before inversion to support transparent exports.
        white = Image.new('RGBA', icon.size, 'white')
        white.alpha_composite(icon)
        ink = ImageOps.invert(white.convert('RGB').convert('L'))
        bounds = ink.getbbox()
        if bounds:
            ink = ink.crop(bounds)
        bounds = (1080, 560) if project == 'movie' else (1000, 510)
        ink.thumbnail(bounds, Image.Resampling.LANCZOS)
        card = Image.new('RGB', (1200, 630), '#000000')
        card.paste('#e8e8e8', ((1200 - ink.width) // 2, (630 - ink.height) // 2), ink)
        card.save(source.parent / 'preview.png', optimize=True)
