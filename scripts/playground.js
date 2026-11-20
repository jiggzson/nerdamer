(() => {
  const editor = document.getElementById('editor');
  const run = document.getElementById('run');
  const clear = document.getElementById('clear');
  const evaluateOutput = document.getElementById('evaluate-output');
  const engineSelect = document.getElementById('engine-select');
  const status = document.getElementById('engine-status');
  const suggestions = document.getElementById('suggestions');
  const signature = document.getElementById('signature');
  const result = document.getElementById('result');
  const resultMeta = document.getElementById('result-meta');
  const sessionNote = document.getElementById('result-session-note');
  const raw = document.getElementById('raw-output');
  const tex = document.getElementById('tex-output');
  const tree = document.getElementById('tree-output');
  const error = document.getElementById('error-output');
  const warningOutput = document.getElementById('warning-output');
  const warningList = document.getElementById('warning-list');
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panes = [...document.querySelectorAll('[data-pane]')];
  const examples = [...document.querySelectorAll('[data-example]')];
  const plotButton = document.getElementById('plot-run');
  const plotContainer = document.getElementById('plot-container');
  const plotMessage = document.getElementById('plot-message');
  const plotSource = document.getElementById('plot-source');
  const plotControls = document.getElementById('plot-controls');
  const plotXVar = document.getElementById('plot-xvar');
  const plotYVar = document.getElementById('plot-yvar');
  const plotXMin = document.getElementById('plot-xmin');
  const plotXMax = document.getElementById('plot-xmax');
  const plotYMin = document.getElementById('plot-ymin');
  const plotYMax = document.getElementById('plot-ymax');
  const plotSamples = document.getElementById('plot-samples');
  const plot3D = document.getElementById('plot-3d');
  const plot3DOptions = document.getElementById('plot-3d-options');
  const plotFixed = document.getElementById('plot-fixed-vars');

  if (!editor || !run || !clear || !evaluateOutput || !engineSelect || !status || !suggestions || !signature || !result || !resultMeta || !raw || !tex || !tree || !error || !warningOutput || !warningList) return;

  const inspectKeys = [
    'typeName', 'type', 'group', 'dataType', 'value', 'symbol', 'name', 'precision',
    'deferred', 'multiplier', 'power', 'base', 'elements', 'symbols', 'args',
    'LHS', 'RHS', 'lhs', 'rhs',
  ];
  // Minified engine builds mangle class names (Expression becomes Expression_Expression),
  // so name results by their stable dataType code instead.
  const dataTypeNames = {
    EXP: 'Expression', SOL: 'SolutionSet', VEC: 'Vector', MAT: 'Matrix',
    SET: 'ValuesSet', DIC: 'Dictionary', EQN: 'Equation', COL: 'Collection',
  };
  const typeLabel = value => {
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value === null || value === undefined) return String(value);
    if (typeof value !== 'object' && typeof value !== 'function') return typeof value;
    if (typeof value.dataType === 'string' && dataTypeNames[value.dataType]) return dataTypeNames[value.dataType];
    const name = value.constructor?.name || '';
    const mangled = /^([A-Za-z]+)_\1$/.exec(name);
    if (mangled) return mangled[1];
    return name || value.typeName || value.dataType || 'Object';
  };
  const currentNerdamer = globalThis.nerdamer;
  const siteVersion = typeof currentNerdamer?.version === 'function'
    ? String(currentNerdamer.version())
    : '';
  const siteLabel = siteVersion
    ? `Nerdamer ${siteVersion}`
    : 'Nerdamer (version unavailable)';

  const releaseManifestUrl = 'https://data.jsdelivr.com/v1/package/npm/nerdamer';
  const releaseUrls = new Map();
  const stableV2Parts = version => {
    if (typeof version !== 'string') return null;
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    return match && Number(match[1]) === 2 ? match.slice(1).map(Number) : null;
  };
  const compareVersions = (a, b) => {
    const left = stableV2Parts(a);
    const right = stableV2Parts(b);
    for (let i = 0; i < 3; i++) {
      if (left[i] !== right[i]) return left[i] - right[i];
    }
    return 0;
  };
  const releaseRuntimes = new Map();
  const releasePromises = new Map();
  const legacyUrl = 'https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js';
  const primeUrl = 'https://cdn.jsdelivr.net/npm/nerdamer-prime@1.5.0/all.min.js';
  let legacyNerdamer = null;
  let legacyPromise = null;
  let primeNerdamer = null;
  let primePromise = null;
  let baseManifest = [];
  let manifest = [];
  let filtered = [];
  let active = 0;
  let activeEngineId = 'v2';
  let lastExecution = null;
  let plotContext = null;
  let plotRelayoutBound = false;
  let plotRelayoutTimer = null;
  let plotUpdating = false;
  let plotBaseXRange = null;

  const cleanSource = source => source
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('//'))
    .join('\n')
    .trim();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  const functionSyntax = item => item?.syntax || item?.signature || `${item?.name || ''}()`;
  const isObject = value => value !== null && typeof value === 'object';

  const withGlobalEngine = (root, callback) => {
    const previous = globalThis.nerdamer;
    globalThis.nerdamer = root;
    try {
      return callback(root);
    } finally {
      globalThis.nerdamer = currentNerdamer;
      if (!currentNerdamer && previous) globalThis.nerdamer = previous;
    }
  };

  const createV2Engine = (id, label, root) => ({
    id,
    label,
    root,
    run(source, shouldEvaluate = false) {
      return withGlobalEngine(root(), runtime => {
        const value = runtime(source);
        return shouldEvaluate ? value.evaluate() : value;
      });
    },
    toText(value) {
      return typeof value?.text === 'function' ? value.text() : String(value);
    },
    toTeX(value) {
      return withGlobalEngine(root(), runtime => typeof runtime?.pretty === 'function'
        ? runtime.pretty(value, 'TeX')
        : (typeof value?.toTeX === 'function' ? value.toTeX() : ''));
    },
  });

  const engines = {
    v2: createV2Engine('v2', siteLabel, () => currentNerdamer),
    legacy: {
      id: 'legacy',
      label: 'Nerdamer 1.1.13',
      root: () => legacyNerdamer,
      run(source, shouldEvaluate = false) {
        return withGlobalEngine(legacyNerdamer, runtime => {
          const value = runtime(source);
          return shouldEvaluate ? value.evaluate() : value;
        });
      },
      toText(value) {
        return typeof value?.text === 'function' ? value.text() : String(value);
      },
      toTeX(value) {
        return typeof value?.toTeX === 'function' ? value.toTeX() : '';
      },
    },
    prime: {
      id: 'prime',
      label: 'Nerdamer-Prime 1.5.0',
      root: () => primeNerdamer,
      run(source, shouldEvaluate = false) {
        return withGlobalEngine(primeNerdamer, runtime => {
          const value = runtime(source);
          return shouldEvaluate ? value.evaluate() : value;
        });
      },
      toText(value) {
        return typeof value?.text === 'function' ? value.text() : String(value);
      },
      toTeX(value) {
        return typeof value?.toTeX === 'function' ? value.toTeX() : '';
      },
    },
  };

  engineSelect.querySelector('option[value="v2"]').textContent = siteLabel;

  const discoverReleases = async () => {
    try {
      const response = await fetch(releaseManifestUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Release metadata unavailable.');
      const data = await response.json();
      if (!Array.isArray(data?.versions)) throw new Error('Invalid release metadata.');

      const versions = [...new Set(data.versions.filter(version => stableV2Parts(version)))]
        .sort((a, b) => compareVersions(b, a));

      // Published builds are separate from the local site bundle, even when
      // both report the same version. No manual release list is maintained.
      for (const version of versions) {
        releaseUrls.set(version, `https://cdn.jsdelivr.net/npm/nerdamer@${version}/dist/bundle.js`);
        engines[version] = createV2Engine(version, `Nerdamer ${version}`, () => releaseRuntimes.get(version));

        const option = document.createElement('option');
        option.value = version;
        option.textContent = engines[version].label;
        engineSelect.add(option, engineSelect.querySelector('option[value="legacy"]'));
      }

    } catch {
      // Release discovery is optional; existing engines remain available.
    }
  };

  const activeEngine = () => engines[activeEngineId];

  const setStatus = (message, kind = '') => {
    status.textContent = message;
    status.className = `engine-status ${kind}`.trim();
  };

  const clearWarningDisplay = () => {
    warningList.replaceChildren();
    warningOutput.hidden = true;
  };

  // The warning API stores diagnostics across calls. Snapshot its length
  // instead of clearing shared runtime state so only this action is displayed.
  const warningSnapshot = runtime => {
    if (typeof runtime?.getWarnings !== 'function') return null;
    try {
      const records = runtime.getWarnings();
      return Array.isArray(records) ? records.length : null;
    } catch {
      return null;
    }
  };

  // Shows the warnings recorded from offset up to end (or the latest).
  const renderWarnings = (runtime, offset, end = null) => {
    clearWarningDisplay();
    if (offset === null || typeof runtime?.getWarnings !== 'function') return;

    let records;
    try {
      records = runtime.getWarnings();
    } catch {
      return;
    }
    if (!Array.isArray(records)) return;
    const start = records.length < offset ? 0 : offset;
    for (const warning of records.slice(start, end ?? records.length)) {
      const message = typeof warning === 'string' ? warning : warning?.message;
      if (typeof message !== 'string' || !message.trim()) continue;

      const item = document.createElement('li');
      const content = document.createElement('span');
      content.textContent = message;
      item.append(content);

      if (typeof warning?.code === 'string' && warning.code) {
        const code = document.createElement('code');
        code.textContent = warning.code;
        item.append(code);
      }
      warningList.append(item);
    }
    warningOutput.hidden = warningList.childElementCount === 0;
  };

  const captureWarnings = callback => {
    const runtime = activeEngine().root();
    clearWarningDisplay();
    const offset = warningSnapshot(runtime);
    try {
      return callback();
    } finally {
      renderWarnings(runtime, offset);
    }
  };

  const loadRelease = version => {
    const url = releaseUrls.get(version);
    if (!url) return Promise.reject(new Error(`Nerdamer ${version} is not configured.`));

    const loaded = releaseRuntimes.get(version);
    if (loaded) return Promise.resolve(loaded);
    if (releasePromises.has(version)) return releasePromises.get(version);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => {
        const runtime = globalThis.nerdamer;
        globalThis.nerdamer = currentNerdamer;
        if (typeof runtime !== 'function' || runtime === currentNerdamer) {
          reject(new Error(`Nerdamer ${version} did not initialize.`));
          return;
        }
        if (typeof runtime.version !== 'function' || runtime.version() !== version) {
          reject(new Error(`Nerdamer ${version} did not report the expected version.`));
          return;
        }
        releaseRuntimes.set(version, runtime);
        resolve(runtime);
      };
      script.onerror = () => {
        globalThis.nerdamer = currentNerdamer;
        reject(new Error(`Could not load Nerdamer ${version}.`));
      };
      document.head.append(script);
    }).catch(caught => {
      releasePromises.delete(version);
      throw caught;
    });

    releasePromises.set(version, promise);
    return promise;
  };

  const loadLegacy = () => {
    if (legacyNerdamer) return Promise.resolve(legacyNerdamer);
    if (legacyPromise) return legacyPromise;

    legacyPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = legacyUrl;
      script.async = true;
      script.onload = () => {
        const loaded = globalThis.nerdamer;
        globalThis.nerdamer = currentNerdamer;
        if (typeof loaded !== 'function' || loaded === currentNerdamer) {
          reject(new Error('Nerdamer 1.1.13 did not initialize.'));
          return;
        }
        legacyNerdamer = loaded;
        resolve(legacyNerdamer);
      };
      script.onerror = () => {
        globalThis.nerdamer = currentNerdamer;
        reject(new Error('Could not load Nerdamer 1.1.13.'));
      };
      document.head.append(script);
    }).catch(caught => {
      legacyPromise = null;
      throw caught;
    });

    return legacyPromise;
  };

  const loadPrime = () => {
    if (primeNerdamer) return Promise.resolve(primeNerdamer);
    if (primePromise) return primePromise;

    primePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = primeUrl;
      script.async = true;
      script.onload = () => {
        const loaded = globalThis.nerdamer;
        globalThis.nerdamer = currentNerdamer;
        if (typeof loaded !== 'function' || loaded === currentNerdamer) {
          reject(new Error('Nerdamer-Prime did not initialize.'));
          return;
        }
        primeNerdamer = loaded;
        resolve(primeNerdamer);
      };
      script.onerror = () => {
        globalThis.nerdamer = currentNerdamer;
        reject(new Error('Could not load Nerdamer-Prime 1.5.0.'));
      };
      document.head.append(script);
    }).catch(caught => {
      primePromise = null;
      throw caught;
    });

    return primePromise;
  };

  const treeEntries = value => {
    if (Array.isArray(value)) {
      const entries = value.slice(0, 16).map((item, index) => [String(index), item]);
      if (value.length > 16) entries.push(['…', `${value.length - 16} more items`]);
      return entries;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      const entries = Object.entries(value).slice(0, 32);
      if (Object.keys(value).length > entries.length) {
        entries.push(['…', `${Object.keys(value).length - entries.length} more items`]);
      }
      return entries;
    }

    return inspectKeys.flatMap(key => {
      if (!(key in value)) return [];
      try {
        const next = value[key];
        return typeof next === 'function' ? [] : [[key, next]];
      } catch {
        return [];
      }
    });
  };

  const treeNode = (label, value, seen, depth = 0) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';

    if (!isObject(value)) {
      wrapper.classList.add('tree-leaf');
      const key = document.createElement('span');
      key.className = 'tree-label';
      key.textContent = label;
      const data = document.createElement('span');
      data.className = 'tree-value';
      data.textContent = String(value);
      wrapper.append(key, data);
      return wrapper;
    }

    if (seen.has(value)) {
      wrapper.classList.add('tree-leaf');
      const key = document.createElement('span');
      key.className = 'tree-label';
      key.textContent = label;
      const data = document.createElement('span');
      data.className = 'tree-value';
      data.textContent = '[Circular reference]';
      wrapper.append(key, data);
      return wrapper;
    }

    seen.add(value);
    const details = document.createElement('details');
    details.open = depth === 0;
    const summary = document.createElement('summary');
    const key = document.createElement('span');
    key.className = 'tree-label';
    key.textContent = label;
    const type = document.createElement('span');
    type.className = 'tree-type';
    type.textContent = typeLabel(value);
    summary.append(key, type);
    details.append(summary);

    const children = document.createElement('div');
    children.className = 'tree-children';
    const entries = treeEntries(value);
    if (entries.length) {
      for (const [childLabel, childValue] of entries) {
        children.append(treeNode(childLabel, childValue, seen, depth + 1));
      }
    } else {
      const empty = document.createElement('div');
      empty.className = 'tree-empty';
      empty.textContent = 'No inspectable values.';
      children.append(empty);
    }
    details.append(children);
    wrapper.append(details);
    return wrapper;
  };

  const renderTree = value => {
    tree.replaceChildren(treeNode('ParserEntity', value, new WeakSet()));
  };

  const selectTab = name => {
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    panes.forEach(pane => pane.classList.toggle('active', pane.dataset.pane === name));
  };

  tabs.forEach(tab => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));

  const refreshFunctionCatalog = () => {
    let next = [...baseManifest];
    const engine = activeEngine();
    const root = engine.root();

    if (activeEngineId !== 'v2' && typeof root === 'function') {
      try {
        const reserved = root.reserved?.(true);
        if (Array.isArray(reserved)) {
          const names = new Set(reserved.map(String));
          const existing = new Set(next.map(item => item.name));
          next = next.filter(item => names.has(item.name));
          for (const name of names) {
            if (!existing.has(name) && /^[A-Za-z_]\w*$/.test(name)) {
              next.push({ name, syntax: `${name}(...)`, summary: `${engine.label} function.` });
            }
          }
        }
      } catch {}
    }

    manifest = next.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    updateAutocomplete();
  };

  // Finds the function call around the cursor: its name and which argument the
  // cursor is in, counting only top-level commas.
  const enclosingCall = () => {
    const before = editor.value.slice(0, editor.selectionStart);
    let depth = 0;
    let argument = 0;
    for (let i = before.length - 1; i >= 0; i--) {
      const c = before[i];
      if (c === ')' || c === ']' || c === '}') depth++;
      else if (c === '[' || c === '{') {
        if (depth === 0) return null;
        depth--;
      } else if (c === '(') {
        if (depth > 0) {
          depth--;
          continue;
        }
        const name = before.slice(0, i).match(/([A-Za-z_]\w*)\s*$/)?.[1];
        return name ? { name, argument } : null;
      } else if (c === ',' && depth === 0) argument++;
    }
    return null;
  };

  const splitParameters = syntax => {
    const inner = syntax.match(/\((.*)\)\s*$/)?.[1] ?? '';
    const parts = [];
    let depth = 0;
    let current = '';
    for (const c of inner) {
      if ('([{'.includes(c)) depth++;
      if (')]}'.includes(c)) depth--;
      if (c === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else current += c;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  };

  const renderSignatureHelp = () => {
    const call = enclosingCall();
    const item = call && manifest.find(entry => entry.name === call.name);
    if (!item) {
      signature.textContent = 'Type a function name to see signature help.';
      return;
    }
    const parameters = splitParameters(functionSyntax(item));
    const shown = parameters.map((parameter, index) => {
      const text = escape(parameter);
      return index === Math.min(call.argument, parameters.length - 1) ? `<b class="signature-active">${text}</b>` : text;
    }).join(', ');
    signature.innerHTML = `<code>${escape(item.name)}(${shown})</code><span>${escape(item.summary || '')}</span>`;
  };

  const renderSuggestions = () => {
    if (!filtered.length) {
      suggestions.hidden = true;
      renderSignatureHelp();
      return;
    }

    suggestions.innerHTML = filtered.slice(0, 8).map((item, index) => (
      `<button class="suggestion ${index === active ? 'active' : ''}" type="button" data-suggestion="${index}">` +
      `<code>${escape(functionSyntax(item))}</code><span>${escape(item.summary || '')}</span></button>`
    )).join('');
    suggestions.hidden = false;

    // Inside a call, keep showing that call's signature; the list still offers completions.
    if (enclosingCall()) {
      renderSignatureHelp();
      return;
    }
    const item = filtered[active];
    signature.innerHTML = `<code>${escape(functionSyntax(item))}</code><span>${escape(item?.summary || '')}</span>`;
  };

  const currentWord = () => {
    const before = editor.value.slice(0, editor.selectionStart);
    const match = before.match(/[A-Za-z_]\w*$/);
    return match ? { text: match[0], from: editor.selectionStart - match[0].length } : null;
  };

  const updateAutocomplete = () => {
    const word = currentWord();
    if (!word || !word.text) {
      filtered = [];
      renderSuggestions();
      return;
    }

    const query = word.text.toLowerCase();
    filtered = manifest
      .filter(item => item?.name?.toLowerCase().startsWith(query))
      .slice(0, 8);
    active = 0;
    renderSuggestions();
  };

  const applySuggestion = index => {
    const item = filtered[index];
    const word = currentWord();
    if (!item || !word) return;

    const insert = item.name === 'return' ? 'return ' : `${item.name}()`;
    editor.setRangeText(insert, word.from, editor.selectionStart, 'end');
    if (insert.endsWith('()')) {
      const cursor = word.from + item.name.length + 1;
      editor.setSelectionRange(cursor, cursor);
    }
    editor.focus();
    filtered = [];
    suggestions.hidden = true;
    signature.innerHTML = `<code>${escape(functionSyntax(item))}</code><span>${escape(item.summary || '')}</span>`;
  };

  suggestions.addEventListener('mousedown', event => {
    const button = event.target.closest('[data-suggestion]');
    if (!button) return;
    event.preventDefault();
    applySuggestion(Number(button.dataset.suggestion));
  });

  const parseExpressions = source => {
    const stripped = cleanSource(source);
    if (!stripped) return [];
    if (/^block\s*\(/.test(stripped)) return [stripped];
    return stripped.split(/[;\n]/).map(value => value.trim()).filter(Boolean);
  };

  const getExpression = source => activeEngine().run(source);

  const expressionVariables = expression => {
    try {
      const variables = expression?.variables?.();
      return Array.isArray(variables) ? variables.map(String) : [];
    } catch {
      return [];
    }
  };

  const getPlotSource = () => {
    const source = cleanSource(editor.value);
    if (lastExecution?.engineId === activeEngineId && lastExecution.value) {
      const variables = expressionVariables(lastExecution.value);
      if (variables.length && typeof lastExecution.value.buildFunction === 'function') {
        return { source: lastExecution.text, label: 'Last result' };
      }
    }
    return { source, label: 'Editor input' };
  };

  const fillVariableSelect = (select, variables, selected) => {
    select.innerHTML = variables.map(name => `<option value="${escape(name)}">${escape(name)}</option>`).join('');
    if (variables.includes(selected)) select.value = selected;
  };

  const readFixedValues = () => {
    const values = {};
    plotFixed?.querySelectorAll('[data-fixed-var]').forEach(input => {
      const value = Number(input.value);
      if (Number.isFinite(value)) values[input.dataset.fixedVar] = value;
    });
    return values;
  };

  const renderFixedVariables = variables => {
    if (!plotFixed || !plotXVar || !plotYVar || !plot3D) return;
    const x = plotXVar.value;
    const y = plot3D.checked ? plotYVar.value : null;
    const previous = readFixedValues();
    plotFixed.replaceChildren();

    variables.filter(name => name !== x && name !== y).forEach(name => {
      const label = document.createElement('label');
      label.className = 'plot-fixed-field';
      const span = document.createElement('span');
      span.textContent = name;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.value = String(previous[name] ?? 1);
      input.dataset.fixedVar = name;
      input.addEventListener('change', () => plotCurrent());
      label.append(span, input);
      plotFixed.append(label);
    });

    if (!plotFixed.children.length) {
      const empty = document.createElement('span');
      empty.className = 'plot-fixed-empty';
      empty.textContent = 'None';
      plotFixed.append(empty);
    }
  };

  const syncPlotContext = () => {
    if (!plotControls || !plotMessage || !plotSource || !plotXVar || !plotYVar || !plot3D || !plot3DOptions) return;
    const sourceInfo = getPlotSource();
    const expressions = parseExpressions(sourceInfo.source);
    const first = expressions[0] || '';
    plotSource.textContent = first ? `${sourceInfo.label}: ${first}` : 'Waiting for a symbolic expression.';

    if (!first || typeof activeEngine().root() !== 'function') {
      plotControls.hidden = true;
      plotMessage.textContent = 'Use an expression with at least one variable to plot.';
      plotContext = null;
      return;
    }

    try {
      const expression = getExpression(first);
      const variables = expressionVariables(expression);
      if (!variables.length || typeof expression?.buildFunction !== 'function') {
        plotControls.hidden = true;
        plotMessage.textContent = 'The current expression does not expose a plottable variable.';
        plotContext = null;
        return;
      }

      const previousX = plotXVar.value;
      const previousY = plotYVar.value;
      fillVariableSelect(plotXVar, variables, variables.includes(previousX) ? previousX : variables[0]);
      const yChoices = variables.filter(name => name !== plotXVar.value);
      fillVariableSelect(plotYVar, yChoices, yChoices.includes(previousY) ? previousY : yChoices[0]);
      plot3D.disabled = variables.length < 2;
      if (variables.length < 2) plot3D.checked = false;
      plot3DOptions.hidden = !plot3D.checked || variables.length < 2;
      plotControls.hidden = false;
      plotMessage.textContent = variables.length > 1
        ? 'Choose 2-D or 3-D plotting. Remaining variables can be held fixed.'
        : 'Ready to plot.';
      plotContext = { expressions, variables };
      renderFixedVariables(variables);
    } catch (caught) {
      plotControls.hidden = true;
      plotMessage.textContent = `Plot setup failed: ${caught?.message || String(caught)}`;
      plotContext = null;
    }
  };

  const plotTheme = () => {
    const styles = getComputedStyle(document.documentElement);
    const css = name => styles.getPropertyValue(name).trim().split(/\s+/).join(',');
    const dark = document.documentElement.classList.contains('dark');
    return {
      muted: `rgb(${css('--muted')})`,
      border: `rgb(${css('--border')})`,
      soft: `rgb(${css('--bg-soft')})`,
      grid: dark ? 'rgba(158,173,188,.15)' : 'rgba(91,108,126,.16)',
    };
  };

  const build2DTraces = (xVar, xMin, xMax, sampleCount, fixedValues) => {
    const palette = ['#08609e', '#207ebf', '#257b53', '#b47828', '#7c3aed', '#dc5a3c'];
    const traces = [];

    for (let expressionIndex = 0; expressionIndex < plotContext.expressions.length; expressionIndex++) {
      const source = plotContext.expressions[expressionIndex];
      let expression;
      try {
        expression = getExpression(source);
      } catch {
        continue;
      }

      const variables = expressionVariables(expression);
      if (!variables.includes(xVar)) continue;
      const orderedVars = [xVar, ...variables.filter(name => name !== xVar)];
      let fn;
      try {
        fn = expression.buildFunction(orderedVars);
      } catch {
        continue;
      }

      const fixedArgs = orderedVars.slice(1).map(name => Number(fixedValues[name] ?? 1));
      const xs = [];
      const ys = [];
      for (let index = 0; index < sampleCount; index++) {
        const x = xMin + index * (xMax - xMin) / (sampleCount - 1);
        xs.push(x);
        try {
          const y = Number(fn(x, ...fixedArgs));
          ys.push(Number.isFinite(y) && Math.abs(y) < 1e9 ? y : null);
        } catch {
          ys.push(null);
        }
      }

      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: xs,
        y: ys,
        connectgaps: false,
        name: source,
        line: { width: 2.4, color: palette[expressionIndex % palette.length] },
      });
    }

    return traces;
  };

  const controlNumber = value => Number(Number(value).toPrecision(12)).toString();

  const refresh2DForRange = async (xMin, xMax) => {
    const Plotly = globalThis.Plotly;
    if (!Plotly || !plotContext || plot3D?.checked || plotUpdating) return;
    const xVar = plotXVar.value || plotContext.variables[0];
    const sampleCount = Math.max(64, Math.min(4096, Number(plotSamples.value) || 768));
    const traces = build2DTraces(xVar, xMin, xMax, sampleCount, readFixedValues());
    if (!traces.length || !plotContainer?.data?.length) return;

    try {
      await Plotly.restyle(plotContainer, {
        x: traces.map(trace => trace.x),
        y: traces.map(trace => trace.y),
      });
      plotMessage.textContent = `2-D plot · ${activeEngine().label} · ${sampleCount} samples · zoom range resampled`;
    } catch {}
  };

  const reset2DRange = async () => {
    const Plotly = globalThis.Plotly;
    if (!Plotly || !plotBaseXRange || plotUpdating) return;
    const [xMin, xMax] = plotBaseXRange;
    plotXMin.value = controlNumber(xMin);
    plotXMax.value = controlNumber(xMax);
    plotUpdating = true;
    try {
      const xVar = plotXVar.value || plotContext.variables[0];
      const sampleCount = Math.max(64, Math.min(4096, Number(plotSamples.value) || 768));
      const traces = build2DTraces(xVar, xMin, xMax, sampleCount, readFixedValues());
      await Plotly.restyle(plotContainer, {
        x: traces.map(trace => trace.x),
        y: traces.map(trace => trace.y),
      });
      await Plotly.relayout(plotContainer, {
        'xaxis.autorange': false,
        'xaxis.range': [xMin, xMax],
      });
      plotMessage.textContent = `2-D plot · ${activeEngine().label} · ${sampleCount} samples`;
    } finally {
      plotUpdating = false;
    }
  };

  const bindPlotRelayout = () => {
    if (plotRelayoutBound || typeof plotContainer?.on !== 'function') return;
    plotRelayoutBound = true;
    plotContainer.on('plotly_relayout', changes => {
      if (plotUpdating || plot3D?.checked || !plotContext) return;

      if (changes?.['xaxis.autorange'] === true) {
        reset2DRange();
        return;
      }

      const suppliedRange = Array.isArray(changes?.['xaxis.range']) ? changes['xaxis.range'] : null;
      const xMin = Number(suppliedRange?.[0] ?? changes?.['xaxis.range[0]']);
      const xMax = Number(suppliedRange?.[1] ?? changes?.['xaxis.range[1]']);
      if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) return;

      plotXMin.value = controlNumber(xMin);
      plotXMax.value = controlNumber(xMax);
      clearTimeout(plotRelayoutTimer);
      plotRelayoutTimer = setTimeout(() => refresh2DForRange(xMin, xMax), 90);
    });
  };

  const plotCurrent = ({ keepBaseRange = false } = {}) => {
    if (!plotButton || !plotContainer || !plotMessage || !plotXVar || !plotYVar || !plotXMin || !plotXMax || !plotYMin || !plotYMax || !plotSamples || !plot3D) return;
    const Plotly = globalThis.Plotly;
    if (!Plotly) {
      plotMessage.textContent = 'Plotly did not load.';
      return;
    }
    if (typeof activeEngine().root() !== 'function') return;

    syncPlotContext();
    if (!plotContext) return;

    const xVar = plotXVar.value || plotContext.variables[0];
    const xMin = Number(plotXMin.value);
    const xMax = Number(plotXMax.value);
    const sampleCount = Math.max(64, Math.min(4096, Number(plotSamples.value) || 768));
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) {
      plotMessage.textContent = 'Set a valid x range.';
      return;
    }

    if (!keepBaseRange) plotBaseXRange = [xMin, xMax];
    const fixedValues = readFixedValues();
    const theme = plotTheme();
    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: theme.soft,
      font: { family: 'Inter, system-ui, sans-serif', color: theme.muted, size: 12 },
      margin: { t: 24, r: 24, b: 48, l: 58 },
      xaxis: { title: xVar, gridcolor: theme.grid, zerolinecolor: theme.border, range: [xMin, xMax] },
      yaxis: { gridcolor: theme.grid, zerolinecolor: theme.border },
      showlegend: plotContext.expressions.length > 1,
      legend: { bgcolor: 'rgba(0,0,0,0)' },
    };
    const config = { responsive: true, displayModeBar: 'hover', scrollZoom: true, doubleClick: 'reset+autosize' };

    if (plot3D.checked && plotContext.variables.length >= 2) {
      const yVar = plotYVar.value;
      const yMin = Number(plotYMin.value);
      const yMax = Number(plotYMax.value);
      if (!yVar || !Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin >= yMax) {
        plotMessage.textContent = 'Set a valid y variable and range for 3-D plotting.';
        return;
      }

      const orderedVars = [xVar, yVar, ...plotContext.variables.filter(name => name !== xVar && name !== yVar)];
      let fn;
      try {
        const expression = getExpression(plotContext.expressions[0]);
        fn = expression.buildFunction(orderedVars);
      } catch (caught) {
        plotMessage.textContent = caught?.message || String(caught);
        return;
      }

      const fixedArgs = orderedVars.slice(2).map(name => Number(fixedValues[name] ?? 1));
      const gridSize = Math.max(24, Math.min(72, Math.round(Math.sqrt(sampleCount * 3))));
      const xs = Array.from({ length: gridSize }, (_, index) => xMin + index * (xMax - xMin) / (gridSize - 1));
      const ys = Array.from({ length: gridSize }, (_, index) => yMin + index * (yMax - yMin) / (gridSize - 1));
      const z = ys.map(y => xs.map(x => {
        try {
          const value = Number(fn(x, y, ...fixedArgs));
          return Number.isFinite(value) && Math.abs(value) < 1e9 ? value : null;
        } catch {
          return null;
        }
      }));

      const sceneLayout = {
        ...layout,
        height: 510,
        scene: {
          bgcolor: theme.soft,
          xaxis: { title: xVar, gridcolor: theme.grid, color: theme.muted },
          yaxis: { title: yVar, gridcolor: theme.grid, color: theme.muted },
          zaxis: { title: 'z', gridcolor: theme.grid, color: theme.muted },
        },
      };
      delete sceneLayout.xaxis;
      delete sceneLayout.yaxis;
      plotUpdating = true;
      plotContainer.hidden = false;
      Promise.resolve(Plotly.react(
        plotContainer,
        [{ type: 'surface', x: xs, y: ys, z, colorscale: 'Blues', showscale: false }],
        sceneLayout,
        config,
      )).finally(() => {
        plotUpdating = false;
        bindPlotRelayout();
      });
      plotMessage.textContent = `3-D plot · ${activeEngine().label} · ${gridSize}×${gridSize} grid`;
      return;
    }

    const traces = build2DTraces(xVar, xMin, xMax, sampleCount, fixedValues);
    if (!traces.length) {
      plotMessage.textContent = 'No finite plottable values were produced.';
      Plotly.purge(plotContainer);
      plotContainer.hidden = true;
      plotRelayoutBound = false;
      return;
    }

    plotUpdating = true;
    plotContainer.hidden = false;
    Promise.resolve(Plotly.react(plotContainer, traces, { ...layout, height: 420 }, config)).finally(() => {
      plotUpdating = false;
      bindPlotRelayout();
    });
    plotMessage.textContent = `2-D plot · ${activeEngine().label} · ${sampleCount} samples`;
  };

  // The names an input refers to as variables, and the ones it gives a value itself:
  // assignments such as x:5 and the parameters of definitions such as f(x):=x^2.
  // Comments and strings are skipped. A name before a bracket is a function only when
  // one is registered under it, since x(2) is x*2.
  const inputNames = (source, functions) => {
    const text = source.replace(/\/\/[^\n]*/g, ' ').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, ' ');
    const used = new Set();
    const local = new Set();
    for (const match of text.matchAll(/[A-Za-z_]\w*/g)) {
      const after = text.slice(match.index + match[0].length).trimStart();
      if (!(after.startsWith('(') && functions.has(match[0]))) used.add(match[0]);
      if (/^:(?!=)/.test(after)) local.add(match[0]);
    }
    for (const match of text.matchAll(/[A-Za-z_]\w*\s*\(([^()]*)\)\s*:=/g)) {
      for (const name of match[1].match(/[A-Za-z_]\w*/g) || []) local.add(name);
    }
    return { used, local };
  };

  // The session variables an input uses: their values are substituted when it runs, so
  // factor(x^6-1) with x = 5 factors 15624. Read before the run, which can change them.
  const sessionValuesUsed = (runtime, source) => {
    let retval = [];
    try {
      const values = typeof runtime.getVars === 'function' ? runtime.getVars('text') || {} : {};
      const entries = Object.entries(values).filter(([name]) => name !== 'undefined');
      if (entries.length) {
        const registered = typeof runtime.functions === 'function' ? runtime.functions() : null;
        const functions = new Set(registered ? [...(registered.system || []), ...(registered.user || [])] : []);
        const { used, local } = inputNames(source, functions);
        retval = entries.filter(([name]) => used.has(name) && !local.has(name));
      }
    } catch {}
    return retval;
  };

  const showSessionValues = entries => {
    if (!sessionNote) return;
    sessionNote.replaceChildren();
    sessionNote.hidden = entries.length === 0;
    if (!entries.length) return;

    const label = document.createElement('span');
    label.className = 'result-session-label';
    label.textContent = entries.length === 1 ? 'Uses a session variable' : 'Uses session variables';
    const chips = document.createElement('span');
    chips.className = 'playground-session-vars';
    for (const [name, value] of entries) {
      const chip = document.createElement('span');
      chip.className = 'playground-session-chip';
      const content = document.createElement('span');
      content.className = 'playground-session-value';
      const nameCode = document.createElement('code');
      nameCode.textContent = name;
      const equals = document.createElement('span');
      equals.textContent = '=';
      const valueCode = document.createElement('code');
      valueCode.textContent = value;
      content.append(nameCode, equals, valueCode);
      chip.append(content);
      chips.append(chip);
    }
    const hint = document.createElement('span');
    hint.className = 'result-session-hint';
    hint.textContent = `Remove ${entries.length === 1 ? 'it' : 'them'} from Session variables to keep ${entries.length === 1 ? 'it' : 'them'} symbolic.`;
    sessionNote.append(label, chips, hint);
  };

  const execute = () => {
    const engine = activeEngine();
    const mode = evaluateOutput.checked ? 'Evaluated' : 'Symbolic';
    error.textContent = '';
    error.hidden = true;
    clearWarningDisplay();

    const runtime = engine.root();
    if (typeof runtime !== 'function') {
      error.textContent = `${engine.label} is not available.`;
      error.hidden = false;
      result.textContent = 'Evaluation failed.';
      resultMeta.textContent = `${engine.label} · ${mode}`;
      selectTab('result');
      return;
    }

    const source = cleanSource(editor.value);
    if (!source) return;

    showSessionValues(sessionValuesUsed(runtime, source));
    const warningOffset = warningSnapshot(runtime);
    // The plot check below parses the input again; its warnings are not shown twice.
    let warningEnd = null;
    const start = performance.now();
    try {
      const value = engine.run(source, evaluateOutput.checked);
      const elapsed = performance.now() - start;
      const text = engine.toText(value);
      let latex = '';
      try {
        latex = engine.toTeX(value);
      } catch {}

      result.textContent = text;
      resultMeta.textContent = `${engine.label} · ${mode} · ${typeLabel(value)} · ${elapsed.toFixed(2)} ms`;
      raw.textContent = text;
      tex.textContent = latex || 'No TeX converter result available.';
      renderTree(value);
      lastExecution = { source, text, value, engineId: activeEngineId, evaluated: evaluateOutput.checked };
      selectTab('result');
      warningEnd = warningSnapshot(runtime);
      syncPlotContext();
    } catch (caught) {
      warningEnd ??= warningSnapshot(runtime);
      error.textContent = caught?.message || String(caught);
      error.hidden = false;
      result.textContent = 'Evaluation failed.';
      resultMeta.textContent = `${engine.label} · ${mode}`;
      raw.textContent = '';
      tex.textContent = '';
      tree.replaceChildren();
      lastExecution = null;
      selectTab('result');
      syncPlotContext();
    } finally {
      renderWarnings(runtime, warningOffset, warningEnd);
    }
  };

  const switchEngine = async () => {
    const requested = engineSelect.value;
    suggestions.hidden = true;
    clearWarningDisplay();
    engineSelect.disabled = true;
    let ready = false;

    try {
      if (requested === 'legacy') {
        setStatus('Loading Nerdamer 1.1.13…');
        await loadLegacy();
      } else if (requested === 'prime') {
        setStatus('Loading Nerdamer-Prime…');
        await loadPrime();
      } else if (releaseUrls.has(requested)) {
        setStatus(`Loading Nerdamer ${requested}…`);
        await loadRelease(requested);
      }
      activeEngineId = requested;
      setStatus(`${activeEngine().label} ready`, 'ready');
      ready = true;
    } catch (caught) {
      engineSelect.value = 'v2';
      activeEngineId = 'v2';
      setStatus(`${engines[requested]?.label || 'Selected engine'} unavailable`, 'error');
      error.textContent = caught?.message || String(caught);
      error.hidden = false;
    } finally {
      engineSelect.disabled = false;
    }

    refreshFunctionCatalog();
    lastExecution = null;
    syncPlotContext();
    if (globalThis.Plotly && plotContainer) {
      globalThis.Plotly.purge(plotContainer);
      plotContainer.hidden = true;
      plotRelayoutBound = false;
    }
    if (ready) execute();
  };

  editor.addEventListener('input', () => {
    lastExecution = null;
    plotContext = null;
    if (plotControls) plotControls.hidden = true;
    if (plot3DOptions) plot3DOptions.hidden = true;
    if (plotSource) plotSource.textContent = 'Run the expression to update plotting.';
    if (plotMessage) plotMessage.textContent = 'Run the expression to update plotting.';
    updateAutocomplete();
  });
  editor.addEventListener('click', updateAutocomplete);
  editor.addEventListener('keydown', event => {
    if (event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      execute();
      return;
    }

    if (!suggestions.hidden && filtered.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        active = (active + 1) % filtered.length;
        renderSuggestions();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        active = (active - 1 + filtered.length) % filtered.length;
        renderSuggestions();
        return;
      }
      if (event.key === 'Tab' || event.key === 'Enter') {
        event.preventDefault();
        applySuggestion(active);
        return;
      }
      if (event.key === 'Escape') suggestions.hidden = true;
    }
  });

  run.addEventListener('click', execute);
  evaluateOutput.addEventListener('change', () => {
    lastExecution = null;
    execute();
  });
  clear.addEventListener('click', () => {
    editor.value = '';
    editor.focus();
    suggestions.hidden = true;
    signature.textContent = 'Type a function name to see signature help.';
    result.textContent = 'Ready.';
    resultMeta.textContent = '';
    showSessionValues([]);
    raw.textContent = '';
    tex.textContent = '';
    tree.replaceChildren();
    error.textContent = '';
    error.hidden = true;
    clearWarningDisplay();
    lastExecution = null;
    plotBaseXRange = null;
    syncPlotContext();
    if (globalThis.Plotly && plotContainer) {
      globalThis.Plotly.purge(plotContainer);
      plotContainer.hidden = true;
      plotRelayoutBound = false;
    }
  });

  examples.forEach(button => button.addEventListener('click', () => {
    editor.value = button.dataset.example || '';
    editor.focus();
    suggestions.hidden = true;
    lastExecution = null;
    execute();
    // Plot examples also draw their plot, in the dimension the chip names.
    const dimension = button.dataset.plot;
    if (dimension && lastExecution && plot3D) {
      plot3D.checked = dimension === '3d';
      // The change handler updates the 3-D options and plots.
      plot3D.dispatchEvent(new Event('change'));
    }
  }));

  engineSelect.addEventListener('change', switchEngine);
  plotButton?.addEventListener('click', () => plotCurrent());
  plotXVar?.addEventListener('change', () => {
    renderFixedVariables(plotContext?.variables || []);
    plotCurrent();
  });
  plotYVar?.addEventListener('change', () => {
    renderFixedVariables(plotContext?.variables || []);
    plotCurrent();
  });
  plot3D?.addEventListener('change', () => {
    if (plot3DOptions) plot3DOptions.hidden = !plot3D.checked;
    renderFixedVariables(plotContext?.variables || []);
    plotCurrent();
  });
  [plotXMin, plotXMax, plotYMin, plotYMax, plotSamples]
    .filter(Boolean)
    .forEach(control => control.addEventListener('change', () => plotCurrent()));
  document.getElementById('theme-toggle')?.addEventListener('click', () => setTimeout(() => {
    if (plotContainer?.data) plotCurrent({ keepBaseRange: true });
  }, 0));

  discoverReleases();

  fetch('/data/parser-functions.json')
    .then(response => response.json())
    .then(data => {
      baseManifest = Array.isArray(data) ? data : (Array.isArray(data?.functions) ? data.functions : []);
      refreshFunctionCatalog();
    })
    .catch(() => {
      baseManifest = [];
      refreshFunctionCatalog();
    });

  // Links such as /playground/?expr=x^2+1 open with that input and run it.
  // ?eq= is the name the 1.x demo page used, and ?graph=1 also plots the result,
  // as it did there. The query is decoded by hand because URLSearchParams turns
  // + into a space, and + in an expression is almost always addition.
  const queryParam = name => {
    for (const pair of location.search.slice(1).split('&')) {
      const at = pair.indexOf('=');
      const key = at < 0 ? pair : pair.slice(0, at);
      if (key !== name) continue;
      try {
        return decodeURIComponent(at < 0 ? '' : pair.slice(at + 1));
      } catch {
        return null;
      }
    }
    return null;
  };
  const linkedInput = queryParam('expr') ?? queryParam('eq');
  if (linkedInput) editor.value = linkedInput;

  if (typeof currentNerdamer === 'function') {
    setStatus(`${engines.v2.label} ready`, 'ready');
    execute();
    if (linkedInput && queryParam('graph') === '1') plotCurrent();
  } else {
    setStatus(`${engines.v2.label} unavailable`, 'error');
    run.disabled = true;
    evaluateOutput.disabled = true;
    engineSelect.disabled = true;
  }

  window.__nerdamerPlayground = {
    getValue: () => editor.value,
    setValue: value => {
      editor.value = String(value ?? '');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    },
    run: execute,
    captureWarnings,
    selectEngine: async id => {
      engineSelect.value = id;
      await switchEngine();
    },
    plot: plotCurrent,
  };
})();