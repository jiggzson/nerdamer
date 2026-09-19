# Nerdamer

Nerdamer is a symbolic math library for JavaScript and TypeScript. It can parse and manipulate algebraic expressions, solve equations, work with matrices and vectors, perform calculus, and evaluate expressions numerically.

Nerdamer 2.0 is a TypeScript rewrite of the library. Everyday usage remains familiar, while the parser, solvers, numeric handling, public types, and internal architecture have been substantially reworked.

## Getting started with Nerdamer

Nerdamer 2.0 is currently available as a release candidate under the npm `next` tag:

```bash
npm install nerdamer@next
```

When Nerdamer 2.0 becomes the stable `latest` release, the normal `npm install nerdamer` command will install the 2.x line.

### Need to stay on the 1.x line?

Nerdamer 2.0 contains substantial API and behavior changes. If an existing application cannot migrate to 2.0 yet, use [Nerdamer-Prime](https://github.com/together-science/nerdamer-prime), a separately maintained continuation of the earlier Nerdamer codebase:

```bash
npm install nerdamer-prime
```

Nerdamer-Prime is maintained separately from Nerdamer 2.0 and is the appropriate option for projects that need to remain closer to the 1.x API and package structure.

In Node.js, require the package and start working with expressions:

```javascript
const nerdamer = require('nerdamer');

const e = nerdamer('x^2+2*(cos(x)+x*x)');
console.log(e.text());
// 2*cos(x)+3*x^2
```

TypeScript and ESM users can use the default import:

```typescript
import nerdamer from 'nerdamer';

console.log(nerdamer('expand((x+1)^3)').text());
```

TypeScript projects that compile to CommonJS should enable `esModuleInterop`.

### Browser use

The complete browser bundle is included in the package at `dist/bundle.js`. A standalone parser bundle is also available at `dist/parser.js`.

```html
<script src="./node_modules/nerdamer/dist/bundle.js"></script>
<script>
    const e = nerdamer('x^2+2*x+1');
    console.log(e.text());
</script>
```

## Everything is included

Nerdamer 1.x was split into the core plus add-ons such as `Algebra.js`, `Calculus.js`, `Solve.js`, and `Extra.js`. Nerdamer 2.0 includes the commonly used algebra, calculus, solving, matrix, vector, and special-function features in the main package. Additional add-on imports are no longer required.

```javascript
const nerdamer = require('nerdamer');

console.log(nerdamer.factor('x^2-1').text());
console.log(nerdamer.diff('x^3', 'x').text());
console.log(nerdamer.solve('x^2-4', 'x').text());
```

## Expressions and substitutions

As in earlier versions, calling `nerdamer(...)` parses an expression and returns a Nerdamer value.

```javascript
const e = nerdamer('x^2+2*(cos(x)+x*x)', { x: 6 });
console.log(e.text());
```

Only substitution is performed by the values object. To numerically evaluate the result, call `evaluate()`:

```javascript
const e = nerdamer('x^2+2*(cos(x)+x*x)', { x: 6 }).evaluate();
console.log(e.text());
```

Values can themselves be expressions:

```javascript
const e = nerdamer('x^2+2*(cos(x)+x*x)', { x: 'x^2+1' });
console.log(e.text());
```

Parser results are always represented by Nerdamer-native values. A scalar expression returns an `Expression`; equations, vectors, matrices, sets, collections, dictionaries, and other supported structured inputs return the corresponding Nerdamer type rather than a JavaScript-native result shape.

## Text output and term ordering

`text()` returns Nerdamer's normal symbolic representation. For example, a polynomial
may place the constant term first:

```javascript
const e = nerdamer('x^2+2*x+1');

e.text();
// 1+2*x+x^2
```

Use the per-call `sort` option when conventional display order is preferred:

```javascript
e.text({ sort: true });
// x^2+2*x+1

nerdamer('(x+1)^2').expand().text({ sort: true });
// x^2+2*x+1
```

Sorting affects only the returned string. It does not modify the expression or change the
process-wide `SORT_TERMS` setting. TypeScript users can import `TextOptions` from
`nerdamer` or `nerdamer/core`.

The full package also provides the chainable converter-based form:

```javascript
e.toText();
// x^2+2*x+1
```

Use `text({ sort: true })` when you want Nerdamer text syntax with explicit per-call
ordering control. Use `toText()` when you simply want the conventional formatted-text
representation.

## Algebra

Nerdamer can expand, factor, simplify, compute polynomial GCDs, and perform related symbolic algebra operations.

```javascript
nerdamer('expand((x+1)^4)').text();
nerdamer.factor('x^4-1').text();
nerdamer.simplify('sin(x)^2+cos(x)^2').text();
nerdamer.gcd('x^2-1', 'x^2-2*x+1').text();

const completed = nerdamer.completeSquare('x^2+6*x+1');
completed.expression.text({ sort: true });

const [substituted, substitutions] = nerdamer.uSub(
    'cos(x)^2+cos(x)+1',
    'cos(x)'
);
nerdamer.uUnSub(substituted, substitutions);
```

## Solving equations

Use `solve` for a single equation:

```javascript
const roots = nerdamer.solve('x^2-1', 'x');
console.log(roots.text());

roots.each(root => {
    console.log(root.text());
});
```

Single-variable solving returns a `SolutionSet`. System solving returns Nerdamer structures rather than the compatibility-only arrays used by older releases.

```javascript
const solutions = nerdamer.solveSystem(
    ['x+y=3', 'x-y=1'],
    ['x', 'y']
);

console.log(solutions.text());
```

## Calculus

Differentiation, integration, limits, sums, products, and transforms are available without loading a separate add-on.

```javascript
nerdamer.diff('x^3+sin(x)', 'x').text();
nerdamer.integrate('x^2', 'x').text();
nerdamer.limit('sin(x)/x', 'x', '0').text();
```

You can also use calculus functions inside expression strings:

```javascript
nerdamer('diff(x^2+2*(cos(x)+x*x),x)').text();
```

## Matrices and vectors

Matrices and vectors are supported directly by the parser and are also available as public TypeScript classes.

```javascript
const m = nerdamer('matrix([1,2],[3,4])');
console.log(m.text());

const v = nerdamer('vector(1,2,3)');
console.log(v.text());

const basis = nerdamer.nullspace(nerdamer('matrix([1,2,3],[2,4,6])'));
console.log(basis.text());
```

## Runtime functions and constants

Custom symbolic functions can be defined with Nerdamer syntax:

```javascript
nerdamer('hyp(a,b):=sqrt(a^2+b^2)');
console.log(nerdamer('hyp(3,4)').evaluate().text());
```

Or use the public function API:

```javascript
nerdamer.setFunction('line', ['x', 'm', 'b'], 'm*x+b');
console.log(nerdamer('line(2,3,4)').text());
```

Constants can be registered as well:

```javascript
nerdamer.setConstant('g', 9.81);
console.log(nerdamer('100*g').text());
```

## Nerdamer scripting

Nerdamer includes a small symbolic scripting language in addition to ordinary expression notation. It supports user-defined functions, assignments, local bindings, conditionals, loops, blocks, logical operations, `return`, `break`, `continue`, and error-handling helpers.

```javascript
const result = nerdamer('let(x,4,if(x>3,x^2,0))');
console.log(result.text());
```

Multiple statements use semicolons as statement separators:

```javascript
const result = nerdamer(`
    f(x):=x^2+1;
    f(12)
`);

console.log(result.text());
```

## Build a JavaScript function

An expression can be compiled to a JavaScript function:

```javascript
const f = nerdamer('x^2+5').buildFunction();
console.log(f(9));
// 86
```

You can specify the parameter order explicitly:

```javascript
const f = nerdamer('z+x^2+y').buildFunction(['y', 'x', 'z']);
console.log(f(9, 2, 1));
// 14
```

The chained `buildFunction()` method is available on values returned by `nerdamer(...)` so this form remains convenient in TypeScript. Only scalar `Expression` results can be compiled. If the input parses to an `Equation`, `Vector`, `Matrix`, set, or another structured result, calling `buildFunction()` throws `UnexpectedDataType` rather than compiling the contained values independently.

`buildFunction()` uses dynamic JavaScript function construction. Applications with a Content Security Policy that forbids dynamic code generation should use Nerdamer's ordinary symbolic and numeric evaluation APIs instead.

## TeX

Convert Nerdamer expressions to TeX math markup with `toTeX()` or `convertToTeX()`:

```javascript
const e = nerdamer('x^2+2*x+1');
console.log(e.toTeX());

console.log(nerdamer.convertToTeX('sqrt(x^2+1)'));
```

The legacy `convertToLaTeX()` name remains available as a deprecated compatibility alias.

Nerdamer can also parse supported LaTeX expressions:

```javascript
const e = nerdamer.convertFromLaTeX('\\frac{x^2+1}{2}');
console.log(e.text());
```

## Direct TypeScript imports

The callable `nerdamer` API remains available, but Nerdamer 2.0 also exposes public classes and functions through package subpaths:

```typescript
import { Expression, Rational, type TextOptions } from 'nerdamer/core';
import {
    Polynomial,
    completeSquare,
    gcd,
    isPrime,
    lcm,
    polyFactors,
    uSub,
    uUnSub,
} from 'nerdamer/algebra';
import { diff, integrate, limit } from 'nerdamer/calculus';
import { solve, PolynomialSolver } from 'nerdamer/solve';
import { Matrix, Vector, ValuesSet, nullspace } from 'nerdamer/structures';
```

Additional entry points are available for assumptions, selected parser APIs, advanced algorithms, and debugging tools.

## Assumptions

Nerdamer can register numeric interval assumptions for symbols. Assumptions are process-wide and are used by symbolic comparisons and simplifications that depend on sign or range information.

```typescript
import nerdamer from 'nerdamer';
import { assume, clearAssumptions } from 'nerdamer/assumptions';

assume('x > 0');

console.log(nerdamer('sqrt(x^2)').text());
// x

clearAssumptions();
```

Repeated assumptions for the same symbol are intersected. Contradictory assumptions are rejected instead of silently replacing the existing range.

## Localized error messages

Nerdamer includes localized built-in error messages for English, Spanish, French, German, Portuguese, Italian, and Dutch. Select the language through the shared parser settings:

```javascript
nerdamer.set('LANGUAGE', 'spa');

// Restore English when needed.
nerdamer.set('LANGUAGE', 'eng');
```

The language codes are `eng`, `spa`, `fra`, `deu`, `por`, `ita`, and `nld`.

## Numeric precision

Nerdamer keeps exact rational and integer arithmetic where possible. Decimal arithmetic uses Decimal.js and large integers use native `BigInt`.

```javascript
nerdamer('0.1+0.2').text();
nerdamer('sqrt(2)').evaluate().text();
```

## What changed in 2.0

Nerdamer 2.0 keeps the familiar expression-oriented API, but it is a new implementation rather than a continuation of the 1.x source tree. Important changes include:

- the old add-on loading system is gone;
- TypeScript declarations ship with the package;
- Nerdamer no longer keeps a global history of every parsed expression;
- parser-facing APIs consistently return Nerdamer-native values instead of mixing Nerdamer types with JavaScript-native result shapes;
- solver result types are explicit public structures;
- lower-level 1.x extension hooks such as `getCore()` and `register()` are not exposed in the same way;
- decimal, complex-number, parser, solver, assumptions, and set handling have been substantially revised.

If an existing project cannot move to Nerdamer 2.0 yet, use [Nerdamer-Prime](https://github.com/together-science/nerdamer-prime), which continues the earlier Nerdamer line under the `nerdamer-prime` npm package.

For the current documentation, examples, and migration information, visit [nerdamer.com](https://nerdamer.com/).

## Documentation and playground

- Website: [nerdamer.com](https://nerdamer.com/)
- Documentation: [nerdamer.com/docs](https://nerdamer.com/docs/)
- Playground: [nerdamer.com/playground](https://nerdamer.com/playground/)

## Development

Run the type checker:

```bash
npm run typecheck
```

Run the tests:

```bash
npm test
```

Build the complete package:

```bash
npm run build
```

Validate the npm package as an installed consumer:

```bash
npm run validate:package
```

The publish hook runs tests, builds the package and parser bundle, generates parser documentation data, and validates the packed npm artifact before publication.

## License

Nerdamer 2.0 is licensed under the Apache License 2.0.
