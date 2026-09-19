(() => {
  const aggregatePrimeUrl = 'https://cdn.jsdelivr.net/npm/nerdamer-prime@1.5.0/all.min.js';
  const primeModuleUrl = 'https://cdn.jsdelivr.net/gh/together-science/nerdamer-prime@618ffd3d76afdbb39a722bf6623963c0407a98ac/all.esm.min.mjs';
  const head = document.head;
  const append = head.append;
  const currentNerdamer = globalThis.nerdamer;

  const loadPrime = async () => {
    // Prime's bundled add-ons prefer a global `nerdamer` when one already
    // exists. Hide the current Nerdamer build while the module initializes so the add-ons
    // resolve the Prime core bundled into the same ESM module instead.
    globalThis.nerdamer = undefined;

    try {
      const module = await import(primeModuleUrl);
      const prime = module?.default;

      if (typeof prime !== 'function' || typeof prime.getCore !== 'function') {
        throw new Error('Nerdamer-Prime ESM bundle did not initialize.');
      }

      return prime;
    } finally {
      globalThis.nerdamer = currentNerdamer;
    }
  };

  head.append = function (...nodes) {
    const primeNode = nodes.find(node => node instanceof HTMLScriptElement && node.src === aggregatePrimeUrl);

    if (!primeNode) {
      return append.apply(this, nodes);
    }

    // The Prime 1.5.0 IIFE and raw source paths are not safe to load beside
    // the current Nerdamer build in a browser. Substitute the pinned ESM build, isolate its
    // initialization, then let the Playground capture the Prime root exactly
    // as if the requested script had loaded normally.
    head.append = append;

    const remaining = nodes.filter(node => node !== primeNode);
    if (remaining.length) append.apply(this, remaining);

    loadPrime()
      .then(prime => {
        globalThis.nerdamer = prime;
        primeNode.onload?.(new Event('load'));
      })
      .catch(err => {
        globalThis.nerdamer = currentNerdamer;
        console.error('Nerdamer-Prime loading failed.', err);
        primeNode.onerror?.(new Event('error'));
      });

    return undefined;
  };
})();
