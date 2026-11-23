#!/usr/bin/env python3
"""
Shrink oversized WebP images in place (originals are backed up first).

Why: a few Gemini exports are 1536x2700 or 2752x1536 (~4 MP, ~17 MB decoded) but are shown on
the page at well under half that size. Scrolling past several of them makes Chrome evict and
re-decode them, which shows up as blinking. Resizing keeps the aspect ratio, so the width/height
attributes in index.html stay correct and need no edits.

Usage (from the folder that contains index.html):
    pip install pillow
    python shrink_images.py                      # dry run: lists what would change
    python shrink_images.py --apply              # does it
    python shrink_images.py --apply --max-long 2000 --max-width 1600 --quality 88
"""
import argparse, shutil, sys
from pathlib import Path
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--dir", default="assets/images", help="images folder")
ap.add_argument("--max-long", type=int, default=1800, help="max length of the longer side (px)")
ap.add_argument("--max-width", type=int, default=1600, help="max width (px)")
ap.add_argument("--quality", type=int, default=88, help="WebP quality 1-100")
ap.add_argument("--no-backup", action="store_true", help="skip the _originals backup (use in git, where history is the backup)")
ap.add_argument("--thumbs", action="store_true", help="also make 480px-wide copies of parable-*.webp (name-480.webp) for desktop")
ap.add_argument("--apply", action="store_true", help="actually write files (default is a dry run)")
a = ap.parse_args()

root = Path(a.dir)
if not root.is_dir():
    sys.exit(f"Folder not found: {root}  (run this from the folder that contains index.html)")
backup = root / "_originals"

changed = 0
saved = 0
for f in sorted(root.glob("*.webp")):
    with Image.open(f) as im:
        w, h = im.size
        scale = min(1.0, a.max_long / max(w, h), a.max_width / w)
        if scale >= 0.98:
            continue
        nw, nh = round(w * scale), round(h * scale)
        print(f"{f.name}: {w}x{h} -> {nw}x{nh}")
        changed += 1
        if not a.apply:
            continue
        if not a.no_backup:
            backup.mkdir(exist_ok=True)
            if not (backup / f.name).exists():
                shutil.copy2(f, backup / f.name)
        out = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB").resize((nw, nh), Image.LANCZOS)
    before = f.stat().st_size
    out.save(f, "WEBP", quality=a.quality, method=6)
    saved += before - f.stat().st_size

if a.thumbs:
    made = 0
    for f in sorted(root.glob("parable-*.webp")):
        if f.stem.endswith("-480"):
            continue
        out_path = f.with_name(f.stem + "-480.webp")
        with Image.open(f) as im:
            w, h = im.size
            nw, nh = 480, round(h * 480 / w)
            print(f"{out_path.name}: {w}x{h} -> {nw}x{nh}")
            made += 1
            if a.apply:
                im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB").resize((nw, nh), Image.LANCZOS).save(
                    out_path, "WEBP", quality=a.quality, method=6)
    print(f"{made} thumbnail(s) {'written' if a.apply else 'would be written'}.")

print(f"\n{changed} file(s) {'resized' if a.apply else 'would be resized'}.")
if a.apply:
    print(f"Disk saved: {saved/1e6:.1f} MB." + ("" if a.no_backup else f" Originals are in {backup}/"))
else:
    print("Dry run only. Re-run with --apply to write the changes.")
