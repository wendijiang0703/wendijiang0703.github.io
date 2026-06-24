// Site menu toggle
(function () {
  const btn = document.querySelector('.menu-button');
  const menu = document.querySelector('.site-menu');
  const close = menu && menu.querySelector('.close');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => menu.classList.add('open'));
  if (close) close.addEventListener('click', () => menu.classList.remove('open'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menu.classList.remove('open');
  });
})();
