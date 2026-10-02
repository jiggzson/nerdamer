(() => {
  document.querySelectorAll('pre.api-example').forEach(pre => {
    pre.classList.add('codeblock');

    if (pre.closest('.code-example')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-example';
    const button = document.createElement('button');
    button.className = 'code-copy';
    button.type = 'button';
    button.dataset.copyCode = '';
    button.setAttribute('aria-label', 'Copy API example');
    button.textContent = 'Copy';

    pre.before(wrapper);
    wrapper.append(button, pre);
  });

  document.querySelectorAll('pre.codeblock .token.comment').forEach(comment => {
    const text = comment.textContent || '';
    if (text.endsWith('\n')) comment.textContent = text.slice(0, -1);
  });

  const fallbackCopy = text => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  };

  const copyText = async text => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {}
    }

    return fallbackCopy(text);
  };

  document.querySelectorAll('[data-copy-code]').forEach(button => {
    if (button.dataset.copyBound === 'true') return;
    button.dataset.copyBound = 'true';

    button.addEventListener('click', async () => {
      const code = button.closest('.code-example')?.querySelector('pre code');
      if (!code) return;

      const copied = await copyText(code.textContent || '');
      if (!copied) return;

      button.textContent = 'Copied';
      button.classList.add('copied');
      window.setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('copied');
      }, 1600);
    });
  });
})();
