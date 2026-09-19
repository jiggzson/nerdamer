(() => {
  const runtime = globalThis.nerdamer;
  const engineSelect = document.getElementById('engine-select');
  const source = document.querySelector('.playground-source');
  const signature = source?.querySelector('.signature-bar');
  const result = document.getElementById('result');
  const resultMeta = document.getElementById('result-meta');

  if (typeof runtime !== 'function' || !engineSelect || !source || !signature || !result || !resultMeta) return;

  const sessionBar = document.createElement('div');
  sessionBar.className = 'playground-session-bar';
  sessionBar.hidden = true;
  sessionBar.innerHTML = `
    <div class="playground-session-label">Session variables</div>
    <div class="playground-session-vars" aria-live="polite"></div>
    <button class="playground-session-clear" type="button">Clear all</button>
  `;
  signature.insertAdjacentElement('afterend', sessionBar);

  const evaluator = document.createElement('section');
  evaluator.className = 'result-evaluator';
  evaluator.hidden = true;
  evaluator.innerHTML = `
    <div class="result-evaluator-head">
      <strong>Evaluate result</strong>
      <span>Temporary values only; session variables are unchanged.</span>
    </div>
    <form class="result-evaluator-form">
      <div class="result-evaluator-fields"></div>
      <button class="btn btn-quiet result-evaluator-run" type="submit">Evaluate</button>
    </form>
    <div class="result-evaluator-output" aria-live="polite" hidden></div>
  `;
  resultMeta.insertAdjacentElement('afterend', evaluator);

  const sessionVars = sessionBar.querySelector('.playground-session-vars');
  const clearSession = sessionBar.querySelector('.playground-session-clear');
  const evaluatorForm = evaluator.querySelector('.result-evaluator-form');
  const evaluatorFields = evaluator.querySelector('.result-evaluator-fields');
  const evaluatorOutput = evaluator.querySelector('.result-evaluator-output');

  const usingV2 = () => engineSelect.value === 'v2';

  const knownValues = () => {
    if (!usingV2() || typeof runtime.getVars !== 'function') return {};
    try {
      const values = runtime.getVars('text') || {};
      if (Object.prototype.hasOwnProperty.call(values, 'undefined')) {
        if (typeof runtime.setVar === 'function') runtime.setVar('undefined', 'delete');
        delete values.undefined;
      }
      return values;
    } catch {
      return {};
    }
  };

  const displayedResultText = () => result.textContent?.trim() || '';

  const parseDisplayedResult = () => {
    const text = displayedResultText();
    if (!text || text === 'Ready.' || text === 'Evaluation failed.') return null;

    try {
      return runtime(text);
    } catch {
      return null;
    }
  };

  const resultVariables = value => {
    if (!value || typeof value.variables !== 'function') return [];
    try {
      const variables = value.variables();
      return Array.isArray(variables) ? [...new Set(variables.map(String))] : [];
    } catch {
      return [];
    }
  };

  const refreshSession = () => {
    const entries = Object.entries(knownValues());
    sessionBar.hidden = !usingV2() || entries.length === 0;
    sessionVars.replaceChildren();

    for (const [name, value] of entries) {
      const chip = document.createElement('span');
      chip.className = 'playground-session-chip';

      const text = document.createElement('span');
      text.className = 'playground-session-value';
      text.innerHTML = `<code>${name}</code><span>=</span><code>${value}</code>`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'playground-session-remove';
      remove.dataset.sessionVar = name;
      remove.setAttribute('aria-label', `Remove ${name} from session variables`);
      remove.textContent = '×';

      chip.append(text, remove);
      sessionVars.append(chip);
    }
  };

  const refreshEvaluator = () => {
    const value = usingV2() ? parseDisplayedResult() : null;
    const variables = resultVariables(value);
    const text = displayedResultText();
    const isNumericResult = text !== '' && Number.isFinite(Number(text));
    const canEvaluate = value && typeof value.evaluate === 'function' && (variables.length > 0 || !isNumericResult);
    evaluator.hidden = !canEvaluate;
    evaluatorFields.replaceChildren();
    evaluatorOutput.hidden = true;
    evaluatorOutput.textContent = '';

    if (!canEvaluate) return;

    for (const name of variables) {
      const label = document.createElement('label');
      label.className = 'result-evaluator-field';
      label.innerHTML = `<span>${name}</span>`;

      const input = document.createElement('input');
      input.type = 'text';
      input.name = name;
      input.placeholder = 'value';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', `Value for ${name}`);
      label.append(input);
      evaluatorFields.append(label);
    }
  };

  const refresh = () => {
    refreshSession();
    refreshEvaluator();
  };

  sessionBar.addEventListener('click', event => {
    const remove = event.target.closest('[data-session-var]');
    if (!remove || typeof runtime.setVar !== 'function') return;
    runtime.setVar(remove.dataset.sessionVar, 'delete');
    refresh();
  });

  clearSession.addEventListener('click', () => {
    if (typeof runtime.clearVars !== 'function') return;
    runtime.clearVars();
    refresh();
  });

  evaluatorForm.addEventListener('submit', event => {
    event.preventDefault();
    const value = parseDisplayedResult();
    if (!value || typeof value.evaluate !== 'function') return;

    const values = {};
    for (const input of evaluatorFields.querySelectorAll('input[name]')) {
      const inputValue = input.value.trim();
      if (inputValue) values[input.name] = inputValue;
    }

    try {
      const evaluated = Object.keys(values).length ? value.evaluate(values) : value.evaluate();
      const text = typeof evaluated?.text === 'function' ? evaluated.text() : String(evaluated);
      evaluatorOutput.textContent = text;
      evaluatorOutput.hidden = false;
    } catch (caught) {
      evaluatorOutput.textContent = caught?.message || String(caught);
      evaluatorOutput.hidden = false;
    }
  });

  engineSelect.addEventListener('change', () => queueMicrotask(refresh));

  const observer = new MutationObserver(() => queueMicrotask(refresh));
  observer.observe(result, { childList: true, subtree: true, characterData: true });
  observer.observe(resultMeta, { childList: true, subtree: true, characterData: true });

  refresh();
})();