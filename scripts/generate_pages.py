#!/usr/bin/env python3
"""Generate index.html, about.html, and project pages from
   originals/content.json + originals/image_map.json.

Layout: fixed left sidebar (always visible on desktop, collapses to drawer on mobile)
        + big single-column image feed (homepage) or project detail (project pages).
"""
import json, re, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = json.loads((ROOT / 'originals' / 'content.json').read_text())
IMG_ROOT = ROOT / 'assets' / 'images' / 'projects'

PROJECTS = CONTENT['projects']
MENU = CONTENT['menu']
IG = CONTENT.get('instagram')

FEATURED = MENU['featured']            # list of [slug, title]
YEAR_GROUPS = MENU['groups']            # {year: [[slug, title]]}

ALL_SLUGS = (
    [s for s, _ in FEATURED]
    + [s for items in YEAR_GROUPS.values() for s, _ in items]
)

# Sort pill tags (ordered for display)
TAG_ORDER = ['product', 'ux', 'graphic']

def project_images(slug: str) -> list[str]:
    d = IMG_ROOT / slug
    if not d.exists(): return []
    return sorted(p.name for p in d.iterdir() if p.suffix == '.webp')

def tags(slug: str) -> list[str]:
    return PROJECTS.get(slug, {}).get('tags', []) or []

# ---------- Sidebar ----------
def render_sidebar(active: str | None) -> str:
    def link(slug, title):
        cls = ' class="active"' if slug == active else ''
        return f'<a href="/projects/{slug}.html"{cls}>{html.escape(title)}</a>'

    parts = []
    parts.append(f'<div class="sidebar-brand"><a href="/">🪑 Wendi Jiang</a></div>')
    parts.append('<nav class="menu" aria-label="Site">')
    parts.append('<ol class="menu-featured">')
    for slug, title in FEATURED:
        parts.append(f'  <li>{link(slug, title)}</li>')
    parts.append('</ol>')
    parts.append('<div class="menu-sep">and some graphic design…</div>')
    for year in YEAR_GROUPS:
        parts.append(f'<div class="menu-year">{year}</div>')
        parts.append('<ul>')
        for slug, title in YEAR_GROUPS[year]:
            parts.append(f'  <li>{link(slug, title)}</li>')
        parts.append('</ul>')
    about_cls = ' class="active"' if active == 'About' else ''
    parts.append(f'<div class="menu-about"><a href="/about.html"{about_cls}>About</a></div>')
    if IG:
        parts.append(f'<div class="menu-ig"><a href="https://www.instagram.com/{IG}" target="_blank" rel="noopener">@{IG}</a></div>')
    parts.append('</nav>')
    return '\n      '.join(parts)

# ---------- Layout ----------
def layout(*, title: str, body: str, active: str | None = None) -> str:
    import os, hashlib
    # Cache-bust CSS + JS via short hash of file contents
    def vh(path):
        try:
            return hashlib.md5((ROOT / path.lstrip('/')).read_bytes()).hexdigest()[:8]
        except Exception:
            return ''
    css_v = vh('assets/css/style.css')
    js_v = vh('assets/js/main.js')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="Wendi Jiang — design portfolio">
  <link rel="stylesheet" href="/assets/css/style.css?v={css_v}">
</head>
<body>
  <button class="mobile-menu-toggle" aria-label="Open menu">☰</button>
  <div class="app">
    <aside class="sidebar" aria-label="Site navigation">
      {render_sidebar(active)}
    </aside>
    <main class="main">
{body}
    </main>
  </div>
  <script src="/assets/js/main.js?v={js_v}"></script>
