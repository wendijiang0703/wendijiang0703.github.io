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
    ['Secondary projects (tag view)', [
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

  // Buttons
  const buttons = document.createElement('div');
  buttons.className = 'tweak-buttons';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'copy CSS';
  copyBtn.addEventListener('click', async () => {
    const lines = ['/* Wendi tweak values */', ':root {'];
    inputs.forEach(({ name, input, unit }) => {
      lines.push(`  ${name}: ${input.value}${unit};`);
    });
    lines.push('}');
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
