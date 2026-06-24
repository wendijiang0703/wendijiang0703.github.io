// Mobile sidebar toggle + homepage tag sort/reorder

(function mobileMenu() {
  const btn = document.querySelector('.mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    btn.textContent = sidebar.classList.contains('open') ? '×' : '☰';
  });
  // Close when tapping outside the sidebar
  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('open')) return;
    if (sidebar.contains(e.target) || btn.contains(e.target)) return;
    sidebar.classList.remove('open');
    btn.textContent = '☰';
  });
  // Close when clicking a link inside the sidebar (mobile)
  sidebar.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && window.matchMedia('(max-width: 900px)').matches) {
      sidebar.classList.remove('open');
      btn.textContent = '☰';
    }
  });
})();

(function tagSort() {
  const controls = document.querySelector('.feed-controls');
  const feed = document.querySelector('.feed');
  if (!controls || !feed) return;

  const items = Array.from(feed.querySelectorAll('.feed-item'));
  // Capture default order once.
  const defaultOrder = items.slice();

  function applyTag(tag, { updateUrl = false } = {}) {
    // Update active pill
    controls.querySelectorAll('a').forEach((a) => {
      const t = a.dataset.tag || '';
      a.classList.toggle('active', t === (tag || ''));
    });

    // Reorder DOM: items WITH the tag first (in default order), then the rest (in default order).
    let next;
    if (!tag) {
      next = defaultOrder.slice();
    } else {
      const withTag = [];
      const without = [];
      defaultOrder.forEach((el) => {
        const ts = (el.dataset.tags || '').split(/\s+/);
        if (ts.includes(tag)) withTag.push(el);
        else without.push(el);
      });
      next = withTag.concat(without);
    }
    // Re-append in new order; DOM efficiently moves nodes.
    const frag = document.createDocumentFragment();
    next.forEach((el) => frag.appendChild(el));
    feed.appendChild(frag);

    if (updateUrl) {
      const url = new URL(window.location);
      if (tag) url.searchParams.set('tag', tag);
      else url.searchParams.delete('tag');
      history.replaceState(null, '', url);
    }
  }

  // Wire pill clicks
  controls.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = a.dataset.tag || '';
      applyTag(tag, { updateUrl: true });
      // Scroll to top of feed on tag change so user sees the new ordering
      feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Apply URL param on load
  const params = new URLSearchParams(window.location.search);
  const initial = (params.get('tag') || '').toLowerCase();
  if (initial) applyTag(initial);
  else applyTag(''); // sets the "all" pill active
})();
