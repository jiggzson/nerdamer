(() => {
  const enableSelectionStyling = () => {
    const wrapper = document.querySelector('.CodeMirror');
    const editor = wrapper?.CodeMirror;

    if (!editor) return false;

    editor.setOption('styleSelectedText', 'CodeMirror-selectedtext');
    return true;
  };

  if (!enableSelectionStyling()) {
    const interval = window.setInterval(() => {
      if (enableSelectionStyling()) window.clearInterval(interval);
    }, 25);

    window.setTimeout(() => window.clearInterval(interval), 2000);
  }
})();
