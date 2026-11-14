#!/usr/bin/env python3
"""Refresh local CSS/JS content hashes in static pages; leaves RAIL untouched."""
import argparse
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET = re.compile(r'((?:src|href)=")(/(?!/)[^"?]+\.(?:css|js))(?:\?v=[^"]+)?"')


def refresh(html):
    def replace(match):
        prefix, url = match.groups()
        asset = ROOT / url.lstrip('/')
        if not asset.is_file():
            return match.group()
        digest = hashlib.sha256(asset.read_bytes()).hexdigest()[:10]
        return f'{prefix}{url}?v={digest}"'
    return ASSET.sub(replace, html)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Report stale hashes without changing files.')
    args = parser.parse_args()
    stale = []
    for page in sorted(ROOT.rglob('*.html')):
        if any(part.startswith('.') or part in {'rail', 'tmp', 'qs'} for part in page.relative_to(ROOT).parts):
            continue
        original = page.read_text()
        updated = refresh(original)
        if updated != original:
            stale.append(str(page.relative_to(ROOT)))
            if not args.check:
                page.write_text(updated)
    if stale:
        print(('Stale: ' if args.check else 'Updated: ') + ', '.join(stale))
    raise SystemExit(1 if args.check and stale else 0)


if __name__ == '__main__':
    main()
