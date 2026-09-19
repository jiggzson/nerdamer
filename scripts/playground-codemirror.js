(() => {
  const source = document.getElementById('editor');
  const suggestions = document.getElementById('suggestions');
  const indentSize = document.getElementById('editor-indent-size');
  const CodeMirror = globalThis.CodeMirror;

  if (!source || !CodeMirror) return;

  const indentStorageKey = 'nerdamer-playground-indent-size';
  const allowedIndentSizes = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);
  const constants = new Set(['pi', 'PI', 'e', 'E', 'i', 'Infinity', 'Inf']);
  const scriptingFallback = new Set([
    'and', 'block', 'break', 'continue', 'for', 'if', 'iferror', 'iserror',
    'let', 'not', 'or', 'return', 'while', 'xor',
  ]);
  let functionNames = new Set();
  let scriptingNames = new Set(scriptingFallback);
  let editor = null;

  const configuredIndentSize = () => {
    const value = indentSize?.value || '4';
    return allowedIndentSizes.has(value) ? Number(value) : 4;
  };

  if (indentSize) {
    try {
      const saved = localStorage.getItem(indentStorageKey);
      if (allowedIndentSizes.has(saved)) indentSize.value = saved;
    } catch {}
  }

  CodeMirror.defineMode('nerdamer', () => ({
    token(stream) {
      if (stream.eatSpace()) return null;
      if (stream.match(/^\/\/.*$/)) return 'comment';

      const quote = stream.peek();
      if (quote === '"' || quote === "'") {
        stream.next();
        let escaped = false;
        while (!stream.eol()) {
          const character = stream.next();
          if (character === quote && !escaped) break;
          escaped = character === '\\' && !escaped;
          if (character !== '\\') escaped = false;
        }
        return 'string';
      }

      if (stream.match(/^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/)) return 'number';

      if (stream.match(/^[A-Za-z_]\w*/)) {
        const word = stream.current();
        if (constants.has(word)) return 'atom';
        if (scriptingNames.has(word)) return 'keyword';
        if (functionNames.has(word) || /^\s*\(/.test(stream.string.slice(stream.pos))) return 'builtin';
        return 'variable';
      }

      if (stream.match(/^(?:&&|\|\||==|!=|<=|>=|:=|\+\+|--|\+=|-=|\*=|\/=|[+\-*\/%^=<>!&|?:])/)) return 'operator';
      if (stream.match(/^[()[\]{},;]/)) return 'bracket';

      stream.next();
      return null;
    },
  }));

  const keydownListeners = [];
  const clickListeners = [];
  const nativeAddEventListener = source.addEventListener.bind(source);
  const nativeRemoveEventListener = source.removeEventListener.bind(source);

  source.addEventListener = (type, listener, options) => {
    if (type === 'keydown') {
      keydownListeners.push(listener);
      return;
    }
    if (type === 'click') {
      clickListeners.push(listener);
      return;
    }
    nativeAddEventListener(type, listener, options);
  };

  source.removeEventListener = (type, listener, options) => {
    const listeners = type === 'keydown' ? keydownListeners : type === 'click' ? clickListeners : null;
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
      return;
    }
    nativeRemoveEventListener(type, listener, options);
  };

  const invoke = (listener, event) => {
    if (typeof listener === 'function') listener.call(source, event);
    else listener?.handleEvent?.(event);
  };

  const indentSelection = instance => {
    if (instance.somethingSelected()) {
      instance.execCommand('indentMore');
      return;
    }
    instance.replaceSelection(' '.repeat(configuredIndentSize()), 'end', '+input');
  };

  editor = CodeMirror.fromTextArea(source, {
    mode: 'nerdamer',
    lineWrapping: true,
    indentUnit: configuredIndentSize(),
    tabSize: configuredIndentSize(),
    indentWithTabs: false,
    smartIndent: false,
    autoCloseBrackets: true,
    matchBrackets: true,
    extraKeys: {
      Tab: instance => indentSelection(instance),
      'Shift-Tab': 'indentLess',
      Enter: 'newlineAndIndent',
    },
  });

  const wrapper = editor.getWrapperElement();
  wrapper.classList.add('nerdamer-editor');
  wrapper.CodeMirror = editor;
  source.CodeMirror = editor;
  editor.getInputField().setAttribute('aria-label', source.getAttribute('aria-label') || 'Nerdamer expression or script');

  // Keep the original textarea as a non-interactive compatibility layer for the
  // existing Playground API while CodeMirror owns all visible editing behavior.
  source.style.display = 'block';
  source.style.position = 'absolute';
  source.style.inset = '0';
  source.style.width = '100%';
  source.style.height = '100%';
  source.style.opacity = '0';
  source.style.pointerEvents = 'none';
  source.style.zIndex = '-1';
  source.setAttribute('aria-hidden', 'true');
  source.tabIndex = -1;

  const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  Object.defineProperty(source, 'value', {
    configurable: true,
    get: () => editor.getValue(),
    set: value => {
      const next = String(value ?? '');
      if (editor.getValue() !== next) editor.setValue(next);
      nativeValue?.set?.call(source, next);
    },
  });
  Object.defineProperty(source, 'selectionStart', {
    configurable: true,
    get: () => editor.indexFromPos(editor.getCursor('from')),
  });
  Object.defineProperty(source, 'selectionEnd', {
    configurable: true,
    get: () => editor.indexFromPos(editor.getCursor('to')),
  });

  source.setSelectionRange = (start, end = start) => {
    editor.setSelection(editor.posFromIndex(start), editor.posFromIndex(end));
  };
  source.setRangeText = (replacement, start, end, selectionMode = 'preserve') => {
    const insert = String(replacement ?? '');
    editor.replaceRange(insert, editor.posFromIndex(start), editor.posFromIndex(end), '+input');
    const insertedEnd = start + insert.length;

    if (selectionMode === 'select') source.setSelectionRange(start, insertedEnd);
    else if (selectionMode === 'start') source.setSelectionRange(start, start);
    else if (selectionMode === 'end') source.setSelectionRange(insertedEnd, insertedEnd);
  };
  source.focus = () => editor.focus();

  source.setFunctionCatalog = entries => {
    const list = Array.isArray(entries) ? entries : [];
    functionNames = new Set(list.map(entry => String(entry?.name || '')).filter(Boolean));
    scriptingNames = new Set([
      ...scriptingFallback,
      ...list.filter(entry => entry?.usage === 'scripting').map(entry => String(entry.name)),
    ]);
    editor.setOption('mode', { name: 'nerdamer', revision: Date.now() });
  };

  editor.on('change', () => {
    nativeValue?.set?.call(source, editor.getValue());
    source.dispatchEvent(new Event('input', { bubbles: true }));
  });
  editor.on('cursorActivity', () => {
    const event = new Event('click');
    clickListeners.forEach(listener => invoke(listener, event));
  });
  editor.on('keydown', (_instance, event) => {
    keydownListeners.forEach(listener => invoke(listener, event));
  });

  if (indentSize) {
    indentSize.addEventListener('change', () => {
      if (!allowedIndentSizes.has(indentSize.value)) indentSize.value = '4';
      const size = configuredIndentSize();
      editor.setOption('indentUnit', size);
      editor.setOption('tabSize', size);
      try { localStorage.setItem(indentStorageKey, indentSize.value); } catch {}
    });
  }

  fetch('/data/parser-functions.json')
    .then(response => response.json())
    .then(data => source.setFunctionCatalog(Array.isArray(data) ? data : data?.functions))
    .catch(() => source.setFunctionCatalog([]));

  globalThis.__nerdamerCodeMirror = editor;
})();
