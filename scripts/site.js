(() => {
  const root = document.documentElement;
  const currentScript = document.currentScript;
  const siteRoot = currentScript?.src ? new URL('../', currentScript.src) : new URL('./', location.href);
  const siteUrl = link => {
    const href = link.getAttribute('href') || '';
    if (location.protocol === 'file:' && href.startsWith('/') && !href.startsWith('//')) {
      return new URL(href.slice(1), siteRoot);
    }
    return new URL(link.href, location.href);
  };
  const normalizedPath = pathname => pathname
    .replace(/index\.html$/, '')
    .replace(/\/+$/, '/') || '/';

  if (location.protocol === 'file:') {
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href]');
      const href = link?.getAttribute('href') || '';
      if (!href.startsWith('/') || href.startsWith('//')) return;

      const target = new URL(href.slice(1), siteRoot);
      if (target.pathname.endsWith('/')) target.pathname += 'index.html';
      event.preventDefault();
      location.href = target.href;
    });
  }
  const stored = localStorage.getItem('nerdamer-theme');
  if (stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches)) root.classList.add('dark');

  const docsLayout = document.querySelector('.docs-layout');
  if (docsLayout) {
    const withImmediateScroll = action => {
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      action();
      root.style.scrollBehavior = previous;
    };
    const scheduleScroll = action => {
      action();
      requestAnimationFrame(() => requestAnimationFrame(action));
    };

    if (location.hash) {
      const scrollToDocsHash = () => {
        let id = location.hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {}
        const target = document.getElementById(id);
        if (target) withImmediateScroll(() => target.scrollIntoView({ block: 'start' }));
      };
      const scheduleDocsHashScroll = () => scheduleScroll(scrollToDocsHash);

      scheduleDocsHashScroll();
      window.addEventListener('load', scheduleDocsHashScroll, { once: true });
      window.addEventListener('pageshow', scheduleDocsHashScroll, { once: true });
    } else {
      try {
        history.scrollRestoration = 'manual';
      } catch {}

      const resetDocsScroll = () => withImmediateScroll(() => {
        root.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo(0, 0);
      });
      const scheduleDocsScrollReset = () => scheduleScroll(resetDocsScroll);

      scheduleDocsScrollReset();
      window.addEventListener('load', scheduleDocsScrollReset, { once: true });
      window.addEventListener('pageshow', scheduleDocsScrollReset, { once: true });
    }
  }

  const theme = document.getElementById('theme-toggle');
  theme?.addEventListener('click', () => {
    root.classList.toggle('dark');
    localStorage.setItem('nerdamer-theme', root.classList.contains('dark') ? 'dark' : 'light');
  });

  const menu = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  menu?.addEventListener('click', () => mobileNav?.classList.toggle('open'));

  const current = normalizedPath(location.pathname);
  document.querySelectorAll('.docs-nav a').forEach(a => {
    const href = normalizedPath(siteUrl(a).pathname);
    if (href === current) a.classList.add('is-active');
  });

  const filter = document.getElementById('docs-filter');
  const navGroups = [...document.querySelectorAll('.docs-nav-group')];
  const sidebarStateKey = 'nerdamer-docs-sidebar';
  let sidebarState = {};

  try {
    sidebarState = JSON.parse(localStorage.getItem(sidebarStateKey) || '{}');
  } catch {
    sidebarState = {};
  }

  const groupLabel = group => group.querySelector('.docs-nav-label')?.textContent?.trim() || '';
  const groupShouldBeExpanded = group => {
    if (group.querySelector('a.is-active')) return true;

    const saved = sidebarState[groupLabel(group)];
    if (typeof saved === 'boolean') return saved;

    return group.dataset.defaultExpanded !== 'false';
  };
  const setGroupExpanded = (group, expanded) => {
    group.classList.toggle('is-collapsed', !expanded);
    group.querySelector('.docs-nav-toggle')?.setAttribute('aria-expanded', String(expanded));
  };
  const saveSidebarState = () => {
    try {
      localStorage.setItem(sidebarStateKey, JSON.stringify(sidebarState));
    } catch {}
  };

  navGroups.forEach(group => {
    setGroupExpanded(group, groupShouldBeExpanded(group));
    group.querySelector('.docs-nav-toggle')?.addEventListener('click', () => {
      const expanded = group.classList.contains('is-collapsed');
      setGroupExpanded(group, expanded);
      sidebarState[groupLabel(group)] = expanded;
      saveSidebarState();
    });
  });

  const filterDocs = () => {
    const query = filter?.value.trim().toLowerCase() || '';

    navGroups.forEach(group => {
      const heading = groupLabel(group).toLowerCase();
      const headingMatches = !!query && heading.includes(query);
      let visibleLinks = 0;

      group.querySelectorAll('a').forEach(link => {
        const path = siteUrl(link).pathname.toLowerCase();
        const matches = !query
          || headingMatches
          || link.textContent.toLowerCase().includes(query)
          || path.includes(query);
        link.hidden = !matches;
        if (matches) visibleLinks += 1;
      });

      const showGroup = !query || visibleLinks > 0;
      group.hidden = !showGroup;
      if (query && showGroup) setGroupExpanded(group, true);
      else if (!query) setGroupExpanded(group, groupShouldBeExpanded(group));
    });
  };

  filter?.addEventListener('input', filterDocs);
  filterDocs();

  const siteHeader = document.getElementById('site-header');
  const backToTop = document.getElementById('back-to-top');
  const updateScrollUi = () => {
    if (backToTop) backToTop.hidden = window.scrollY < 700;
    siteHeader?.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', updateScrollUi, { passive: true });
  updateScrollUi();
})();
