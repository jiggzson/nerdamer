(() => {
  const input = document.querySelector('[data-reference-search]');
  const items = [...document.querySelectorAll('[data-reference-item]')];
  const count = document.querySelector('[data-reference-count]');
  if (!input || !items.length) return;
  const update = () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    for (const item of items) {
      const show = !q || (item.dataset.search || item.textContent).toLowerCase().includes(q);
      item.hidden = !show;
      if (show) visible++;
    }
    if (count) count.textContent = `${visible} entr${visible === 1 ? 'y' : 'ies'}`;
  };
  input.addEventListener('input', update);
  update();
})();
