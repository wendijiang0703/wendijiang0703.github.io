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

// Tag application: works on every page. Sets body.dataset attributes that
// CSS uses to drive both the sidebar filter and (on the homepage) the main
// content layout. No DOM moves — single source of truth.
function applyTagFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tag = (params.get('tag') || '').toLowerCase();
  document.body.dataset.showArchived = (tag === 'all') ? '1' : '';
  const isTagMode = (tag === 'product' || tag === 'ux' || tag === 'graphic');
  document.body.dataset.tagMode = isTagMode ? tag : '';
  document.querySelectorAll('.feed-controls a').forEach((a) => {
    a.classList.toggle('active', (a.dataset.tag || '') === tag);
  });
}
applyTagFromUrl();
window.refreshTagSort = applyTagFromUrl;

(function homepageTagPills() {
  const layoutGrid = document.getElementById('layout-grid');
  const controls = document.querySelector('.feed-controls');
  if (!controls || !layoutGrid) return;  // only on homepage
  controls.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = a.dataset.tag || '';
      const url = new URL(window.location);
      if (tag) url.searchParams.set('tag', tag);
      else url.searchParams.delete('tag');
      history.replaceState(null, '', url);
      applyTagFromUrl();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})();

// Preserve the active tag when navigating into a project's detail page.
// E.g. on /?tag=ux, clicking a project goes to /projects/X.html?tag=ux —
// so the project's sidebar stays in UX-filtered mode.
(function preserveTagOnProjectLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="/projects/"]');
    if (!a) return;
    const currentTag = document.body.dataset.tagMode || (document.body.dataset.showArchived === '1' ? 'all' : '');
    if (!currentTag) return;
    e.preventDefault();
    const url = new URL(a.href, window.location.origin);
    url.searchParams.set('tag', currentTag);
    window.location.href = url.toString();
  });
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
