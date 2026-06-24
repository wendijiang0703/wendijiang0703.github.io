# wendijiang.com

Personal portfolio site for Wendi Jiang.
Plain HTML + CSS + JS. No build step. Deployed via GitHub Pages.

## Local development

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Push to `main` on GitHub — Pages auto-deploys in ~30 seconds.

```bash
git add .
git commit -m "describe the change"
git push
```

## Structure

```
index.html            homepage
about.html            about page (or merged into homepage)
projects/             one .html per project
assets/css/           shared stylesheet
assets/js/            shared scripts
assets/images/        optimized web images
assets/fonts/         self-hosted webfonts
CNAME                 custom-domain marker for GitHub Pages
originals/            full-res image masters (gitignored)
cargo-snapshot/       reference mirror of the old Cargo site (gitignored)
```

## Adding a new project

1. Duplicate any file in `projects/` and rename it.
2. Drop optimized images into `assets/images/projects/<slug>/`.
3. Add a card linking to the new page on `index.html`.
4. Commit and push.

## Adding photos / video to a project (HEIC, JPG, PNG, MP4 — anything)

Drag-and-drop unlimited files into `incoming/<slug>/` (one folder per project),
then run the ingest script. It converts HEIC → JPG, optimizes to WebP, names
them `01_…`, `02_…` numbered for the project page, and clears the staging
folder when done.

```bash
mkdir -p incoming/The-Button         # folder name = the project slug
# (drag photos + video into incoming/The-Button/ via Finder)
python3 scripts/ingest.py            # process every incoming folder
python3 scripts/generate_pages.py    # rebuild the HTML pages
```

You can drop dozens of files at once — no chat upload limit, no manual
optimization. The `incoming/` folder is gitignored so the raw originals stay
on your laptop.
