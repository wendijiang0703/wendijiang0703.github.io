// Live design-tweak panel. Only initializes on localhost or with ?tweak=1.
// Lets Wendi adjust every visual parameter with real-time sliders, then send
// back the values she likes.

(function () {
  const params = new URLSearchParams(location.search);
  const enabled =
    /^(localhost|127\.|0\.0\.0\.0|::1)/.test(location.hostname) ||
    params.get('tweak') === '1';
  if (!enabled) return;

  // Each row: [cssVar, label, min, max, step, unit]
  const GROUPS = [
    ['Color', [
      ['--accent', 'Accent (scrollbar + active link)', null, null, null, 'color'],
    ]],
    ['Layout', [
      ['--sidebar-w', 'Sidebar width', 160, 360, 4, 'px'],
      ['--sidebar-gap', 'Sidebar→main gap', 24, 160, 4, 'px'],
      ['--page-pad-x', 'Page padding (X)', 16, 120, 2, 'px'],
      ['--page-pad-y', 'Page padding (Y)', 16, 120, 2, 'px'],
      ['--main-max', 'Main content max width', 720, 1400, 20, 'px'],
    ]],
    ['Sidebar typography', [
      ['--sidebar-brand-size', 'Brand size', 0.9, 2.4, 0.05, 'rem'],
      ['--sidebar-brand-weight', 'Brand weight', 300, 800, 25, ''],
      ['--sidebar-nav-size', 'Nav item size', 0.8, 1.5, 0.025, 'rem'],
      ['--sidebar-nav-weight', 'Nav item weight', 300, 700, 25, ''],
      ['--sidebar-year-size', 'Year label size', 0.7, 1.2, 0.025, 'rem'],
      ['--sidebar-line', 'Nav line-height', 1.1, 2.0, 0.05, ''],
      ['--sidebar-item-gap', 'Item gap', 0, 14, 1, 'px'],
      ['--sidebar-section-gap', 'Section gap', 0.4, 3, 0.1, 'em'],
    ]],
    ['Sort pills', [
      ['--pill-size', 'Pill size', 0.7, 1.3, 0.025, 'rem'],
      ['--pill-gap', 'Pill gap', 0.5, 3.5, 0.1, 'rem'],
    ]],
    ['Homepage feed', [
      ['--feed-gap', 'Gap between projects', 1, 10, 0.25, 'rem'],
      ['--feed-title-size', 'Project title size', 0.85, 2, 0.025, 'rem'],
      ['--feed-title-weight', 'Project title weight', 300, 800, 25, ''],
      ['--feed-year-size', 'Year tag size', 0.7, 1.2, 0.025, 'rem'],
      ['--feed-caption-gap', 'Image → caption gap', 0.3, 2.5, 0.05, 'rem'],
    ]],
    ['Year-grouped thumbnail grid (default + all view)', [
      ['--feed-secondary-cols', 'Columns', 2, 5, 1, ''],
      ['--feed-secondary-gap', 'Grid gap', 0.5, 3, 0.1, 'rem'],
      ['--feed-secondary-title-size', 'Title size', 0.7, 1.3, 0.025, 'rem'],
    ]],
    ['Project detail page', [
      ['--project-max', 'Content max width', 540, 1200, 20, 'px'],
      ['--project-title-size', 'Title size', 1.0, 4, 0.05, 'rem'],
      ['--project-title-weight', 'Title weight', 300, 800, 25, ''],
      ['--project-meta-size', 'Meta size', 0.7, 1.2, 0.025, 'rem'],
      ['--project-meta-gap', 'Title→body gap', 0.8, 5, 0.1, 'rem'],
      ['--project-body-size', 'Body size', 0.8, 1.4, 0.025, 'rem'],
      ['--project-body-line', 'Body line-height', 1.2, 2.2, 0.05, ''],
      ['--project-body-max', 'Body max width (ch)', 40, 90, 1, 'ch'],
      ['--project-paragraph-gap', 'Paragraph gap', 0.4, 3, 0.05, 'em'],
      ['--project-body-bottom', 'Body → media gap', 1, 8, 0.25, 'rem'],
      ['--project-media-gap', 'Between images', 0.5, 6, 0.1, 'rem'],
    ]],
  ];

  // Build UI
  const root = document.documentElement;
  const cs = getComputedStyle(root);

  const toggle = document.createElement('button');
  toggle.className = 'tweak-toggle';
  toggle.textContent = '◐ tweak';
  document.body.appendChild(toggle);

  const panel = document.createElement('div');
  panel.className = 'tweak-panel';
  panel.setAttribute('aria-label', 'Design tweak panel');
  document.body.appendChild(panel);

  const STORAGE_KEY = 'tweak-overrides-v2';
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  })();

  const inputs = []; // [{name, input, valueEl, unit, parse}]

  function parseValue(raw, unit) {
    if (!raw) return null;
    const n = parseFloat(raw);
    return isFinite(n) ? n : null;
  }

  function applyVar(name, value, unit) {
    root.style.setProperty(name, value + unit);
  }

  GROUPS.forEach(([heading, rows]) => {
    const h = document.createElement('h3');
    h.textContent = heading;
    panel.appendChild(h);
    rows.forEach(([name, label, min, max, step, unit]) => {
      const row = document.createElement('div');
      row.className = 'tweak-row';

      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      const valEl = document.createElement('span');
      valEl.className = 'v';
      row.appendChild(labelEl);
      row.appendChild(valEl);

      const input = document.createElement('input');

      if (unit === 'color') {
        input.type = 'color';
        input.style.cssText = 'width: 100%; height: 28px; padding: 0; border: 0; background: transparent; cursor: pointer;';
        const computed = cs.getPropertyValue(name).trim() || '#f06b00';
        const initial = saved[name] || computed;
        input.value = initial;
        valEl.textContent = initial;
        root.style.setProperty(name, initial);
        input.addEventListener('input', () => {
          root.style.setProperty(name, input.value);
          valEl.textContent = input.value;
          saved[name] = input.value;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        });
        row.appendChild(input);
        panel.appendChild(row);
        inputs.push({ name, input, valEl, unit });
        return;
      }

      input.type = 'range';
      input.min = min; input.max = max; input.step = step;

      // Initial value: saved override > computed style > min
      let initial;
      if (saved[name] != null) initial = saved[name];
      else {
        const computed = cs.getPropertyValue(name).trim();
        initial = parseValue(computed, unit);
        if (initial == null) initial = min;
      }
      input.value = initial;
      valEl.textContent = `${(+initial).toFixed(step < 1 ? 2 : 0)}${unit}`;

      // Apply on load
      applyVar(name, initial, unit);

      input.addEventListener('input', () => {
        const v = +input.value;
        valEl.textContent = `${v.toFixed(step < 1 ? 2 : 0)}${unit}`;
        applyVar(name, v, unit);
        saved[name] = v;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      });

      row.appendChild(input);
      panel.appendChild(row);
      inputs.push({ name, input, valEl, unit });
    });
  });

  // ----- Archive panel -----
  const ARCHIVE_KEY = 'archived-slugs-v1';
  function getArchived() {
    try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); }
    catch { return []; }
  }
  function setArchived(list) {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list));
    if (window.applyArchiveToDom) window.applyArchiveToDom();
    if (window.refreshTagSort) window.refreshTagSort();
  }

  // Gather all project slugs from the sidebar
  const projectSlugs = Array.from(document.querySelectorAll('.sidebar li[data-slug]')).map((li) => ({
    slug: li.dataset.slug,
    title: li.querySelector('a')?.textContent?.trim() || li.dataset.slug,
  }));
  // Dedupe by slug while preserving order
  const seen = new Set();
  const uniqueSlugs = projectSlugs.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug); return true;
  });

  const archiveHeader = document.createElement('h3');
  archiveHeader.textContent = 'Archive projects';
  panel.appendChild(archiveHeader);

  const archiveHint = document.createElement('div');
  archiveHint.style.cssText = 'font-size: 10px; color: rgba(255,255,255,0.45); margin-bottom: 6px;';
  archiveHint.textContent = 'Checked = hidden from page + sidebar. Visible again via "all" pill.';
  panel.appendChild(archiveHint);

  const archived = new Set(getArchived());
  uniqueSlugs.forEach(({ slug, title }) => {
    const row = document.createElement('label');
    row.style.cssText = 'display: flex; gap: 8px; align-items: center; padding: 2px 0; font-size: 11px; color: rgba(255,255,255,0.85); cursor: pointer;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = archived.has(slug);
    cb.style.accentColor = '#f06b00';
    cb.addEventListener('change', () => {
      const current = new Set(getArchived());
      if (cb.checked) current.add(slug);
      else current.delete(slug);
      setArchived(Array.from(current));
    });
    const txt = document.createElement('span');
    txt.textContent = title;
    row.appendChild(cb);
    row.appendChild(txt);
    panel.appendChild(row);
  });

  // ----- Featured-in tag selector -----
  const FEATURED_KEY = 'featured-overrides-v1';
  const TAGS = ['product', 'ux', 'graphic'];

  function getFeaturedOverrides() {
    try { return JSON.parse(localStorage.getItem(FEATURED_KEY) || '{}'); }
    catch { return {}; }
  }
  function setFeaturedOverrides(map) {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(map));
    applyFeaturedToDom();
    if (window.refreshTagSort) window.refreshTagSort();
  }
  function applyFeaturedToDom() {
    const overrides = getFeaturedOverrides();
    // Apply to BOTH feed-items AND sidebar entries so they stay in sync
    document.querySelectorAll('.feed-item, .sidebar li[data-slug]').forEach((el) => {
      const slug = el.dataset.slug;
      if (overrides[slug] != null) {
        el.dataset.featured = overrides[slug].join(' ');
      }
    });
  }
  // Apply on load (before tag sort runs)
  applyFeaturedToDom();

  const featuredHeader = document.createElement('h3');
  featuredHeader.textContent = 'Featured in (per project)';
  panel.appendChild(featuredHeader);

  const featuredHint = document.createElement('div');
  featuredHint.style.cssText = 'font-size: 10px; color: rgba(255,255,255,0.45); margin-bottom: 8px;';
  featuredHint.textContent = 'Tick = this project shows LARGE in that tag view. Unticked = appears smaller below as "Other work".';
  panel.appendChild(featuredHint);

  const featuredOverrides = getFeaturedOverrides();

  uniqueSlugs.forEach(({ slug, title }) => {
    const item = document.querySelector(`.feed-item[data-slug="${slug}"]`);
    if (!item) return;
    // Initial state: override > server-rendered data-featured
    const initial = featuredOverrides[slug] || (item.dataset.featured || '').split(/\s+/).filter(Boolean);
    const row = document.createElement('div');
    row.style.cssText = 'display: grid; grid-template-columns: 1fr repeat(3, auto); gap: 6px; align-items: center; padding: 3px 0; font-size: 11px; color: rgba(255,255,255,0.85);';
    const name = document.createElement('span');
    name.textContent = title;
    name.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    row.appendChild(name);
    TAGS.forEach((tag) => {
      const wrap = document.createElement('label');
      wrap.style.cssText = 'display: flex; align-items: center; gap: 2px; font-size: 9px; cursor: pointer; color: rgba(255,255,255,0.5);';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = initial.includes(tag);
      cb.style.cssText = 'margin: 0; accent-color: #f06b00; width: 12px; height: 12px;';
      cb.addEventListener('change', () => {
        const cur = getFeaturedOverrides();
        const list = cur[slug] || initial.slice();
        const idx = list.indexOf(tag);
        if (cb.checked && idx < 0) list.push(tag);
        if (!cb.checked && idx >= 0) list.splice(idx, 1);
        cur[slug] = list;
        setFeaturedOverrides(cur);
      });
      const lab = document.createElement('span');
      lab.textContent = tag[0].toUpperCase();
      lab.title = tag;
      wrap.appendChild(cb);
      wrap.appendChild(lab);
      row.appendChild(wrap);
    });
    panel.appendChild(row);
  });

  // Buttons
  const buttons = document.createElement('div');
  buttons.className = 'tweak-buttons';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'copy CSS';
  copyBtn.addEventListener('click', async () => {
    const lines = ['/* Wendi tweak values */', ':root {'];
    inputs.forEach(({ name, input, unit }) => {
      const v = unit === 'color' ? input.value : `${input.value}${unit}`;
      lines.push(`  ${name}: ${v};`);
    });
    lines.push('}');
    lines.push('');
    lines.push('/* Archived projects */');
    lines.push(`/* ${JSON.stringify(getArchived())} */`);
    lines.push('');
    lines.push('/* Featured overrides */');
    lines.push(`/* ${JSON.stringify(getFeaturedOverrides())} */`);
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'copied!';
      setTimeout(() => (copyBtn.textContent = 'copy CSS'), 1200);
    } catch {
      // Fallback: dump to console
      console.log(text);
      copyBtn.textContent = 'logged';
      setTimeout(() => (copyBtn.textContent = 'copy CSS'), 1200);
    }
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'reset all';
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  buttons.appendChild(copyBtn);
  buttons.appendChild(resetBtn);
  panel.appendChild(buttons);

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    toggle.textContent = panel.classList.contains('open') ? '× close' : '◐ tweak';
  });
})();
