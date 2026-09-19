(() => {
  const editor = document.getElementById('editor');
  const suggestions = document.getElementById('suggestions');
  const indentSize = document.getElementById('editor-indent-size');

  if (!editor) return;

  const indentStorageKey = 'nerdamer-playground-indent-size';
  const allowedIndentSizes = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);

  if (indentSize) {
    try {
      const saved = localStorage.getItem(indentStorageKey);
      if (allowedIndentSizes.has(saved)) indentSize.value = saved;
    } catch {}

    indentSize.addEventListener('change', () => {
      if (!allowedIndentSizes.has(indentSize.value)) indentSize.value = '4';
      try { localStorage.setItem(indentStorageKey, indentSize.value); } catch {}
    });
  }

  const dispatchInput = () => {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const indentation = () => ' '.repeat(Number(indentSize?.value) || 4);

  const selectedLineRange = () => {
    const value = editor.value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const from = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const effectiveEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
    const nextBreak = value.indexOf('\n', effectiveEnd);
    const to = nextBreak === -1 ? value.length : nextBreak;
    return { value, start, end, from, to };
  };

  const indent = () => {
    const { value, start, end, from, to } = selectedLineRange();
    const prefix = indentation();

    if (start === end) {
      editor.setRangeText(prefix, start, end, 'end');
      dispatchInput();
      return;
    }

    const indented = value
      .slice(from, to)
      .split('\n')
      .map(line => `${prefix}${line}`)
      .join('\n');

    editor.setRangeText(indented, from, to, 'select');
    editor.setSelectionRange(from, from + indented.length);
    dispatchInput();
  };

  const unindent = () => {
    const { value, start, end, from, to } = selectedLineRange();
    const width = indentation().length;
    const lines = value.slice(from, to).split('\n');
    const trimmed = lines.map(line => {
      if (line.startsWith('\t')) return line.slice(1);
      const leadingSpaces = line.match(/^ +/)?.[0].length || 0;
      return line.slice(Math.min(width, leadingSpaces));
    });
    const replacement = trimmed.join('\n');

    if (replacement === value.slice(from, to)) return;

    editor.setRangeText(replacement, from, to, 'select');

    if (start === end) {
      const removed = lines[0].length - trimmed[0].length;
      const column = start - from;
      const cursor = start - Math.min(removed, column);
      editor.setSelectionRange(cursor, cursor);
    } else {
      editor.setSelectionRange(from, from + replacement.length);
    }

    dispatchInput();
  };

  editor.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;

    const autocompleteOwnsTab = !event.shiftKey
      && suggestions
      && !suggestions.hidden
      && suggestions.querySelector('[data-suggestion]');
    if (autocompleteOwnsTab) return;

    event.preventDefault();
    if (event.shiftKey) unindent();
    else indent();
  }, true);
})();
