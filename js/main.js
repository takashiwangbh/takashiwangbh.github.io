/* Shared static-site interactions. Compatible with GitHub Pages. */
(() => {
  'use strict';
  const siteRoot = new URL('../', document.currentScript.src);
  const local = path => new URL(path, siteRoot).href;
  const photographyFeature = document.querySelector('.photography-feature');
  if (photographyFeature && Array.isArray(window.PHOTOGRAPHS)) {
    const photographs = window.PHOTOGRAPHS;
    const cover = photographyFeature.querySelector('.photography-feature__image');
    const newest = photographs[0];
    if (cover && newest && typeof newest.src === 'string' && newest.src) {
      try {
        cover.src = new URL(newest.src, local('html/Photography.html')).href;
        cover.alt = newest.alt || newest.title || 'Personal photograph';
        if (Number.isInteger(newest.width) && newest.width > 0) cover.width = newest.width;
        if (Number.isInteger(newest.height) && newest.height > 0) cover.height = newest.height;
        cover.addEventListener('error', () => { cover.hidden = true; }, { once: true });
        cover.hidden = false;
      } catch { /* Leave the cover hidden when its URL is unavailable. */ }
    }
  }
  const navigation = [
    ['News', 'html/News.html'], ['CV', 'files/cv-english-until-2026-05.pdf'],
    ['Blog', 'html/Bolg.html'], ['About', 'html/About.html'], ['Contacts', 'html/Contacts.html']
  ];
  const navMarkup = navigation.map(([label,path]) => `<a href="${local(path)}"${label === 'CV' ? ' target="_blank" rel="noopener"' : ''}>${label}${label === 'CV' ? ' <span aria-hidden="true">↗</span>' : ''}</a>`).join('');
  const pageHeader = document.querySelector('.page-header-inner');
  if (pageHeader) {
    const nav = document.createElement('nav');
    nav.className = 'site-nav subpage-nav'; nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = navMarkup;
    pageHeader.insertBefore(nav, pageHeader.querySelector('.back-link'));
    pageHeader.dataset.navigationReady = '';
    const brand = pageHeader.querySelector('.page-brand a, a.site-brand');
    if (brand) {
      brand.classList.add('site-brand');
      const mark = document.createElement('span'); mark.className = 'brand-mark';
      mark.setAttribute('aria-hidden','true'); mark.textContent = 'bw'; brand.prepend(mark);
    }
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'menu-toggle';
    button.setAttribute('aria-label','Open menu'); button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','site-menu');
    button.innerHTML = '<span>Menu</span><span class="menu-lines" aria-hidden="true"></span>';
    pageHeader.appendChild(button);
  }
  document.querySelectorAll('.site-nav a').forEach(link => {
    if (new URL(link.href).pathname === window.location.pathname) link.setAttribute('aria-current','page');
  });
  const menuButton = document.querySelector('.menu-toggle');
  if (menuButton) {
    const menu = document.createElement('div');
    menu.className = 'mobile-menu'; menu.id = 'site-menu'; menu.hidden = true; menu.inert = true;
    menu.setAttribute('role','dialog'); menu.setAttribute('aria-modal','true'); menu.setAttribute('aria-label','Navigation');
    const allPages = [['Home','index.html'], ...navigation, ['AI','html/AI.html'], ['Game','html/Game.html'], ['Art','html/Art.html'], ['Photography','html/Photography.html']];
    menu.innerHTML = `<nav aria-label="All pages"><ul class="menu-nav">${allPages.map(([label,path]) => `<li><a href="${local(path)}"${label === 'CV' ? ' target="_blank" rel="noopener"' : ''}>${label}</a></li>`).join('')}</ul></nav><ul class="sns-nav"><li><a href="https://github.com/takashiwangbh" target="_blank" rel="noopener noreferrer">GitHub ↗</a></li><li><a href="mailto:takashiwangbh@gmail.com">Email ↗</a></li></ul>`;
    const closeButton = menuButton.cloneNode(true);
    closeButton.classList.add('menu-close'); closeButton.setAttribute('aria-label','Close menu');
    closeButton.removeAttribute('aria-controls'); closeButton.removeAttribute('aria-expanded');
    closeButton.querySelector('span').textContent = 'Close';
    menu.prepend(closeButton); document.body.appendChild(menu);
    let background = [];
    const inertBefore = new Map();
    const closeMenu = (restoreFocus = true) => {
      menu.inert = true; menu.hidden = true; document.body.classList.remove('menu-open');
      menuButton.setAttribute('aria-expanded','false');
      background.forEach(element => { element.inert = inertBefore.get(element) || false; });
      if (restoreFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      background = [...document.body.children].filter(element => element !== menu && !['SCRIPT','STYLE'].includes(element.tagName));
      background.forEach(element => { inertBefore.set(element,element.inert); element.inert = true; });
      menu.hidden = false; menu.inert = false; document.body.classList.add('menu-open');
      menuButton.setAttribute('aria-expanded','true'); closeButton.focus();
    });
    closeButton.addEventListener('click', () => closeMenu());
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu(false)));
    document.addEventListener('keydown', event => {
      if (menu.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
      if (event.key !== 'Tab') return;
      const links = menu.querySelectorAll('button, a[href]');
      const first = links[0], last = links[links.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches && !menu.hidden) closeMenu(); });
  }
  if (!document.querySelector('.site-footer')) {
    const footer = document.createElement('footer'); footer.className = 'site-footer site-footer--compact';
    footer.innerHTML = `<div class="footer-inner"><div class="footer-top"><div><p class="footer-eyebrow">Research, projects, or a conversation.</p><a class="footer-contact" href="${local('html/Contacts.html')}">Get in touch <span aria-hidden="true">↗</span></a></div><nav class="footer-directory" aria-label="More to explore"><a href="${local('html/About.html')}">About</a><a href="${local('html/Bolg.html')}">Blog</a><a href="${local('html/AI.html')}">AI</a><a href="${local('html/Game.html')}">Game</a><a href="${local('html/Art.html')}">Art</a><a href="${local('html/Photography.html')}">Photography</a></nav></div><div class="footer-bottom"><p class="copyright">© 2026 Binghao WANG</p><ul class="sns-nav"><li><a href="https://github.com/takashiwangbh" target="_blank" rel="noopener noreferrer">GitHub ↗</a></li><li><a href="mailto:takashiwangbh@gmail.com">Email ↗</a></li></ul><a class="footer-top-link" href="#main">Back to top ↑</a></div></div>`;
    document.body.appendChild(footer);
  }
  // Native CSS handles the hover layer; no framework, WebGL, or scroll effects.
  const motion = document.createElement('script'); motion.type = 'module';
  motion.src = local('assets/taste/motion/motion.js'); document.head.appendChild(motion);
  const newsList = document.getElementById('news-list');
  if (newsList) {
    fetch(local('html/News.html')).then(response => {
      if (!response.ok) throw new Error('News unavailable'); return response.text();
    }).then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const cards = [...doc.querySelectorAll('.news-card')];
      const fragment = document.createDocumentFragment();
      cards.slice(0,3).forEach((card,index) => {
        const timestamp = card.querySelector('.timestamp'), content = card.querySelector('.news-card-content p');
        if (!timestamp || !content) return;
        const [year,month,day] = timestamp.textContent.trim().split('-');
        const item = document.createElement('li'); item.className = 'new'; item.dataset.reveal = '';
        const link = document.createElement('a'); link.href = local(`html/News.html#${card.id || `news-${cards.length-index}`}`);
        const date = document.createElement('p'); date.className = 'date';
        const dateYear = document.createElement('span'); dateYear.className = 'year'; dateYear.textContent = year;
        date.append(dateYear,`${month}.${day}`);
        const body = document.createElement('div'); body.className = 'news-content';
        const title = document.createElement('h3'); title.className = 'news-title'; title.textContent = card.dataset.title || '';
        const text = document.createElement('p'); text.className = 't'; text.textContent = content.textContent.trim();
        body.append(title,text);
        const arrow = document.createElement('span'); arrow.className = 'news-arrow'; arrow.setAttribute('aria-hidden','true'); arrow.textContent = '↗';
        link.append(date,body,arrow); item.append(link); fragment.append(item);
      });
      if (fragment.childNodes.length) { newsList.replaceChildren(fragment); }
    }).catch(() => { /* Retain the linked news present in the HTML when offline. */ });
  }
  const graph = document.getElementById('github-contribution-graph');
  if (graph) {
    const graphURL = `${local('image/github-contributions.svg')}?theme=half-year-v1&v=${new Date().toISOString().slice(0,10)}`;
    graph.src = graphURL;
    const syncLabel = document.getElementById('github-sync-label');
    if (syncLabel) fetch(graphURL).then(response => {
      if (!response.ok) throw new Error('Contribution metadata unavailable');
      return response.text();
    }).then(svg => {
      const documentSVG = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const through = documentSVG.documentElement.getAttribute('data-through');
      const source = documentSVG.documentElement.getAttribute('data-source');
      const coverageNote = document.getElementById('github-coverage-note');
      let sourceLabel = '';
      if (source === 'authenticated') {
        sourceLabel = 'Public + private · ';
        syncLabel.dataset.source = source;
        if (coverageNote) coverageNote.textContent = 'This graph combines contribution activity from my public and private repositories. Only relative activity levels are shown; repository details remain hidden.';
      } else if (source === 'public-preview') {
        sourceLabel = 'Public only · ';
        syncLabel.dataset.source = source;
        if (coverageNote) coverageNote.textContent = 'This graph shows public contribution activity only. Private contributions are not included in this preview.';
      }
      if (through && /^\d{4}-\d{2}-\d{2}$/.test(through)) syncLabel.textContent = `${sourceLabel}Through ${through.replaceAll('-', '.')}`;
      else if (sourceLabel) syncLabel.textContent = sourceLabel.replace(' · ', '');
    }).catch(() => { /* An undated or offline graph remains labeled as a saved snapshot. */ });
  }
})();
