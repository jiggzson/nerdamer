(() => {
  const diagrams = [...document.querySelectorAll('.mermaid')].map((element, index) => ({
    element,
    id: `internals-diagram-${index}`,
    source: element.textContent.trim(),
  }));

  if (!diagrams.length) return;

  const renderer = globalThis.mermaid;
  if (!renderer) {
    diagrams.forEach(({ element, source }) => {
      element.classList.add('internals-mermaid-fallback');
      element.textContent = source;
    });
    return;
  }

  let rendering = false;

  const config = () => ({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    flowchart: {
      curve: 'basis',
      htmlLabels: false,
      useMaxWidth: true,
    },
    themeVariables: {
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--sans').trim(),
    },
  });

  const render = async () => {
    if (rendering) return;
    rendering = true;

    try {
      renderer.initialize(config());
      for (const { element, source } of diagrams) {
        element.removeAttribute('data-processed');
        element.textContent = source;
      }
      await renderer.run({ nodes: diagrams.map(({ element }) => element) });
    } catch (error) {
      console.error('Unable to render contributor diagram.', error);
      diagrams.forEach(({ element, source }) => {
        element.classList.add('internals-mermaid-fallback');
        element.textContent = source;
      });
    } finally {
      rendering = false;
    }
  };

  void render();

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    window.setTimeout(() => void render(), 0);
  });
})();
