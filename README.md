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
