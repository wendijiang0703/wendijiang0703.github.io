// Mobile sidebar toggle + homepage tag sort with primary/secondary split

(function mobileMenu() {
  const btn = document.querySelector('.mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    btn.textContent = sidebar.classList.contains('open') ? '×' : '☰';
  });
  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('open')) return;
    if (sidebar.contains(e.target) || btn.contains(e.target)) return;
    sidebar.classList.remove('open');
    btn.textContent = '☰';
  });
  sidebar.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && window.matchMedia('(max-width: 900px)').matches) {
      sidebar.classList.remove('open');
      btn.textContent = '☰';
    }
  });
})();

(function tagSort() {
  const controls = document.querySelector('.feed-controls');
  const primary = document.getElementById('feed-primary');
  const secondary = document.getElementById('feed-secondary');
  const label = secondary && secondary.querySelector('.feed-secondary-label');
  if (!controls || !primary) return;

  // Capture default order (full set, in their original DOM positions).
  const allItems = Array.from(primary.querySelectorAll('.feed-item'));

  function applyTag(tag, { updateUrl = false } = {}) {
    controls.querySelectorAll('a').forEach((a) => {
      a.classList.toggle('active', (a.dataset.tag || '') === (tag || ''));
    });

    if (!tag) {
      // Default view: everything in primary (full size), secondary hidden.
      allItems.forEach((el) => primary.appendChild(el));
      if (secondary) secondary.hidden = true;
    } else {
      // Tag view: items featured for this tag → primary; everything else → secondary.
      const big = [];
      const small = [];
      allItems.forEach((el) => {
        const featured = (el.dataset.featured || '').split(/\s+/);
        if (featured.includes(tag)) big.push(el);
        else small.push(el);
      });
      // Re-append in order
      big.forEach((el) => primary.appendChild(el));
      if (secondary) {
        // Keep the label as the first child
        Array.from(secondary.querySelectorAll('.feed-item')).forEach((el) => el.remove());
        small.forEach((el) => secondary.appendChild(el));
        secondary.hidden = small.length === 0;
        if (label) label.textContent = `Other work — also worth a look`;
      }
    }

    if (updateUrl) {
      const url = new URL(window.location);
      if (tag) url.searchParams.set('tag', tag);
      else url.searchParams.delete('tag');
      history.replaceState(null, '', url);
    }
  }

  controls.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = a.dataset.tag || '';
      applyTag(tag, { updateUrl: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  const params = new URLSearchParams(window.location.search);
  const initial = (params.get('tag') || '').toLowerCase();
  applyTag(initial);
})();
