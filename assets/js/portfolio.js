/* Personal edition — progressive enhancement. No dependencies, no page lock. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = $('#mobile-nav');
  const toggle = $('.menu-toggle');

  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть меню');
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('click', event => {
    if (!menu.hidden && !event.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) closeMenu(true);
  });
  matchMedia('(min-width: 601px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });

  // Four real repositories, filtered without fetching or changing their links.
  const cards = $$('.project-card');
  const filters = $$('[data-filter]');
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    cards.forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; });
    const count = cards.filter(card => !card.hidden).length;
    $('#project-count').textContent = `${String(count).padStart(2, '0')} ПРОЕКТА`;
  }));

  // The clipboard control is separate from the mailto link. Failure is explicit.
  const copyButton = $('.copy-email');
  let copyTimer;
  copyButton.addEventListener('click', async () => {
    const status = $('#copy-status');
    clearTimeout(copyTimer);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('romankozuharev@mail.ru');
      status.textContent = 'Email скопирован. Буду рад вашему сообщению!';
    } catch {
      status.textContent = 'Не удалось скопировать. Адрес: romankozuharev@mail.ru';
    }
    copyTimer = setTimeout(() => { status.textContent = ''; }, 7000);
  });

  // Native dialog: keyboard focus trapping and Escape supported by the browser.
  const dialog = $('#photo-dialog');
  let photoTrigger;
  $$('[data-photo]').forEach(button => button.addEventListener('click', () => {
    photoTrigger = button;
    const image = $('#dialog-image');
    image.src = button.dataset.photo;
    image.alt = button.dataset.caption;
    image.hidden = false;
    $('#dialog-caption').textContent = button.dataset.caption;
    dialog.showModal();
    document.body.classList.add('modal-open');
    $('.dialog-close', dialog).focus();
  }));
  $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    const image = $('#dialog-image');
    image.hidden = true;
    image.removeAttribute('src');
    photoTrigger?.focus({ preventScroll: true });
  });

  // No permanent animation loop: scroll work is coalesced into one frame.
  const progress = $('.reading-progress span');
  const dock = $('.floating-dock');
  const hero = $('#home');
  const contact = $('#contact');
  const dockLinks = $$('a', dock);
  const sections = $$('main section[id]');
  let scrollPending = false;
  function updateScroll() {
    scrollPending = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const fraction = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    progress.style.transform = `scaleX(${fraction})`;
    dock.classList.toggle('is-visible', hero.getBoundingClientRect().bottom < innerHeight * .45 && contact.getBoundingClientRect().top > innerHeight * .35);
    let current = 'home';
    sections.forEach(section => { if (section.getBoundingClientRect().top < innerHeight * .45) current = section.id; });
    dockLinks.forEach(link => {
      const active = link.hash === `#${current}`;
      link.classList.toggle('is-current', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  const requestScroll = () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); }
  };
  addEventListener('scroll', requestScroll, { passive: true });
  addEventListener('resize', requestScroll, { passive: true });
  updateScroll();

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('just-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('.section-label, .skill-panel, .photo-card').forEach(element => observer.observe(element));
  }
  $('#year').textContent = new Date().getFullYear();
})();