</body>
</html>
'''

# ---------- Helpers ----------
def paragraphs(text: str) -> str:
    if not text: return ''
    paras = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    return '\n'.join(
        f'        <p>{html.escape(p).replace(chr(10), "<br>")}</p>'
        for p in paras
    )

def feed_item(slug: str, title: str) -> str:
    imgs = project_images(slug)
    if not imgs: return ''
    cover = imgs[0]
    data = PROJECTS.get(slug, {})
    year = data.get('year') or ''
    tag_attr = ' '.join(data.get('tags', []) or [])
    return f'''      <a class="feed-item" data-tags="{tag_attr}" data-year="{year}" href="/projects/{slug}.html">
        <div class="feed-image"><img src="/assets/images/projects/{slug}/{cover}" alt="{html.escape(title)}" loading="lazy"></div>
        <div class="feed-caption">
          <span class="feed-title">{html.escape(title)}</span>
          {f'<span class="feed-year">{year}</span>' if year else ''}
        </div>
      </a>'''

# ---------- Page builders ----------
def build_index():
    # Build feed in default order: featured first (which already includes the chair series), then year-grouped projects
    items = []
    for slug, title in FEATURED:
        items.append(feed_item(slug, title))
    for year, projects in YEAR_GROUPS.items():
        for slug, title in projects:
            items.append(feed_item(slug, title))
    items = [x for x in items if x]

    pills = '\n          '.join(
        f'<a href="?tag={t}" data-tag="{t}">{t}</a>' for t in TAG_ORDER
    )

    body = f'''      <div class="feed-controls">
        <span class="label">sort</span>
        <a href="/" data-tag="">all</a>
        {pills}
      </div>
      <section class="feed">
{chr(10).join(items)}
      </section>'''
    (ROOT / 'index.html').write_text(layout(title='Wendi Jiang — Design', body=body, active='index'))
    print(f"  index.html ({len(items)} items)")

def build_about():
    text = PROJECTS.get('About', {}).get('description', '')
    body = f'''      <article class="project about">
        <h1 class="project-title">About</h1>
        <div class="project-body">
{paragraphs(text) if text else '          <p>About content goes here.</p>'}
        </div>
      </article>'''
    (ROOT / 'about.html').write_text(layout(title='About — Wendi Jiang', body=body, active='About'))
    print(f"  about.html")

def build_project(slug: str):
    data = PROJECTS.get(slug, {})
    menu_title = data.get('title') or slug.replace('-', ' ')
    year = data.get('year')
    desc = data.get('description', '')
    video = data.get('video')

    # First line of description is the canonical title in Cargo's content.
    title = menu_title
    if desc:
        first, _, rest = desc.partition('\n')
        first = first.strip()
        if first and len(first) < 120:
            title = first
            desc = rest.strip()

    imgs = project_images(slug)
    media_parts = []
    if video:
        media_parts.append(
            f'        <div class="video-wrap"><iframe src="{html.escape(video)}" '
            f'title="{html.escape(title)} video" frameborder="0" '
            f'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
            f'allowfullscreen></iframe></div>'
        )
    for fn in imgs:
        media_parts.append(
            f'        <img src="/assets/images/projects/{slug}/{fn}" alt="" loading="lazy">'
        )
    media = '\n'.join(media_parts)

    meta_bits = []
    if year: meta_bits.append(year)
    if data.get('tags'): meta_bits.append(' / '.join(data['tags']))
    meta_line = f'<div class="project-meta">{" · ".join(meta_bits)}</div>' if meta_bits else ''

    body_text = paragraphs(desc)
    desc_block = f'''        <div class="project-body">
{body_text}
        </div>''' if body_text else ''

    body = f'''      <article class="project">
        <h1 class="project-title">{html.escape(title)}</h1>
        {meta_line}
{desc_block}
        <div class="project-media">
{media}
        </div>
      </article>'''
    out = ROOT / 'projects' / f'{slug}.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(layout(title=f'{title} — Wendi Jiang', body=body, active=slug))
    print(f"  projects/{slug}.html ({len(imgs)} imgs{', video' if video else ''}, {len(desc)}c)")

if __name__ == '__main__':
    print("Generating pages...")
    build_index()
    build_about()
    for slug in ALL_SLUGS:
        build_project(slug)
    print("Done.")
