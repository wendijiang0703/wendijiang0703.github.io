#!/usr/bin/env python3
"""Pick up files from incoming/<slug>/ folders, optimize them, and place
them under assets/images/projects/<slug>/.

Supports JPG / PNG / HEIC / WEBP images and MP4 videos.

Usage:
  python3 scripts/ingest.py            # process every folder under incoming/
  python3 scripts/ingest.py The-Button # process only one folder
"""
import sys, os, re, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCOMING = ROOT / 'incoming'
PROJECTS = ROOT / 'assets' / 'images' / 'projects'
MAX_WIDTH = 1600
QUALITY = 78
HEIC_EXTS = {'.heic', '.HEIC'}
IMG_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP'} | HEIC_EXTS
VIDEO_EXTS = {'.mp4', '.mov', '.MP4', '.MOV'}

def slugify_filename(name: str) -> str:
    base = os.path.splitext(name)[0]
    return re.sub(r'[^A-Za-z0-9._-]', '_', base)[:80]

def heic_to_jpg(src: Path, dst: Path):
    """Use macOS sips to convert HEIC to JPG."""
    subprocess.run(['sips', '-s', 'format', 'jpeg', str(src), '--out', str(dst)],
                   check=True, capture_output=True)

def optimize_to_webp(src: Path, dst: Path):
    """Resize and convert to webp using cwebp."""
    subprocess.run(['cwebp', '-quiet', '-q', str(QUALITY), '-resize', str(MAX_WIDTH), '0',
                    '-metadata', 'none', str(src), '-o', str(dst)],
                   check=True, capture_output=True)

def process_folder(slug: str):
    src_dir = INCOMING / slug
    if not src_dir.is_dir():
        print(f"  [skip] no folder: {src_dir}")
        return
    dst_dir = PROJECTS / slug
    dst_dir.mkdir(parents=True, exist_ok=True)

    # Existing images we'll keep — count to know what index to start at
    existing = sorted(p.name for p in dst_dir.iterdir() if p.suffix == '.webp')
    next_idx = 1
    if existing:
        last = existing[-1]
        m = re.match(r'(\d+)_', last)
        if m: next_idx = int(m.group(1)) + 1

    files = sorted(p for p in src_dir.iterdir() if p.is_file() and not p.name.startswith('.'))
    print(f"\n{slug}: processing {len(files)} file(s) (next idx {next_idx})")

    for f in files:
        ext = f.suffix
        clean = slugify_filename(f.name)

        if ext in HEIC_EXTS:
            tmp_jpg = src_dir / f'{clean}.jpg'
            try:
                heic_to_jpg(f, tmp_jpg)
                dst = dst_dir / f'{next_idx:02d}_{clean}.webp'
                optimize_to_webp(tmp_jpg, dst)
                tmp_jpg.unlink(missing_ok=True)
                print(f"  HEIC → {dst.name}")
                next_idx += 1
            except subprocess.CalledProcessError as e:
                print(f"  [fail] {f.name}: {e}")
        elif ext in IMG_EXTS:
            dst = dst_dir / f'{next_idx:02d}_{clean}.webp'
            try:
                optimize_to_webp(f, dst)
                print(f"  {ext} → {dst.name}")
                next_idx += 1
            except subprocess.CalledProcessError as e:
                print(f"  [fail] {f.name}: {e}")
        elif ext in VIDEO_EXTS:
            dst = dst_dir / f'{next_idx:02d}_{clean}{ext.lower()}'
            shutil.copy2(f, dst)
            print(f"  video → {dst.name}")
            next_idx += 1
        else:
            print(f"  [skip] unknown ext: {f.name}")

    # Empty the incoming folder once done (keep the folder for next batch)
    for f in files:
        try: f.unlink()
        except Exception: pass

def normalize_to_slug(folder_name: str) -> str:
    """'the button' / 'the_button' / 'TheButton' → 'The-Button' if such a slug exists."""
    import json
    try:
        c = json.load(open(ROOT / 'originals' / 'content.json'))
        known = set(c['projects'].keys())
    except Exception:
        known = set()
    # Exact match wins
    if folder_name in known: return folder_name
    # Otherwise: collapse separators + lowercase, then look for a slug that matches
    key = re.sub(r'[\s_-]+', '', folder_name).lower()
    for slug in known:
        if re.sub(r'[\s_-]+', '', slug).lower() == key:
            return slug
    return folder_name  # fall back to original

if __name__ == '__main__':
    if not INCOMING.exists():
        INCOMING.mkdir()
    if len(sys.argv) > 1:
        raw_targets = [sys.argv[1]]
    else:
        raw_targets = [p.name for p in INCOMING.iterdir() if p.is_dir() and not p.name.startswith('.')]
    for raw in raw_targets:
        slug = normalize_to_slug(raw)
        if slug != raw:
            old_dir = INCOMING / raw
            new_dir = INCOMING / slug
            if not new_dir.exists():
                old_dir.rename(new_dir)
                print(f"renamed: {raw} -> {slug}")
            else:
                # Move files in if target already exists
                for f in old_dir.iterdir():
                    if not f.name.startswith('.'):
                        shutil.move(str(f), str(new_dir / f.name))
                old_dir.rmdir()
        process_folder(slug)
    print("\nDone. Run `python3 scripts/generate_pages.py` to rebuild pages.")
