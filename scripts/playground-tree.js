(() => {
  const tree = document.getElementById('tree-output');
  if (!tree) return;

  const revealRecursiveBranches = () => {
    const root = tree.querySelector(':scope > .tree-node > details');
    if (!root) return;

    root.open = true;
    root.querySelectorAll(':scope > .tree-children > .tree-node > details').forEach(details => {
      details.open = true;
    });
  };

  new MutationObserver(revealRecursiveBranches).observe(tree, { childList: true });
  revealRecursiveBranches();
})();
