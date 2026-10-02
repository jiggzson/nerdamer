# Nerdamer

Nerdamer is a symbolic mathematics library and computer algebra system for JavaScript and TypeScript.

Nerdamer 2.0 is a TypeScript rewrite of Nerdamer. The familiar string-based API remains available, while the package also exposes typed modules for direct use of the symbolic engine, algebra, calculus, solving, structures, assumptions, parser APIs, and advanced algorithms.

This branch prepares `2.0.0`.

## Install

```bash
npm install nerdamer
```

Nerdamer 2.0 is published under npm's `latest` tag.

## Quick start

```javascript
const nerdamer = require('nerdamer');

const expression = nerdamer('x^2+2*(cos(x)+x*x)');
console.log(expression.text());
// 2*cos(x)+3*x^2
```

TypeScript:

```typescript
import nerdamer from 'nerdamer';

const expression = nerdamer('(x+1)^3').expand();
console.log(expression.text({ sort: true }));
// x^3+3*x^2+3*x+1
```

TypeScript projects compiling to CommonJS should enable `esModuleInterop`.

## Full package and parser package

The normal `nerdamer` entry point assembles the complete CAS. It registers the parser/core and math functions together with algebra, calculus, and solving.

```javascript
const nerdamer = require('nerdamer');

nerdamer.factor('x^2-1').text();
nerdamer.diff('x^3', 'x').text();
nerdamer.solve('x^2-4', 'x').text();
```

Nerdamer 2.0 also has a separate parser entry point. It contains the symbolic parser, scripting, assumptions, structures, complex and polynomial operations, and general math functions without loading the higher-level algebra, calculus, and solver domains.

```typescript
import { Parser } from 'nerdamer/parser';

const expression = Parser.parse('sqrt(x^2+1)');
console.log(expression.text());
```

This separation is also reflected in the browser builds:

- `dist/bundle.js` — complete Nerdamer package;
- `dist/parser.js` — parser-focused browser bundle.

```html
<script src="./node_modules/nerdamer/dist/bundle.js"></script>
<script>
    console.log(nerdamer('factor(x^2-1)').text());
</script>
```

The parser bundle exposes `nerdamerParser` rather than the complete `nerdamer` API.

## Package entry points

The npm package exports the complete callable API plus typed module entry points:

```typescript
import nerdamer from 'nerdamer';
import { Expression, Rational, type TextOptions } from 'nerdamer/core';
import { Polynomial, gcd, lcm, partfrac } from 'nerdamer/algebra';
import { diff, integrate, limit } from 'nerdamer/calculus';
import { solve, PolynomialSolver } from 'nerdamer/solve';
import { Matrix, Vector, ValuesSet } from 'nerdamer/structures';
import { assume, clearAssumptions } from 'nerdamer/assumptions';
import { Parser } from 'nerdamer/parser';
```

Additional supported entry points are `nerdamer/advanced` and `nerdamer/debug`.

## Parser results

`nerdamer(...)` returns the Nerdamer entity represented by the input. Scalar symbolic input normally returns an `Expression`; equations and structured notation can return `Equation`, `Vector`, `Matrix`, `Collection`, `ValuesSet`, or `Dictionary`.

```javascript
const scalar = nerdamer('x^2+1');
const equation = nerdamer('x^2=1');
const vector = nerdamer('[x, y, 3]');
```

This is intentional. Nerdamer 2.0 does not wrap every parser result in a compatibility `Expression` object.

## Substitution and evaluation

Values supplied to `nerdamer(...)` are substitutions. They do not imply numerical evaluation.

```javascript
const substituted = nerdamer('x^2+cos(x)', { x: 6 });
const evaluated = substituted.evaluate();
```

Values can themselves be symbolic expressions:

```javascript
nerdamer('x^2+1', { x: 'y+1' }).text();
```

## Text and TeX output

`text()` returns Nerdamer notation. Term ordering can be requested per call:

```javascript
const expression = nerdamer('x^2+2*x+1');

expression.text();
// 1+2*x+x^2

expression.text({ sort: true });
// x^2+2*x+1
```

The full package also supplies `toText()` and TeX conversion:

```javascript
expression.toText();
expression.toTeX();
nerdamer.convertToTeX('sqrt(x^2+1)');
nerdamer.convertFromLaTeX('\\frac{x^2+1}{2}');
```

`convertToLaTeX()` remains as a deprecated compatibility alias.

Scientific formatting can be requested through `text()` without changing the underlying expression:

```javascript
nerdamer('1200').text({ scientific: 4 });
// 1.200e3
```

## Algebra

```javascript
nerdamer.expand('(x+1)^4').text();
nerdamer.factor('x^4-1').text();
nerdamer.simplify('sin(x)^2+cos(x)^2').text();
nerdamer.gcd('x^2-1', 'x^2-2*x+1').text();
nerdamer.partfrac('1/(x^2-1)', 'x').text();
```

The 2.0 algebra implementation includes the rewritten polynomial GCD/factorization path, partial fractions, polynomial solving support, and direct polynomial APIs.

Prime factorization has two explicit forms:

```javascript
nerdamer.pfactor(100).text();
// [2,2,5,5]

nerdamer.pfactord(100).text();
// {2=>2,5=>2}
```

## Calculus

```javascript
nerdamer.diff('x^3+sin(x)', 'x').text();
nerdamer.integrate('x^2', 'x').text();
nerdamer.limit('sin(x)/x', 'x', '0').text();
nerdamer.laplace('t', 't', 's').text();
```

