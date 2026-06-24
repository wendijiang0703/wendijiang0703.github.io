#!/usr/bin/env python3
"""Pull project descriptions, menu structure, About content, and Instagram link
out of the mirrored Cargo HTML. Writes to originals/content.json.
"""
import json, re, html as htm
from pathlib import Path

SNAP = Path(__file__).resolve().parent.parent / 'cargo-snapshot' / 'wendijiang.com'
OUT = Path(__file__).resolve().parent.parent / 'originals' / 'content.json'

PROJECT_FILES = sorted(p.name for p in SNAP.glob('*.html'))

def strip_tags(s: str) -> str:
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.IGNORECASE)
    s = re.sub(r'<[^>]+>', '', s)
    return htm.unescape(s)

def clean(s: str) -> str:
    s = strip_tags(s)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n[ \t]+', '\n', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()

def bodycopies(html: str):
    for m in re.finditer(r'<bodycopy[^>]*>(.*?)</bodycopy>', html, re.DOTALL | re.IGNORECASE):
        yield m.group(1)

def is_template(s: str) -> bool:
    return '{{' in s or '}}' in s

def is_menu(s: str) -> bool:
    plain = strip_tags(s)
    year_hits = sum(1 for y in ('2025', '2024', '2023', '2022', '2021', '2020') if y in plain)
    return year_hits >= 3

def find_menu_html(html: str) -> str | None:
    for raw in bodycopies(html):
        if is_menu(raw):
            return raw
    return None

KNOWN_YEARS = {'2020', '2021', '2022', '2023', '2024', '2025'}

def parse_menu(menu_html: str):
    """Walk through the menu in source order; pair each link with its title text
    and the year heading that most recently preceded it.

    Returns dict:
      featured: [(slug, title)]   — numbered 1-N list at top
      groups: {year: [(slug, title)]}
      about_slug: slug for About link
      tail_links: any extra links
    """
    featured = []
    groups = {}  # year -> list of (slug, title)
    about = None

    # Tokenize: years (as text), links (with their inner text)
    # Pattern: either a year token, or an <a href="...">TEXT</a> block.
    token_re = re.compile(
        r'(?P<year>\b20[12]\d\b)'
        r'|<a\s+href=\\?"(?P<href>[^"\\]+?)\\?"[^>]*>(?P<text>.*?)</a>',
        re.DOTALL | re.IGNORECASE,
    )
    current_year = None
    pos = 0
    for m in token_re.finditer(menu_html):
        if m.group('year'):
            year = m.group('year')
            if year in KNOWN_YEARS:
                current_year = year
                groups.setdefault(year, [])
            continue
        href = m.group('href')
        # Normalize: strip https://wendijiang.com/ prefix, .html suffix
        slug = href.rsplit('/', 1)[-1]
        slug = re.sub(r'\.html?$', '', slug, flags=re.IGNORECASE)
        if not slug or slug == 'Index': continue
        text = clean(m.group('text'))
        # Strip leading "1. " or "N. " numbering
        num_m = re.match(r'^(\d+)\.\s*(.+)$', text)
        is_numbered = bool(num_m)
        if is_numbered:
            text = num_m.group(2)
        if slug.lower() == 'about':
            about = (slug, text or 'About')
            continue
        if is_numbered and current_year is None:
            featured.append((slug, text))
        elif current_year:
            groups[current_year].append((slug, text))
        # else: stray link (Instagram, "and-more-INDEX"); ignore
    return {
        'featured': featured,
        'groups': {y: groups[y] for y in sorted(groups, reverse=True) if groups[y]},
        'about': about,
    }

def extract_project_text(html: str) -> str:
    chunks = []
    for raw in bodycopies(html):
        if is_template(raw) or is_menu(raw):
            continue
        text = clean(raw)
        if len(text) < 20: continue
        chunks.append(text)
    return '\n\n'.join(chunks)

def extract_instagram(html: str):
    m = re.search(r'instagram\.com/([\w._-]+)', html, re.IGNORECASE)
    return m.group(1) if m else None

def main():
    sample = (SNAP / '3-2-1-Boom.html').read_text()
    menu_html = find_menu_html(sample)
    menu = parse_menu(menu_html) if menu_html else {}
    instagram = extract_instagram(sample)

    # Build a flat slug → title map from menu (preserves Cargo's real titles)
    titles = {}
    for s, t in menu.get('featured', []): titles[s] = t
    for year, items in menu.get('groups', {}).items():
        for s, t in items: titles[s] = t
    if menu.get('about'):
        s, t = menu['about']; titles[s] = t

    # Per-page descriptions
    projects = {}
    for fn in PROJECT_FILES:
        slug = fn[:-5]
        if slug == 'Index': continue
        html = (SNAP / fn).read_text()
        text = extract_project_text(html)
        # Try to find a "year" from the menu group
        year = next((y for y, items in menu.get('groups', {}).items()
                     if any(s == slug for s, _ in items)), None)
        projects[slug] = {
            'title': titles.get(slug, slug.replace('-', ' ')),
            'year': year,
            'description': text,
        }

    out = {
        'projects': projects,
        'menu': menu,
        'instagram': instagram,
    }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"Wrote {OUT}")
    print(f"Instagram: {instagram}")
    print(f"Featured ({len(menu['featured'])}):")
    for s, t in menu['featured']: print(f"  - {s} → {t!r}")
    for y, items in menu['groups'].items():
        print(f"\n{y} ({len(items)}):")
        for s, t in items: print(f"  - {s} → {t!r}")
    print(f"\nAbout: {menu.get('about')}")
    print(f"\nProjects with descriptions: {sum(1 for p in projects.values() if p['description'])}/{len(projects)}")

if __name__ == '__main__':
    main()
