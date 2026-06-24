// Mobile sidebar + tag sort + archive + carousel

const ARCHIVE_KEY = 'archived-slugs-v1';

function getArchived() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); }
  catch { return []; }
}

function applyArchiveToDom() {
  const archived = new Set(getArchived());
  document.querySelectorAll('.feed-item').forEach((el) => {
    el.dataset.archived = archived.has(el.dataset.slug) ? 'true' : 'false';
  });
  document.querySelectorAll('.sidebar li[data-slug]').forEach((el) => {
    el.dataset.archived = archived.has(el.dataset.slug) ? 'true' : 'false';
  });
}

// Run archive masking ASAP (before any tag-sort logic)
applyArchiveToDom();
window.applyArchiveToDom = applyArchiveToDom; // tweak panel calls this

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

  const allItems = Array.from(primary.querySelectorAll('.feed-item'));

  function applyTag(tag, { updateUrl = false } = {}) {
    controls.querySelectorAll('a').forEach((a) => {
      a.classList.toggle('active', (a.dataset.tag || '') === (tag || ''));
    });

    // "all" mode: show everything including archived
    if (tag === 'all') {
      document.body.dataset.showArchived = '1';
    } else {
      document.body.dataset.showArchived = '';
    }

    // Sidebar mode: when filtering by product/ux/graphic, hide year headers + non-matching projects
    if (tag === 'product' || tag === 'ux' || tag === 'graphic') {
      document.body.dataset.tagMode = tag;
    } else {
      document.body.dataset.tagMode = '';
    }

    const archived = new Set(getArchived());

    if (!tag || tag === 'all') {
      // Default + all: items in default order; archived hidden via CSS unless "all"
      allItems.forEach((el) => primary.appendChild(el));
      if (secondary) {
        Array.from(secondary.querySelectorAll('.feed-item')).forEach((el) => el.remove());
        secondary.hidden = true;
      }
    } else {
      // Tag view: split into featured-for-tag (big) and others (small grid)
      // Archived items are dropped entirely from tag-filtered views.
      const big = [];
      const small = [];
      allItems.forEach((el) => {
        if (archived.has(el.dataset.slug)) return;
        const featured = (el.dataset.featured || '').split(/\s+/);
        if (featured.includes(tag)) big.push(el);
        else small.push(el);
      });
      // Archived items still need a home in the DOM tree (for restoring later)
      const archivedItems = allItems.filter((el) => archived.has(el.dataset.slug));
      big.forEach((el) => primary.appendChild(el));
      archivedItems.forEach((el) => primary.appendChild(el)); // hidden via CSS
      if (secondary) {
        Array.from(secondary.querySelectorAll('.feed-item')).forEach((el) => el.remove());
        small.forEach((el) => secondary.appendChild(el));
        secondary.hidden = small.length === 0;
        if (label) label.textContent = 'Other work';
      }
    }

    if (updateUrl) {
      const url = new URL(window.location);
      if (tag) url.searchParams.set('tag', tag);
      else url.searchParams.delete('tag');
      history.replaceState(null, '', url);
    }
  }

  // Expose so tweak panel can re-run after archive changes
  window.refreshTagSort = () => {
    const params = new URLSearchParams(window.location.search);
    applyTag((params.get('tag') || '').toLowerCase());
  };

  controls.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      applyTag(a.dataset.tag || '', { updateUrl: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  const params = new URLSearchParams(window.location.search);
  applyTag((params.get('tag') || '').toLowerCase());
})();

// On project detail pages: if the current project is archived, still let the
// page render (don't hide it) — the sidebar still shows it dimly so you can
// navigate away. Also: when ?tag=all, reveal everything in the sidebar.
(function projectPageArchiveReveal() {
  const params = new URLSearchParams(location.search);
  if (params.get('tag') === 'all') document.body.dataset.showArchived = '1';
  // If we're on an archived project's detail page, still reveal it in sidebar
  const active = document.querySelector('.sidebar a.active');
  if (active && active.closest('li[data-archived="true"]')) {
    document.body.dataset.showArchived = '1';
  }
})();

(function carousels() {
  document.querySelectorAll('.carousel').forEach((c) => {
    const track = c.querySelector('.carousel-track');
    const slides = c.querySelectorAll('.carousel-slide');
    const prev = c.querySelector('.carousel-arrow.prev');
    const next = c.querySelector('.carousel-arrow.next');
    const dots = c.querySelectorAll('.carousel-dot');
    let i = 0;
    function go(to) {
      i = Math.max(0, Math.min(slides.length - 1, to));
      track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('active', di === i));
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
    }
    prev.addEventListener('click', () => go(i - 1));
    next.addEventListener('click', () => go(i + 1));
    dots.forEach((d) => d.addEventListener('click', () => go(+d.dataset.i)));
    // Keyboard arrows when focused
    c.tabIndex = 0;
    c.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(i - 1);
      if (e.key === 'ArrowRight') go(i + 1);
    });
    go(0);
  });
})();
