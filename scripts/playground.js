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
  const raw = document.getElementById('raw-output');
  const tex = document.getElementById('tex-output');
  const tree = document.getElementById('tree-output');
  const error = document.getElementById('error-output');
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

  if (!editor || !run || !clear || !evaluateOutput || !engineSelect || !status || !suggestions || !signature || !result || !resultMeta || !raw || !tex || !tree || !error) return;

  const inspectKeys = [
    'typeName', 'type', 'group', 'dataType', 'value', 'symbol', 'name', 'precision',
    'deferred', 'multiplier', 'power', 'base', 'elements', 'symbols', 'args',
    'LHS', 'RHS', 'lhs', 'rhs',
  ];
  const currentNerdamer = globalThis.nerdamer;
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

  const engines = {
    v2: {
      id: 'v2',
      label: 'Nerdamer 2.0',
      root: () => currentNerdamer,
      run(source, shouldEvaluate = false) {
        return withGlobalEngine(currentNerdamer, runtime => {
          const value = runtime(source);
          return shouldEvaluate ? value.evaluate() : value;
        });
      },
      toText(value) {
        return typeof value?.text === 'function' ? value.text() : String(value);
      },
      toTeX(value) {
        return withGlobalEngine(currentNerdamer, runtime => typeof runtime?.pretty === 'function'
          ? runtime.pretty(value, 'TeX')
          : (typeof value?.toTeX === 'function' ? value.toTeX() : ''));
      },
    },
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

  const activeEngine = () => engines[activeEngineId];

  const setStatus = (message, kind = '') => {
    status.textContent = message;
    status.className = `engine-status ${kind}`.trim();
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
    type.textContent = Array.isArray(value)
      ? `Array(${value.length})`
      : (value.constructor?.name || value.dataType || value.typeName || 'Object');
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

  const renderSuggestions = () => {
    if (!filtered.length) {
      suggestions.hidden = true;
      signature.textContent = 'Type a function name to see signature help.';
      return;
    }

    suggestions.innerHTML = filtered.slice(0, 8).map((item, index) => (
      `<button class="suggestion ${index === active ? 'active' : ''}" type="button" data-suggestion="${index}">` +
      `<code>${escape(functionSyntax(item))}</code><span>${escape(item.summary || '')}</span></button>`
    )).join('');
    suggestions.hidden = false;

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
      plotRelayoutBound = false;
      return;
    }

    plotUpdating = true;
    Promise.resolve(Plotly.react(plotContainer, traces, { ...layout, height: 420 }, config)).finally(() => {
      plotUpdating = false;
      bindPlotRelayout();
    });
    plotMessage.textContent = `2-D plot · ${activeEngine().label} · ${sampleCount} samples`;
  };

  const execute = () => {
    const engine = activeEngine();
    const mode = evaluateOutput.checked ? 'Evaluated' : 'Symbolic';
    error.textContent = '';
    error.hidden = true;

    if (typeof engine.root() !== 'function') {
      error.textContent = `${engine.label} is not available.`;
      error.hidden = false;
      result.textContent = 'Evaluation failed.';
      resultMeta.textContent = `${engine.label} · ${mode}`;
      selectTab('result');
      return;
    }

    const source = cleanSource(editor.value);
    if (!source) return;

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
      resultMeta.textContent = `${engine.label} · ${mode} · ${value?.constructor?.name || typeof value} · ${elapsed.toFixed(2)} ms`;
      raw.textContent = text;
      tex.textContent = latex || 'No TeX converter result available.';
      renderTree(value);
      lastExecution = { source, text, value, engineId: activeEngineId, evaluated: evaluateOutput.checked };
      selectTab('result');
      syncPlotContext();
    } catch (caught) {
      error.textContent = caught?.stack || caught?.message || String(caught);
      error.hidden = false;
      result.textContent = 'Evaluation failed.';
      resultMeta.textContent = `${engine.label} · ${mode}`;
      raw.textContent = '';
      tex.textContent = '';
      tree.replaceChildren();
      lastExecution = null;
      selectTab('result');
      syncPlotContext();
    }
  };

  const switchEngine = async () => {
    const requested = engineSelect.value;
    suggestions.hidden = true;
    engineSelect.disabled = true;
    let ready = false;

    try {
      if (requested === 'legacy') {
        setStatus('Loading Nerdamer 1.1.13…');
        await loadLegacy();
      } else if (requested === 'prime') {
        setStatus('Loading Nerdamer-Prime…');
        await loadPrime();
      }
      activeEngineId = requested;
      setStatus(`${activeEngine().label} ready`, 'ready');
      ready = true;
    } catch (caught) {
      engineSelect.value = 'v2';
      activeEngineId = 'v2';
      setStatus(`${requested === 'prime' ? 'Nerdamer-Prime' : 'Nerdamer 1.1.13'} unavailable`, 'error');
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
      plotRelayoutBound = false;
    }
    if (ready) execute();
  };

  editor.addEventListener('input', () => {
    lastExecution = null;
    updateAutocomplete();
    syncPlotContext();
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
    raw.textContent = '';
    tex.textContent = '';
    tree.replaceChildren();
    error.textContent = '';
    error.hidden = true;
    lastExecution = null;
    plotBaseXRange = null;
    syncPlotContext();
    if (globalThis.Plotly && plotContainer) {
      globalThis.Plotly.purge(plotContainer);
      plotRelayoutBound = false;
    }
  });

  examples.forEach(button => button.addEventListener('click', () => {
    editor.value = button.dataset.example || '';
    editor.focus();
    suggestions.hidden = true;
    lastExecution = null;
    execute();
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

  const params = new URLSearchParams(location.search);
  if (params.get('expr')) editor.value = params.get('expr');

  if (typeof currentNerdamer === 'function') {
    setStatus('Nerdamer 2.0 ready', 'ready');
    execute();
  } else {
    setStatus('Nerdamer 2.0 unavailable', 'error');
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
    selectEngine: async id => {
      engineSelect.value = id;
      await switchEngine();
    },
    plot: plotCurrent,
  };
})();