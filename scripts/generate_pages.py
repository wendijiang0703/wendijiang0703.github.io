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
    def li(slug, title):
        data = PROJECTS.get(slug, {})
        tags_attr = ' '.join(data.get('tags', []) or [])
        featured_attr = ' '.join(data.get('featured_in', []) or [])
        archived_attr = 'true' if data.get('archived') else 'false'
        return f'<li data-slug="{slug}" data-tags="{tags_attr}" data-featured="{featured_attr}" data-archived="{archived_attr}">{link(slug, title)}</li>'

    parts = []
    parts.append(f'<div class="sidebar-brand"><a href="/">🪑 Wendi Jiang</a></div>')
    parts.append('<nav class="menu" aria-label="Site">')
    # Year-grouped only — no more numbered featured list
    for year in YEAR_GROUPS:
        parts.append(f'<div class="menu-year">{year}</div>')
        parts.append('<ul>')
        for slug, title in YEAR_GROUPS[year]:
            parts.append(f'  {li(slug, title)}')
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
    pills = '\n          '.join(
        f'<a href="/?tag={t}" data-tag="{t}">{t}</a>' for t in TAG_ORDER
    )
    pills_bar = f'''      <div class="feed-controls">
        {pills}
        <a href="/?tag=all" data-tag="all">all</a>
      </div>'''
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
{pills_bar}
{body}
    </main>
  </div>
  <script src="/assets/js/main.js?v={js_v}"></script>
  <script src="/assets/js/tweak.js?v={vh('assets/js/tweak.js')}"></script>
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
    featured_attr = ' '.join(data.get('featured_in', []) or [])
    archived_attr = 'true' if data.get('archived') else 'false'
    return f'''      <a class="feed-item" data-slug="{slug}" data-tags="{tag_attr}" data-featured="{featured_attr}" data-year="{year}" data-archived="{archived_attr}" href="/projects/{slug}.html">
        <div class="feed-image"><img src="/assets/images/projects/{slug}/{cover}" alt="{html.escape(title)}" loading="lazy"></div>
        <div class="feed-caption">
          <span class="feed-title">{html.escape(title)}</span>
          {f'<span class="feed-year">{year}</span>' if year else ''}
        </div>
      </a>'''

# ---------- Page builders ----------
def build_index():
    # Two layouts: year-grouped small thumb grid (default + all) and big-card
    # single-column (tag mode). JS swaps which one is visible.
    # Note: pill bar is rendered by layout() — global on every page.

    # Year-grouped grid (small thumbs)
    year_sections = []
    for year, projects in YEAR_GROUPS.items():
        items = []
        for slug, title in projects:
            it = feed_item(slug, title)
            if it: items.append(it)
        if not items: continue
        year_sections.append(f'''      <section class="year-section" data-year="{year}">
        <h2 class="year-heading">{year}</h2>
        <div class="thumb-grid">
{chr(10).join(items)}
        </div>
      </section>''')

    # Big-card linear feed (used in tag mode). All projects, JS hides non-featured.
    all_items = []
    for year, projects in YEAR_GROUPS.items():
        for slug, title in projects:
            it = feed_item(slug, title)
            if it: all_items.append(it)

    body = f'''      <div class="layout-grid" id="layout-grid">
{chr(10).join(year_sections)}
      </div>
      <section class="feed" id="feed-primary" hidden>
{chr(10).join(all_items)}
      </section>'''
    (ROOT / 'index.html').write_text(layout(title='Wendi Jiang — Design', body=body, active='index'))
    total = sum(1 for ys in year_sections)
    print(f"  index.html ({total} year sections, {len(all_items)} total items)")

def build_about():
    text = PROJECTS.get('About', {}).get('description', '')
    portrait_imgs = project_images('About')
    portrait_html = ''
    if portrait_imgs:
        portrait_html = f'''        <div class="about-portrait">
          <img src="/assets/images/projects/About/{portrait_imgs[0]}" alt="Wendi Jiang">
        </div>'''
    body = f'''      <article class="project about">
        <h1 class="project-title">About</h1>
{portrait_html}
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
    use_carousel = bool(data.get('carousel'))
    external_link = data.get('external_link')
    external_label = data.get('external_label', 'Open ↗')
    media_parts = []
    if video:
        # Convert /embed/ID to a watch URL for the "open on YouTube" fallback link
        m = re.search(r'/embed/([A-Za-z0-9_-]+)', video)
        yt_id = m.group(1) if m else None
        watch_url = f'https://www.youtube.com/watch?v={yt_id}' if yt_id else video
        media_parts.append(
            f'''        <div>
          <div class="video-wrap"><iframe src="{html.escape(video)}" '''
            f'title="{html.escape(title)} video" frameborder="0" '
            f'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
            f'allowfullscreen></iframe></div>\n'
            f'          <a class="video-link" href="{html.escape(watch_url)}" target="_blank" rel="noopener">Open on YouTube ↗</a>\n'
            f'        </div>'
        )
    if use_carousel and imgs:
        slides = '\n'.join(
            f'          <div class="carousel-slide"><img src="/assets/images/projects/{slug}/{fn}" alt="" loading="lazy"></div>'
            for fn in imgs
        )
        dots = '\n'.join(
            f'          <button class="carousel-dot{" active" if i == 0 else ""}" data-i="{i}" aria-label="Go to slide {i+1}"></button>'
            for i in range(len(imgs))
        )
        media_parts.append(f'''        <div class="carousel" data-count="{len(imgs)}">
          <div class="carousel-track">
{slides}
          </div>
          <button class="carousel-arrow prev" aria-label="Previous">‹</button>
          <button class="carousel-arrow next" aria-label="Next">›</button>
          <div class="carousel-dots">
{dots}
          </div>
        </div>''')
    else:
        for i, fn in enumerate(imgs):
            img_tag = f'<img src="/assets/images/projects/{slug}/{fn}" alt="" loading="lazy">'
            if i == 0 and external_link:
                media_parts.append(
                    f'        <a class="external-link-img" href="{html.escape(external_link)}" target="_blank" rel="noopener" data-label="{html.escape(external_label)}">{img_tag}</a>'
                )
            else:
                media_parts.append(f'        {img_tag}')
    media = '\n'.join(media_parts)

    meta_bits = []
    if year: meta_bits.append(year)
    if data.get('tags'): meta_bits.append(' / '.join(data['tags']))
    meta_line = f'<div class="project-meta">{" · ".join(meta_bits)}</div>' if meta_bits else ''

    # Award callout (one or more)
    awards_html = ''
    for a in data.get('awards', []) or []:
        awards_html += (
            f'\n        <a class="award" href="{html.escape(a["url"])}" target="_blank" rel="noopener">'
            f'<span class="award-icon">★</span> {html.escape(a["name"])} ↗</a>'
        )

    body_text = paragraphs(desc)
    desc_block = f'''        <div class="project-body">
{body_text}
        </div>''' if body_text else ''

    body = f'''      <article class="project">
        <h1 class="project-title">{html.escape(title)}</h1>
        {meta_line}{awards_html}
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
