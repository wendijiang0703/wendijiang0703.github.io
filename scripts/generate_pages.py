#!/usr/bin/env python3
"""Generate index.html, about.html, and project pages from
   originals/content.json + originals/image_map.json.

Run after re-extracting content or adding new images. Idempotent.
"""
import json, os, re, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = json.loads((ROOT / 'originals' / 'content.json').read_text())
IMG_ROOT = ROOT / 'assets' / 'images' / 'projects'

PROJECTS = CONTENT['projects']
MENU = CONTENT['menu']
IG = CONTENT.get('instagram')

FEATURED = MENU['featured']             # list of (slug, title)
YEAR_GROUPS = MENU['groups']            # {year: [(slug, title)]} sorted desc

ALL_SLUGS = (
    [s for s, _ in FEATURED]
    + [s for items in YEAR_GROUPS.values() for s, _ in items]
)

def project_images(slug: str) -> list[str]:
    d = IMG_ROOT / slug
    if not d.exists(): return []
    return sorted(p.name for p in d.iterdir() if p.suffix == '.webp')

# ---------- Menu rendering ----------
def render_menu(active: str | None) -> str:
    def link(slug, title, *, prefix=''):
        cls = ' class="active"' if slug == active else ''
        # Featured numbered items get rendered with a number prefix
        label = f'{prefix}{html.escape(title)}'
        return f'<li><a href="/projects/{slug}.html"{cls}>{label}</a></li>'

    parts = ['<ul class="menu-list">']
    parts.append(f'<li class="menu-home"><a href="/"{ " class=\"active\"" if active == "index" else "" }>🪑</a></li>')
    parts.append('<li class="menu-section">')
    parts.append('<ul class="menu-featured">')
    for i, (slug, title) in enumerate(FEATURED, 1):
        parts.append(link(slug, title, prefix=f'{i}. '))
    parts.append('</ul></li>')
    parts.append('<li class="menu-sep"><a href="#">and some graphic design&hellip;</a></li>')
    for year in YEAR_GROUPS:
        parts.append(f'<li class="menu-section"><div class="menu-year">{year}</div><ul>')
        for slug, title in YEAR_GROUPS[year]:
            parts.append(link(slug, title))
        parts.append('</ul></li>')
    about_cls = ' class="active"' if active == 'About' else ''
    parts.append(f'<li class="menu-about"><a href="/about.html"{about_cls}>About</a></li>')
    if IG:
        parts.append(f'<li class="menu-ig"><a href="https://www.instagram.com/{IG}" target="_blank" rel="noopener">@{IG}</a></li>')
    parts.append('</ul>')
    return '\n        '.join(parts)

# ---------- Layout ----------
def layout(*, title: str, body: str, active: str | None = None) -> str:
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="Wendi Jiang — design portfolio">
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
  <a class="brand" href="/">🪑 Wendi Jiang</a>
  <button class="menu-button" aria-label="Open menu">☰</button>
  <nav class="site-menu" aria-label="Site navigation">
    <button class="close" aria-label="Close menu">×</button>
    {render_menu(active)}
  </nav>
  <main class="page">
{body}
  </main>
  <script src="/assets/js/main.js"></script>
</body>
</html>
'''

# ---------- Helpers ----------
def thumb(slug: str, title: str, *, number: int | None = None) -> str:
    imgs = project_images(slug)
    if not imgs:
        return ''  # skip until images exist
    cover = imgs[0]
    prefix = f'<span class="thumb-number">{number}.</span> ' if number else ''
    return f'''      <a class="thumb" href="/projects/{slug}.html">
        <div class="thumb-image"><img src="/assets/images/projects/{slug}/{cover}" alt="{html.escape(title)}" loading="lazy"></div>
        <div class="thumb-title">{prefix}{html.escape(title)}</div>
      </a>'''

def paragraphs(text: str) -> str:
    if not text: return ''
    paras = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    return '\n'.join(f'        <p>{html.escape(p).replace(chr(10), "<br>")}</p>' for p in paras)

# ---------- Page builders ----------
def build_index():
    sections = []

    # Featured section (numbered)
    featured_thumbs = [thumb(s, t, number=i) for i, (s, t) in enumerate(FEATURED, 1)]
    featured_thumbs = [x for x in featured_thumbs if x]
    if featured_thumbs:
        sections.append(f'''    <section class="home-section home-featured">
      <h2 class="home-heading">Selected work</h2>
      <div class="thumbnails">
{chr(10).join(featured_thumbs)}
      </div>
    </section>''')

    # Each year group
    for year, items in YEAR_GROUPS.items():
        thumbs = [thumb(s, t) for s, t in items]
        thumbs = [x for x in thumbs if x]
        if not thumbs: continue
        sections.append(f'''    <section class="home-section">
      <h2 class="home-heading">{year}</h2>
      <div class="thumbnails">
{chr(10).join(thumbs)}
      </div>
    </section>''')

    body = '\n'.join(sections)
    (ROOT / 'index.html').write_text(layout(title='Wendi Jiang — Design', body=body, active='index'))
    print(f"  index.html")

def build_about():
    text = PROJECTS.get('About', {}).get('description', '')
    body = f'''    <article class="project about">
      <h1 class="project-title">About</h1>
      <div class="project-body">
{paragraphs(text) if text else '        <p>About content goes here.</p>'}
      </div>
    </article>'''
    (ROOT / 'about.html').write_text(layout(title='About — Wendi Jiang', body=body, active='About'))
    print(f"  about.html")

def build_project(slug: str):
    data = PROJECTS.get(slug, {})
    menu_title = data.get('title') or slug.replace('-', ' ')
    year = data.get('year')
    desc = data.get('description', '')
    # In Cargo, the first line of the page body is the project title heading.
    # Use it as the canonical title (more accurate than the menu link text),
    # and strip it from the description body.
    title = menu_title
    if desc:
        first, _, rest = desc.partition('\n')
        first = first.strip()
        if first and len(first) < 120:
            title = first
            desc = rest.strip()

    imgs = project_images(slug)
    media = '\n'.join(
        f'        <img src="/assets/images/projects/{slug}/{fn}" alt="" loading="lazy">'
        for fn in imgs
    )
    meta_line = f'<div class="project-meta">{year}</div>' if year else ''
    body_text = paragraphs(desc)
    desc_block = f'''      <div class="project-body">
{body_text}
      </div>''' if body_text else ''

    body = f'''    <article class="project">
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
    print(f"  projects/{slug}.html ({len(imgs)} imgs, {len(desc)}c desc)")

if __name__ == '__main__':
    print("Generating pages...")
    build_index()
    build_about()
    for slug in ALL_SLUGS:
        build_project(slug)
    print("Done.")