The same functions can be used in Nerdamer notation:

```javascript
nerdamer('diff(x^3,x)').text();
```

## Solving

Single-variable solving returns a `SolutionSet`:

```javascript
const roots = nerdamer.solve('x^2-1', 'x');
console.log(roots.text());
```

System solving returns Nerdamer structures rather than legacy JavaScript arrays:

```javascript
const solutions = nerdamer.solveSystem(
    ['x+y=3', 'x-y=1'],
    ['x', 'y']
);

console.log(solutions.text());
```

The legacy `solveeqs` name is retained as the compatibility alias for system solving. `solveEquations` is not part of the 2.0 public API.

## Matrices, vectors, sets, and dictionaries

Structured values are first-class parser entities:

```javascript
nerdamer('matrix([1,2],[3,4])').text();
nerdamer('[1,x,3]').text();
nerdamer('{1,2,x}').text();
```

The corresponding TypeScript classes are exported from `nerdamer/structures`.

## Scripting

Nerdamer notation includes a symbolic scripting layer with assignments, user functions, local bindings, conditionals, loops, blocks, logical operations, `return`, `break`, `continue`, and error-handling helpers.

```javascript
const result = nerdamer(`
    f(x):=x^2+1;
    f(12)
`);

console.log(result.text());
```

Control-flow operations that intentionally produce no mathematical value use an internal null signal. That signal is distinct from legitimate values such as an empty vector and is not exposed as a normal parser entity.

## Runtime functions, constants, and settings

```javascript
nerdamer.setFunction('line', ['x', 'm', 'b'], 'm*x+b');
nerdamer.setConstant('g', 9.81);
nerdamer.setVar('a', 5);
```

Settings remain shared by the package instance:

```javascript
nerdamer.set('LANGUAGE', 'spa');
nerdamer.set('LANGUAGE', 'eng');
```

Built-in error messages are available in English, Spanish, French, German, Portuguese, Italian, and Dutch.

## Assumptions

```typescript
import nerdamer from 'nerdamer';
import { assume, clearAssumptions } from 'nerdamer/assumptions';

assume('x > 0');
console.log(nerdamer('sqrt(x^2)').text());
// x
clearAssumptions();
```

Repeated assumptions for a symbol are intersected. Contradictory assumptions are rejected.

## Building JavaScript functions

Scalar expressions can be compiled to native JavaScript-number functions:

```javascript
const f = nerdamer('x^2+5').buildFunction();
console.log(f(9));
// 86
```

`buildFunction()` uses dynamic JavaScript function construction. Applications whose Content Security Policy blocks dynamic code generation should use Nerdamer's symbolic or numeric evaluation APIs instead. Structured parser results cannot be compiled as scalar functions.

## Numeric behavior

Nerdamer preserves exact integer and rational arithmetic where possible. Large integers use native `BigInt`; decimal arithmetic uses Decimal.js. Complex arithmetic is represented by Nerdamer's numeric types rather than JavaScript's native `Number` alone.

```javascript
nerdamer('0.1+0.2').text();
nerdamer('sqrt(2)').evaluate().text();
```

## Building from source

Install dependencies and run the normal checks:

```bash
npm install
npm run typecheck
npm test
```

Build the complete package:

```bash
npm run build
```

Build the parser-only browser bundle:

```bash
npm run build:parser
```

Browser bundles include English by default. Additional error-message catalogs can be selected with a comma-separated language list:

```bash
npx webpack --mode=production --env target=full --env language=spa,fra
```

The supported codes are `eng`, `spa`, `fra`, `deu`, `por`, `ita`, and `nld`. English is always available. The first selected non-English language becomes active when the bundle loads; the remaining selected catalogs are available for runtime switching. Duplicate codes are ignored. Use `--env language=all` to include every translated catalog. `all` cannot be combined with individual language codes.

Before publishing, the package runs type checking, tests, coverage, both browser builds, parser documentation generation, TypeDoc validation, and packed-package validation through `prepublishOnly`.

## Migrating from Nerdamer 1.x

Nerdamer 2.0 keeps much of the familiar expression-oriented API, but it is a new implementation. Important migration areas include:

- the old `Algebra`, `Calculus`, `Solve`, and `Extra` side-effect imports are replaced by the complete package and supported module entry points;
- the third and fourth arguments to `nerdamer(...)` are gone;
- global parsed-expression history is gone;
- parser results can be structured Nerdamer entities instead of always being wrapped in a compatibility `Expression`;
- system-solving results use `Vector`/`Dictionary` structures;
- lower-level 1.x extension hooks such as `getCore()` and `register()` are not restored;
- several compatibility functions were restored explicitly rather than by exposing every parser function on the root object;
- internal numeric, parser, solver, polynomial, assumptions, set, and scripting implementations have changed substantially.

See [BREAKING_CHANGES.md](BREAKING_CHANGES.md) and [Moving from Nerdamer 1.x to 2.0](docs/MIGRATING_FROM_1X.md) before upgrading an existing application.

## Documentation

- Website: https://nerdamer.com/
- Documentation: https://nerdamer.com/documentation
- Migration guide: `docs/MIGRATING_FROM_1X.md`
- 2.0 release notes: `docs/RELEASE_NOTES_2.md`
- Parser conventions: `docs/PARSER_CONVENTIONS.md`
- Source repository: https://github.com/jiggzson/nerdamer
- Issues: https://github.com/jiggzson/nerdamer/issues

## License

Nerdamer 2.0 is licensed under the Apache License 2.0.
