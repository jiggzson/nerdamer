(() => {
  const editor = document.getElementById('editor');
  const layer = document.getElementById('editor-highlight');
  const code = document.getElementById('editor-highlight-code');
  if (!editor || !layer || !code) return;

  const controlFlow = new Set(['block', 'break', 'continue', 'for', 'if', 'return', 'while']);
  const keywords = new Set(['else', 'let']);
  const constants = new Set(['e', 'E', 'i', 'pi', 'PI', 'Inf', 'Infinity', 'true', 'false']);
  const functionNames = new Set();
  const escape = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const token = (type, value) => `<span class="token ${type}">${escape(value)}</span>`;

  const highlight = source => {
    let output = '';
    let index = 0;

    while (index < source.length) {
      const char = source[index];
      const next = source[index + 1];

      if (char === '/' && next === '/') {
        let end = source.indexOf('\n', index);
        if (end < 0) end = source.length;
        output += token('comment', source.slice(index, end));
        index = end;
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        let end = index + 1;
        while (end < source.length) {
          if (source[end] === '\\') {
            end += 2;
            continue;
          }
          if (source[end] === quote) {
            end++;
            break;
          }
          end++;
        }
        output += token('string', source.slice(index, end));
        index = end;
        continue;
      }

      if (/\d/.test(char) || (char === '.' && /\d/.test(next || ''))) {
        const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
        if (match) {
          output += token('number', match[0]);
          index += match[0].length;
          continue;
        }
      }

      if (/[A-Za-z_]/.test(char)) {
        const match = source.slice(index).match(/^[A-Za-z_]\w*/);
        const word = match[0];
        let probe = index + word.length;
        while (/\s/.test(source[probe] || '')) probe++;

        let type = 'variable';
        if (controlFlow.has(word)) type = 'control';
        else if (keywords.has(word)) type = 'keyword';
        else if (constants.has(word)) type = 'constant';
        else if (functionNames.has(word) || source[probe] === '(') type = 'function';

        output += token(type, word);
        index += word.length;
        continue;
      }

      if (/[+\-*\/%^=<>!&|?:]/.test(char)) {
        const match = source.slice(index).match(/^(?:&&|\|\||==|!=|<=|>=|:=|\+\+|--|\+=|-=|\*=|\/=|.)/);
        output += token('operator', match[0]);
        index += match[0].length;
        continue;
      }

      if (/[()[\]{},.;]/.test(char)) {
        output += token('punctuation', char);
        index++;
        continue;
      }

      output += escape(char);
      index++;
    }

    return output;
  };

  const syncScroll = () => {
    layer.scrollTop = editor.scrollTop;
    layer.scrollLeft = editor.scrollLeft;
  };

  const render = () => {
    const source = editor.value;
    code.innerHTML = highlight(source) + (source.endsWith('\n') ? ' ' : '');
    editor.closest('.editor-wrap')?.classList.add('syntax-highlighted');
    syncScroll();
  };

  const renderAfterCurrentEvent = () => requestAnimationFrame(render);

  editor.addEventListener('input', render);
  editor.addEventListener('scroll', syncScroll, { passive: true });
  window.addEventListener('resize', syncScroll, { passive: true });

  document.addEventListener('click', event => {
    if (event.target.closest('#clear, [data-example]')) renderAfterCurrentEvent();
  });
  document.addEventListener('mousedown', event => {
    if (event.target.closest('[data-suggestion]')) renderAfterCurrentEvent();
  });

  fetch('/data/parser-functions.json')
    .then(response => response.json())
    .then(data => {
      const functions = Array.isArray(data) ? data : data?.functions;
      if (!Array.isArray(functions)) return;
      functions.forEach(item => {
        if (item?.name) functionNames.add(String(item.name));
      });
      render();
    })
    .catch(() => {});

  render();
})();
