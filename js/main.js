/* Shared interactions. No framework or build step is required. */
(() => {
  'use strict';
  const siteRoot = new URL('../', document.currentScript.src);
  const local = path => new URL(path, siteRoot).href;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = [
    ['News', 'html/News.html'], ['CV', 'files/cv-english-until-2026-05.pdf'],
    ['Blog', 'html/Bolg.html'], ['About', 'html/About.html'], ['Contacts', 'html/Contacts.html']
  ];
  const navMarkup = navigation.map(([label,path]) => `<a href="${local(path)}"${label === 'CV' ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`).join('');
  const pageHeader = document.querySelector('.page-header-inner');
  if (pageHeader) {
    const nav = document.createElement('nav');
    nav.className = 'site-nav subpage-nav';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = navMarkup;
    pageHeader.insertBefore(nav, pageHeader.querySelector('.back-link'));
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'menu-toggle';
    button.setAttribute('aria-label', 'Open menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'site-menu');
    button.innerHTML = '<span>Menu</span><span class="menu-lines" aria-hidden="true"></span>';
    pageHeader.appendChild(button);
  }
  document.querySelectorAll('.site-nav a').forEach(link => {
    if (new URL(link.href).pathname === window.location.pathname) link.setAttribute('aria-current','page');
  });
  const updateScrollState = () => document.body.classList.toggle('is-scrolled', window.scrollY > 320);
  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();
  const menuButton = document.querySelector('.menu-toggle');
  if (menuButton) {
    const menu = document.createElement('div');
    menu.className = 'mobile-menu'; menu.id = 'site-menu'; menu.hidden = true; menu.inert = true;
    menu.setAttribute('role','dialog'); menu.setAttribute('aria-modal','true'); menu.setAttribute('aria-label','Navigation');
    menu.innerHTML = `<nav aria-label="All pages"><ul class="menu-nav"><li><a href="${local('index.html')}">Home</a></li>${navigation.map(([label,path]) => `<li><a href="${local(path)}"${label==='CV' ? ' target="_blank" rel="noopener"' : ''}>${label}</a></li>`).join('')}<li><a href="${local('html/AI.html')}">AI</a></li><li><a href="${local('html/Game.html')}">GAME</a></li><li><a href="${local('html/Art.html')}">ART</a></li><li><a href="${local('html/Photography.html')}">Photography</a></li></ul></nav><ul class="sns-nav"><li><a href="https://github.com/takashiwangbh" target="_blank" rel="noopener">GitHub ↗</a></li><li><a href="mailto:takashiwangbh@gmail.com">Email ↗</a></li></ul>`;
    const closeButton = menuButton.cloneNode(true);
    closeButton.classList.add('menu-close'); closeButton.setAttribute('aria-label','Close menu'); closeButton.setAttribute('aria-expanded','true');
    closeButton.style.cssText = 'position:absolute;right:var(--gutter);top:24px;display:inline-flex';
    menu.prepend(closeButton); document.body.appendChild(menu);
    let closingTimer;
    function closeMenu(restoreFocus = true) {
      document.body.classList.remove('menu-open'); menu.inert = true;
      menuButton.setAttribute('aria-expanded','false');
      closingTimer = window.setTimeout(() => { menu.hidden = true; }, reducedMotion.matches ? 0 : 350);
      if (restoreFocus) menuButton.focus();
    }
    function openMenu() {
      window.clearTimeout(closingTimer); menu.hidden = false; menu.inert = false;
      void menu.offsetWidth;
      document.body.classList.add('menu-open'); menuButton.setAttribute('aria-expanded','true');
      requestAnimationFrame(() => closeButton.focus());
      // Focus once the visibility transition has made the dialog interactive.
      window.setTimeout(() => {
        if (document.body.classList.contains('menu-open') && !menu.contains(document.activeElement)) closeButton.focus();
      }, reducedMotion.matches ? 0 : 360);
    }
    menuButton.addEventListener('click', openMenu);
    closeButton.addEventListener('click', () => closeMenu());
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu(false)));
    document.addEventListener('keydown', event => {
      if (!document.body.classList.contains('menu-open')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
      if (event.key !== 'Tab') return;
      const links = menu.querySelectorAll('button, a[href]');
      const first = links[0], last = links[links.length-1];
      if (!menu.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', () => { if (window.innerWidth>900 && document.body.classList.contains('menu-open')) closeMenu(); });
  }
  let revealObserver;
  function observeReveals(scope = document) {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    if (!revealObserver) revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('is-pending'); revealObserver.unobserve(entry.target); } });
    }, { threshold: .08 });
    document.documentElement.classList.add('js-motion');
    scope.querySelectorAll('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) { element.classList.add('is-pending'); revealObserver.observe(element); }
    });
  }
  observeReveals();
  const hero = document.querySelector('.hero');
  if (hero) {
    const scene = hero.querySelector('.hero-scene');
    const narrowScreen = window.matchMedia('(max-width: 650px)');
    const alignScene = () => scene?.setAttribute('preserveAspectRatio', narrowScreen.matches ? 'xMaxYMid slice' : 'xMidYMid slice');
    alignScene();
    narrowScreen.addEventListener('change', alignScene);
    const character = hero.querySelector('.hero-character');
    character?.addEventListener('click', () => {
      if (reducedMotion.matches) return;
      character.classList.remove('is-greeting');
      void character.offsetWidth;
      character.classList.add('is-greeting');
    });
    character?.addEventListener('animationend', event => {
      if (event.animationName === 'character-greeting') character.classList.remove('is-greeting');
    });
    if (!reducedMotion.matches) {
      let heroVisible = true;
      let pointerFrame = 0;
      let targetX = 0, targetY = 0, currentX = 0, currentY = 0, velocityX = 0, velocityY = 0;
      const updateScenePlayback = () => {
        const paused = document.hidden || !heroVisible;
        hero.classList.toggle('scene-paused', paused);
        if (paused) { cancelAnimationFrame(pointerFrame); pointerFrame = 0; }
      };
      if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        heroVisible = entries[0].isIntersecting;
        updateScenePlayback();
      }).observe(hero);
      document.addEventListener('visibilitychange', updateScenePlayback);
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const renderPointer = () => {
          if (document.hidden || !heroVisible || reducedMotion.matches) { pointerFrame = 0; return; }
          velocityX = (velocityX + (targetX - currentX) * .055) * .76;
          velocityY = (velocityY + (targetY - currentY) * .055) * .76;
          currentX += velocityX;
          currentY += velocityY;
          hero.style.setProperty('--scene-x', `${currentX * 20}px`);
          hero.style.setProperty('--scene-y', `${currentY * 12}px`);
          hero.style.setProperty('--arch-x', `${currentX * -10}px`);
          hero.style.setProperty('--arch-y', `${currentY * -6}px`);
          hero.style.setProperty('--cloud-x', `${currentX * 18}px`);
          hero.style.setProperty('--cloud-y', `${currentY * 9}px`);
          hero.style.setProperty('--character-yaw', `${currentX * 18}deg`);
          hero.style.setProperty('--character-pitch', `${currentY * -12}deg`);
          if (Math.abs(targetX-currentX) + Math.abs(targetY-currentY) + Math.abs(velocityX) + Math.abs(velocityY) > .0005) {
            pointerFrame = requestAnimationFrame(renderPointer);
          } else { pointerFrame = 0; }
        };
        const startPointer = () => { if (!pointerFrame) pointerFrame = requestAnimationFrame(renderPointer); };
        hero.addEventListener('pointermove', event => {
          const rect = hero.getBoundingClientRect();
          targetX = (event.clientX - rect.left) / rect.width - .5;
          targetY = (event.clientY - rect.top) / rect.height - .5;
          startPointer();
        });
        hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; startPointer(); });
      }
    }
  }

  if (!reducedMotion.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.circle-link').forEach(button => {
      button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        button.style.transform = `translate(${(event.clientX-rect.left-rect.width/2)*.16}px,${(event.clientY-rect.top-rect.height/2)*.16}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }
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
      if (fragment.childNodes.length) { newsList.replaceChildren(fragment); observeReveals(newsList); }
    }).catch(() => { /* Retain the linked news present in the HTML when offline. */ });
  }
  const graph = document.getElementById('github-contribution-graph');
  if (graph) {
    const graphURL = `${local('image/github-contributions.svg')}?theme=light-v3&v=${new Date().toISOString().slice(0,10)}`;
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
        sourceLabel = 'PUBLIC + PRIVATE · ';
        syncLabel.dataset.source = source;
        if (coverageNote) coverageNote.textContent = 'This graph combines contribution activity from my public and private repositories. Only relative activity levels are shown; repository details remain hidden.';
      } else if (source === 'public-preview') {
        sourceLabel = 'PUBLIC ONLY · ';
        syncLabel.dataset.source = source;
        if (coverageNote) coverageNote.textContent = 'This graph shows public contribution activity only. Private contributions are not included in this preview.';
      }
      if (through && /^\d{4}-\d{2}-\d{2}$/.test(through)) syncLabel.textContent = `${sourceLabel}THROUGH ${through.replaceAll('-', '.')}`;
      else if (sourceLabel) syncLabel.textContent = sourceLabel.replace(' · ', '');
    }).catch(() => { /* An undated or offline graph remains labeled as a saved snapshot. */ });
  }
})();
