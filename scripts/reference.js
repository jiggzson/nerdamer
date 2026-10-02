(() => {
  const inputs = [...document.querySelectorAll('[data-reference-search]')];
  if (!inputs.length) return;

  for (const input of inputs) {
    const toolbar = input.closest('.reference-toolbar');
    const count = toolbar?.querySelector('[data-reference-count]') || document.querySelector('[data-reference-count]');
    const items = [...document.querySelectorAll('[data-reference-item]')];
    if (!items.length) continue;

    const update = () => {
      const q = input.value.trim().toLowerCase();
      let visible = 0;

      for (const item of items) {
        const show = !q || (item.dataset.search || item.textContent).toLowerCase().includes(q);
        item.hidden = !show;
        item.style.display = show ? '' : 'none';
        if (show) visible++;
      }

      for (const group of document.querySelectorAll('.reference-group, .api-group')) {
        const groupItems = [...group.querySelectorAll('[data-reference-item]')];
        if (groupItems.length) {
          const show = groupItems.some(item => !item.hidden);
          group.hidden = !show;
          group.style.display = show ? '' : 'none';
        }
      }

      if (count) count.textContent = `${visible} entr${visible === 1 ? 'y' : 'ies'}`;
    };

    input.addEventListener('input', update);
    update();
  }
})();
