(() => {
  const suite = [
    {
      id: 'algebra',
      title: 'Algebra',
      description: 'Factor, expand, simplify, work with rational expressions, and use polynomial tools.',
      expressions: [
        'factor(x^8-1)',
        'factor(2*x^4-6*x^3-18*x^2-6*x-20)',
        'factor(cos(x)^6+3*b*cos(x)^4+3*a^2*cos(x)^4+3*b^2*cos(x)^2+6*a^2*b*cos(x)^2+3*a^4*cos(x)^2+b^3+3*a^2*b^2+3*a^4*b+a^6)',
        'factor(x^2-3*x-10)',
        'factor(-b*z-a*z+b^3+a*b^2+a*b+a^2)',
        'expand((x+1)^8)',
        'expand((3*x+4*y)^4)',
        'expand((x+y+z)^5)',
        'expand((x+5)*(x-3)-x^2)',
        'simplify((x^2-1)/(x-1))',
        'partfrac((2*x-1)/(x^2-x-6),x)',
        'partfrac((x^2+4)/(3*x^3+4*x^2-4*x),x)',
        'gcd(x^2+2*x+1,x+1)',
        'gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15,x^7+1)',
        'lcm(x^2-1,x^2-2*x+1)',
        'div(x^2+2*x+1+u,x+1)',
        'div(y^3+x*y^2+x^2*y+x^3+x,x+y)',
        'deg(4*x^7+3*x^2+x,x)',
      ],
    },
    {
      id: 'solving',
      title: 'Solving',
      description: 'Solve equations, polynomial equations, and systems.',
      expressions: [
        'solve(x^2-5*x+6,x)',
        'solve(x^3-10*x^2+31*x-30,x)',
        'solve(x^4-5*x^2+4,x)',
        'solve(x^3+1,x)',
        'solve(x^4=1,x)',
        'solve(y=m*x+c,x)',
        'solve(2*x+3=11,x)',
        'solve(x^2=2,x)',
        'solveeqs([10-x=y-11,x+2*y=20])',
        'solveeqs([x+y=10,2*x-y=5])',
      ],
    },
    {
      id: 'calculus',
      title: 'Calculus',
      description: 'Differentiate, integrate, evaluate limits, sums, products, and transforms.',
      expressions: [
        'diff(x^2,x)',
        'diff(sin(x^2),x)',
        'diff(sqrt(x)*(x^2+1),x)',
        'diff(e^x/x,x)',
        'diff(cos(x)*tan(x),x)',
        'diff(sec(sqrt(cos(x^(4/5))^2)),x)',
        'diff(x^x,x)',
        'integrate(sin(x),x)',
        'integrate(log(x),x)',
        'integrate(sqrt(x),x)',
        'integrate(x*e^x,x)',
        'integrate(x^3*log(x),x)',
        'integrate(x^2*sin(x),x)',
        'integrate(sec(a*x)^3,x)',
        'integrate(1/(a^2+x^2),x)',
        'defint(sin(x),x,0,pi)',
        'limit(sin(x)/x,x,0)',
        'limit((1+1/x)^x,x,Infinity)',
        'sum(x^2+x,x,0,10)',
        'product(x,x,1,8)',
        'laplace(sin(t),t,s)',
        'ilaplace(1/(s^2+1),s,t)',
      ],
    },
    {
      id: 'linear-algebra',
      title: 'Vectors and matrices',
      description: 'Work with vector products, matrices, identity matrices, and determinants.',
      expressions: [
        'dot([1,2,3],[5,6,7])',
        'dot([a,x,1],[b,y,2])',
        'cross([1,2,3],[5,6,7])',
        'cross([a,x,1],[b,y,2])',
        'imatrix(3)',
        'matrix([1,2],[3,4])',
        'determinant(matrix([7,1],[11,2]))',
        'determinant(matrix([1,2,3],[0,4,5],[1,0,6]))',
        'determinant(matrix([1,2,3,4],[5,6,7,8],[2,6,4,8],[3,1,1,2]))',
      ],
    },
    {
      id: 'complex',
      title: 'Complex numbers',
      description: 'Work with real and imaginary parts, arguments, conjugates, and polar forms.',
      expressions: [
        'realpart(3+4*i)',
        'imagpart(3+4*i)',
        'conjugate(3+4*i)',
        'arg(1+i)',
        'polarform(3+4*i)',
        'rectform(5*e^(i*pi/3))',
        'abs(3+4*i)',
        'sqrt(-16)',
        '(1+i)^8',
      ],
    },
    {
      id: 'functions',
      title: 'Math and special functions',
      description: 'Try exact arithmetic and a range of mathematical and special functions.',
      expressions: [
        'sqrt(72)',
        'log(e^5)',
        'gamma(7)',
        'gamma(1/2)',
        'erf(1)',
        'hypot(3,4)',
        'factorial(20)',
        'modinv(3,11)',
        'fib(30)',
        'isprime(104729)',
        'sinc(pi/2)',
        'Si(2)',
        'Ei(1)',
      ],
    },
    {
      id: 'scripting',
      title: 'Nerdamer Scripting',
      description: 'Use assignments, reusable functions, and multi-step input.',
      expressions: [
        'block(x:5,y:8,x*y)',
        'block(a:3,b:a^2+1,b)',
        'f(x):=x^2+1;\nf(12)',
      ],
    },
  ];

  const runButton = document.getElementById('showcase-run');
  const status = document.getElementById('showcase-status');
  const summary = document.getElementById('showcase-summary');
  const categories = document.getElementById('showcase-categories');
  const environment = document.getElementById('showcase-environment');
  const totalExpressions = suite.reduce((total, section) => total + section.expressions.length, 0);

  const nerdamer = () => globalThis.nerdamer;
  const temml = () => globalThis.temml;
  const formatMs = value => `${value.toFixed(value < 10 ? 2 : 1)} ms`;
  const expressionHref = expression => `/playground/?expr=${encodeURIComponent(expression)}`;
  const errorText = error => error?.message || String(error);
  const resetNerdamerState = n => {
    if (typeof n?.clearVars === 'function') n.clearVars();
  };

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const rows = new Map();
  const categoryStats = new Map();

  const renderSuite = () => {
    const fragment = document.createDocumentFragment();
    suite.forEach(section => {
      const wrapper = make('section', 'showcase-category');
      wrapper.id = `showcase-${section.id}`;

      const heading = make('div', 'showcase-category-heading');
      const copy = make('div');
      copy.append(make('h2', '', section.title), make('p', '', section.description));
      const timing = make('span', 'showcase-category-time', 'Not run yet');
      categoryStats.set(section.id, timing);
      heading.append(copy, timing);
      wrapper.append(heading);

      const tableWrap = make('div', 'showcase-table-wrap');
      const table = make('table', 'showcase-table');
      const thead = make('thead');
      const headerRow = make('tr');
      ['Expression', 'Result', 'Nerdamer', 'TeX', 'Display'].forEach(label => headerRow.append(make('th', '', label)));
      thead.append(headerRow);
      table.append(thead);
      const tbody = make('tbody');

      section.expressions.forEach((expression, index) => {
        const key = `${section.id}:${index}`;
        const tr = make('tr');
        const expressionCell = make('td', 'showcase-expression');
        const expressionCode = make('code', '', expression);
        const tryLink = make('a', 'showcase-try', 'Try in Playground →');
        tryLink.href = expressionHref(expression);
        expressionCell.append(expressionCode, tryLink);

        const resultCell = make('td', 'showcase-result');
        const mathResult = make('div', 'showcase-math', '—');
        const resultIssue = make('div', 'showcase-result-issue');
        resultIssue.hidden = true;

        const rawDetails = make('details', 'showcase-result-source');
        const rawSummary = make('summary', '', 'Raw result');
        const rawCode = make('code', '', '—');
        rawDetails.append(rawSummary, rawCode);

        const texDetails = make('details', 'showcase-result-source');
        const texSummary = make('summary', '', 'TeX source');
        const texCode = make('code', '', '—');
        texDetails.append(texSummary, texCode);
        resultCell.append(mathResult, resultIssue, rawDetails, texDetails);

        const evalCell = make('td', 'showcase-time', '—');
        const texCell = make('td', 'showcase-time', '—');
        const renderCell = make('td', 'showcase-time', '—');
        tr.append(expressionCell, resultCell, evalCell, texCell, renderCell);
        tbody.append(tr);
        rows.set(key, { tr, mathResult, resultIssue, rawCode, texCode, evalCell, texCell, renderCell });
      });

      table.append(tbody);
      tableWrap.append(table);
      wrapper.append(tableWrap);
      fragment.append(wrapper);
    });
    categories.replaceChildren(fragment);
  };

  const resetRows = () => {
    for (const row of rows.values()) {
      row.tr.classList.remove('showcase-error', 'showcase-output-issue');
      row.mathResult.replaceChildren();
      row.mathResult.textContent = 'Running…';
      row.resultIssue.textContent = '';
      row.resultIssue.hidden = true;
      row.rawCode.textContent = '—';
      row.texCode.textContent = '—';
      row.evalCell.textContent = '—';
      row.texCell.textContent = '—';
      row.renderCell.textContent = '—';
      row.renderCell.removeAttribute('title');
    }
    for (const timing of categoryStats.values()) timing.textContent = 'Running…';
  };

  const runSuite = async () => {
    const n = nerdamer();
    const renderer = temml();
    if (typeof n !== 'function') {
      status.textContent = 'Nerdamer unavailable';
      status.classList.add('error');
      return;
    }

    const rendererAvailable = typeof renderer?.render === 'function';
    runButton.disabled = true;
    runButton.textContent = 'Running…';
    status.textContent = `Running ${totalExpressions} examples`;
    status.classList.remove('error', 'warning', 'ready');
    summary.classList.add('running');
    resetRows();
    resetNerdamerState(n);

    let evaluationTotal = 0;
    let texTotal = 0;
    let renderTotal = 0;
    let evaluationFailures = 0;
    let texFailures = 0;
    let renderFailures = 0;

    // Let the page display the running state before starting the examples.
    await new Promise(resolve => requestAnimationFrame(() => resolve()));

    for (const section of suite) {
      let categoryEvaluation = 0;
      let categoryTex = 0;
      let categoryRender = 0;
      let categoryEvaluationFailures = 0;
      let categoryTexFailures = 0;
      let categoryRenderFailures = 0;

      for (let index = 0; index < section.expressions.length; index++) {
        const expression = section.expressions[index];
        const row = rows.get(`${section.id}:${index}`);
        let value;
        let text = '';
        let latex = '';
        let evaluationTime = 0;
        let texTime = 0;
        let renderTime = 0;
        let evaluationSucceeded = false;

        const evaluationStart = performance.now();
        try {
          value = n(expression);
          evaluationSucceeded = true;
          text = typeof value?.text === 'function' ? value.text() : String(value);
          row.rawCode.textContent = text;
        } catch (error) {
          evaluationFailures++;
          categoryEvaluationFailures++;
          row.tr.classList.add('showcase-error');
          row.mathResult.textContent = errorText(error);
          row.resultIssue.hidden = false;
          row.resultIssue.textContent = 'Nerdamer could not evaluate this example.';
        }
        evaluationTime = performance.now() - evaluationStart;

        if (evaluationSucceeded) {
          const texStart = performance.now();
          try {
            if (typeof n.pretty === 'function') latex = n.pretty(value, 'TeX');
            else if (typeof value?.toTeX === 'function') latex = value.toTeX();
            row.texCode.textContent = latex || 'No TeX output';
          } catch (error) {
            texFailures++;
            categoryTexFailures++;
            row.tr.classList.add('showcase-output-issue');
            row.mathResult.textContent = text;
            row.resultIssue.hidden = false;
            row.resultIssue.textContent = `TeX conversion failed: ${errorText(error)}`;
            row.texCode.textContent = errorText(error);
          }
          texTime = performance.now() - texStart;

          if (latex) {
            if (rendererAvailable) {
              const renderStart = performance.now();
              try {
                row.mathResult.replaceChildren();
                renderer.render(latex, row.mathResult, { displayMode: true, throwOnError: true });
              } catch (error) {
                renderFailures++;
                categoryRenderFailures++;
                row.tr.classList.add('showcase-output-issue');
                row.mathResult.textContent = text;
                row.resultIssue.hidden = false;
                row.resultIssue.textContent = `Display failed: ${errorText(error)}`;
                row.renderCell.title = errorText(error);
              }
              renderTime = performance.now() - renderStart;
            } else {
              row.mathResult.textContent = text;
              row.renderCell.textContent = 'Unavailable';
            }
          }
        }

        evaluationTotal += evaluationTime;
        texTotal += texTime;
        renderTotal += renderTime;
        categoryEvaluation += evaluationTime;
        categoryTex += texTime;
        categoryRender += renderTime;
        row.evalCell.textContent = formatMs(evaluationTime);
        row.texCell.textContent = evaluationSucceeded ? formatMs(texTime) : '—';
        if (rendererAvailable && evaluationSucceeded && latex) row.renderCell.textContent = formatMs(renderTime);
      }

      const issueParts = [];
      if (categoryEvaluationFailures) issueParts.push(`${categoryEvaluationFailures} Nerdamer issue${categoryEvaluationFailures === 1 ? '' : 's'}`);
      if (categoryTexFailures) issueParts.push(`${categoryTexFailures} TeX issue${categoryTexFailures === 1 ? '' : 's'}`);
      if (categoryRenderFailures) issueParts.push(`${categoryRenderFailures} display issue${categoryRenderFailures === 1 ? '' : 's'}`);
      const issueText = issueParts.length ? ` · ${issueParts.join(' · ')}` : '';
      const timing = categoryStats.get(section.id);
      timing.textContent = `${section.expressions.length} examples · ${formatMs(categoryEvaluation)} Nerdamer · ${formatMs(categoryTex)} TeX · ${formatMs(categoryRender)} display${issueText}`;
    }

    resetNerdamerState(n);

    const outputIssues = texFailures + renderFailures;
    document.getElementById('showcase-expression-count').textContent = String(totalExpressions);
    document.getElementById('showcase-eval-time').textContent = formatMs(evaluationTotal);
    document.getElementById('showcase-tex-time').textContent = formatMs(texTotal);
    document.getElementById('showcase-render-time').textContent = rendererAvailable ? formatMs(renderTotal) : 'Unavailable';
    document.getElementById('showcase-issues').textContent = `${evaluationFailures} Nerdamer · ${texFailures} TeX · ${renderFailures} display`;

    if (evaluationFailures) {
      status.textContent = `Finished with ${evaluationFailures} Nerdamer issue${evaluationFailures === 1 ? '' : 's'}`;
      status.classList.add('error');
    } else if (!rendererAvailable) {
      status.textContent = 'Finished · math display unavailable';
      status.classList.add('warning');
    } else if (outputIssues) {
      status.textContent = `Finished with ${outputIssues} display issue${outputIssues === 1 ? '' : 's'}`;
      status.classList.add('warning');
    } else {
      status.textContent = 'Finished';
      status.classList.add('ready');
    }

    summary.classList.remove('running');
    runButton.disabled = false;
    runButton.textContent = 'Run again';
  };

  renderSuite();
  const nerdamerVersion = nerdamer()?.version ? ` ${nerdamer().version}` : '';
  const temmlVersion = temml()?.version ? ` · Temml ${temml().version}` : '';
  environment.textContent = `Nerdamer${nerdamerVersion}${temmlVersion}`;
  runButton.addEventListener('click', runSuite);

  if (typeof nerdamer() === 'function') runSuite();
  else {
    status.textContent = 'Nerdamer unavailable';
    status.classList.add('error');
    runButton.disabled = true;
  }
})();
