(() => {
  const input = document.getElementById('inspector-input');
  const run = document.getElementById('inspector-run');
  const status = document.getElementById('inspector-status');
  const resultMath = document.getElementById('inspector-result-math');
  const resultText = document.getElementById('inspector-result-text');
  const resultMeta = document.getElementById('inspector-result-meta');
  const resultTex = document.getElementById('inspector-result-tex');
  const sourceStage = document.getElementById('inspector-stage-source');
  const tokenStage = document.getElementById('inspector-stage-tokens');
  const rpnStage = document.getElementById('inspector-stage-rpn');
  const entityStage = document.getElementById('inspector-stage-entity');
  const tokenView = document.getElementById('inspector-tokens');
  const rpnView = document.getElementById('inspector-rpn');
  const tree = document.getElementById('inspector-tree');
  const errorBox = document.getElementById('inspector-error');
  const examples = [...document.querySelectorAll('[data-inspector-example]')];

  const nerdamer = () => globalThis.nerdamer;
  const temml = () => globalThis.temml;
  const parser = () => nerdamer()?.classes?.instance?.Parser;
  const expressionClass = () => nerdamer()?.classes?.Expression;

  const groupMap = () => {
    const map = new Map();
    const types = expressionClass()?.TYPES || {};
    for (const [name, value] of Object.entries(types)) map.set(value, name);
    return map;
  };

  const textOf = value => {
    try {
      return typeof value?.text === 'function' ? value.text() : String(value);
    } catch {
      return String(value);
    }
  };

  const entityLabel = value => {
    if (!value || typeof value !== 'object') return typeof value;
    if (Array.isArray(value)) return `Array(${value.length})`;
    const group = groupMap().get(value.type);
    if (group) return `Expression · ${group}`;
    return value.constructor?.name || value.dataType || 'Object';
  };

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const renderScope = (scope, container, depth = 0) => {
    const list = make('div', `inspector-token-list depth-${Math.min(depth, 3)}`);
    for (const item of scope || []) {
      if (Array.isArray(item)) {
        const wrapper = make('div', 'inspector-token-scope');
        const label = make('div', 'inspector-token-scope-label', `${item.type || 'scope'} · depth ${item.depth ?? depth + 1}`);
        wrapper.append(label);
        renderScope(item, wrapper, depth + 1);
        list.append(wrapper);
      } else {
        const token = make('div', `inspector-token token-${String(item?.type || 'unknown').toLowerCase()}`);
        token.append(
          make('code', 'inspector-token-value', item?.toString?.() ?? item?.value ?? String(item)),
          make('span', 'inspector-token-type', item?.type || 'token')
        );
        if (Number.isFinite(item?.position)) token.title = `Source position ${item.position}`;
        list.append(token);
      }
    }
    container.append(list);
  };

  const summaryValue = value => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') return textOf(value);
    return String(value);
  };

  const expressionChildren = value => {
    const children = [];
    if (value?.power && typeof value.power === 'object') children.push(['power', value.power]);
    if (value?.base && typeof value.base === 'object') children.push(['base', value.base]);
    if (value?.elements && !Array.isArray(value.elements)) {
      for (const [key, child] of Object.entries(value.elements)) children.push([`element · ${key}`, child]);
    }
    if (Array.isArray(value?.args)) {
      value.args.forEach((child, index) => children.push([`arg ${index + 1}`, child]));
    }
    return children;
  };

  const structuredChildren = value => {
    const children = [];
    const name = value?.constructor?.name;

    if (Array.isArray(value)) {
      value.forEach((child, index) => children.push([`[${index}]`, child]));
    } else if (name === 'Equation' || (value?.LHS && value?.RHS)) {
      children.push(['LHS', value.LHS], ['RHS', value.RHS]);
    } else if (name === 'Matrix' && Array.isArray(value.elements)) {
      value.elements.forEach((row, rowIndex) => children.push([`row ${rowIndex + 1}`, row]));
    } else if (Array.isArray(value?.elements)) {
      value.elements.forEach((child, index) => children.push([`[${index}]`, child]));
    } else if (typeof value?.entries === 'function') {
      try {
        for (const [key, child] of value.entries()) children.push([String(key), child]);
      } catch {}
    } else if (typeof value?.getElements === 'function') {
      try {
        const elements = value.getElements();
        if (Array.isArray(elements)) elements.forEach((child, index) => children.push([`[${index}]`, child]));
      } catch {}
    }
    return children;
  };

  const nodeProperties = value => {
    const properties = [];
    const group = groupMap().get(value?.type);
    const name = value?.constructor?.name;

    if (group) {
      properties.push(['typeName', group]);
      properties.push(['type', String(value.type)]);
    } else if (name && name !== 'Object') {
      properties.push(['kind', name]);
    }

    if (value?.dataType !== undefined) properties.push(['dataType', summaryValue(value.dataType)]);
    if (!Array.isArray(value) && typeof value?.text === 'function') properties.push(['text', textOf(value)]);

    for (const key of ['value', 'name', 'precision', 'deferred']) {
      if (value?.[key] !== undefined) properties.push([key, summaryValue(value[key])]);
    }

    if (value?.multiplier !== undefined) properties.push(['multiplier', summaryValue(value.multiplier)]);
    if (value?.power !== undefined && (value.power === null || typeof value.power !== 'object')) {
      properties.push(['power', summaryValue(value.power)]);
    }

    if (name === 'Matrix' && Array.isArray(value.elements)) {
      properties.push(['rows', String(value.elements.length)]);
      properties.push(['columns', String(value.elements[0]?.length ?? 0)]);
    } else if (Array.isArray(value)) {
      properties.push(['length', String(value.length)]);
    } else if (Array.isArray(value?.elements)) {
      properties.push(['elements', String(value.elements.length)]);
    }

    return properties;
  };

  const treeNode = (label, value, seen, depth = 0) => {
    const wrapper = make('div', 'inspector-tree-node');
    if (value === null || typeof value !== 'object') {
      wrapper.append(make('span', 'inspector-tree-label', label), make('code', 'inspector-tree-leaf', String(value)));
      return wrapper;
    }

    if (seen.has(value)) {
      wrapper.append(make('span', 'inspector-tree-label', label), make('span', 'inspector-tree-muted', 'shared / circular reference'));
      return wrapper;
    }
    seen.add(value);

    const details = document.createElement('details');
    details.open = depth < 2;
    const summary = document.createElement('summary');
    summary.append(
      make('span', 'inspector-tree-label', label),
      make('span', 'inspector-tree-kind', entityLabel(value))
    );
    details.append(summary);

    const body = make('div', 'inspector-tree-body');
    const props = nodeProperties(value);
    if (props.length) {
      const propertyGrid = make('dl', 'inspector-property-grid');
      for (const [key, propertyValue] of props) {
        propertyGrid.append(make('dt', '', key), make('dd', '', propertyValue));
      }
      body.append(propertyGrid);
    }

    const isExpression = !!groupMap().get(value.type);
    const children = isExpression ? expressionChildren(value) : structuredChildren(value);
    if (children.length) {
      const childWrap = make('div', 'inspector-tree-children');
      for (const [childLabel, child] of children) childWrap.append(treeNode(childLabel, child, seen, depth + 1));
      body.append(childWrap);
    }
    details.append(body);
    wrapper.append(details);
    return wrapper;
  };

  const setStatus = (message, kind = '') => {
    status.textContent = message;
    status.className = `engine-status ${kind}`.trim();
  };

  const analyze = () => {
    const n = nerdamer();
    const p = parser();
    const source = input.value.trim();
    errorBox.hidden = true;
    errorBox.textContent = '';
    resultMath.replaceChildren();
    tree.replaceChildren();
    tokenView.replaceChildren();
    rpnView.replaceChildren();

    if (!source) return;
    if (typeof n !== 'function' || !p) {
      setStatus('Inspector unavailable', 'error');
      return;
    }

    try {
      const tokens = p.tokenize(source);
      const rpn = p.toRPN(tokens);
      const value = n(source);
      const text = textOf(value);
      let latex = '';

      try {
        latex = typeof n.pretty === 'function' ? n.pretty(value, 'TeX') : '';
      } catch {}

      sourceStage.textContent = source;
      tokenStage.textContent = tokens.text();
      rpnStage.textContent = rpn.text();
      entityStage.textContent = entityLabel(value);
      resultText.textContent = text;
      resultMeta.textContent = `${entityLabel(value)} · dataType ${value?.dataType || 'n/a'}`;
      resultTex.textContent = latex || 'No TeX output';

      renderScope(tokens, tokenView);
      renderScope(rpn, rpnView);
      tree.append(treeNode('ParserEntity', value, new WeakSet()));

      if (latex && typeof temml()?.render === 'function') {
        try {
          temml().render(latex, resultMath, { displayMode: true, throwOnError: true });
        } catch {
          resultMath.textContent = text;
        }
      } else {
        resultMath.textContent = text;
      }

      setStatus('Inspection complete', 'ready');
    } catch (error) {
      setStatus('Inspection failed', 'error');
      errorBox.hidden = false;
      errorBox.textContent = error?.stack || error?.message || String(error);
    }
  };

  run.addEventListener('click', analyze);
  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      analyze();
    }
  });
  examples.forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.inspectorExample || '';
    analyze();
  }));

  const params = new URLSearchParams(location.search);
  if (params.get('expr')) input.value = params.get('expr');

  if (typeof nerdamer() === 'function' && parser()) {
    setStatus('Inspector ready', 'ready');
    analyze();
  } else {
    setStatus('Nerdamer internals unavailable', 'error');
    run.disabled = true;
  }
})();
