# Nerdamer

Nerdamer is a symbolic mathematics library and computer algebra system for JavaScript and TypeScript.

Nerdamer 2.0 is a TypeScript rewrite of Nerdamer. The familiar string-based API remains available, while the package also exposes typed modules for direct use of the symbolic engine, algebra, calculus, solving, structures, assumptions, parser APIs, and advanced algorithms.

## Install

```bash
npm install nerdamer@latest
```

If your project depends heavily on the older API, [Nerdamer-Prime](https://github.com/together-science/nerdamer-prime), a fork of the original Nerdamer, may be a better choice for now.

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

For Node.js, import `nerdamer` to load the complete package. The Nerdamer 1.x
`nerdamer/all.min` subpath is not a Nerdamer 2.0 entry point. It's not
needed to access algebra, calculus, or solving, and should not be added to
TypeScript declarations as an untyped module. CommonJS and TypeScript examples
above both use the package root, which supplies type declarations.

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
import { mean, median } from 'nerdamer/statistics';
import { erf, gamma } from 'nerdamer/special';
import { TRIG } from 'nerdamer/constants';
```

Additional supported entry points are `nerdamer/advanced`, `nerdamer/debug`, `nerdamer/statistics`, `nerdamer/special`, and `nerdamer/constants`.

## Parser results

`nerdamer(...)` returns the Nerdamer entity represented by the input. Scalar symbolic input normally returns an `Expression`; equations and structured notation can return `Equation`, `Vector`, `Matrix`, `Collection`, `ValuesSet`, or `Dictionary`.

```javascript
const expression = nerdamer('x^2+1');
const equation = nerdamer('x^2=1');
const vector = nerdamer('[x, y, 3]');
```

Nerdamer 2.0 does not wrap every parser result in a compatibility `Expression` object.

## Substitution and evaluation

Values supplied to `nerdamer(...)` are substitutions. They don't imply numerical evaluation.

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

The 2.0 algebra implementation includes the rewritten polynomial GCD/factorization path, partial fractions, polynomial solving support, and direct polynomial APIs. More recent work improves symbolic simplification and supports exact GCDs for certain complex-coefficient polynomials.

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

Solving a single expression or equation returns a `SolutionSet`:

```javascript
const roots = nerdamer.solve('x^2-1', 'x');
console.log(roots.text());
```

Solving a system of equations returns a `Vector` of `Dictionary` objects instead of the native JavaScript `Array` returned in previous versions.

```javascript
const solutions = nerdamer.solveSystem(['x+y=3', 'x-y=1'], ['x', 'y']);

console.log(solutions.text());
```

`solveEquations` was the legacy name for system solving. Nerdamer 2.0 uses `solveeqs` for the parser-style name and `solveSystem()` for direct JavaScript and TypeScript use.

Trigonometric solutions can be represented as indexed families, preserving every integer-indexed root instead of restricting results to a fixed interval. System solving can also find exact intersections of such families:

```javascript
nerdamer.solve('sin(x)', 'x').text();
// {_n*pi}

// Generate a finite set
const finite = nerdamer.solve('sin(x)', 'x').generate({ interval: [-10, 10] });
// {-3*pi, -2*pi, -pi, 0, pi, 2*pi, 3*pi}

nerdamer.solve('x^3-1', 'x').text();
// {1, (1/2)*(-1+3^(1/2)*i), (1/2)*(-1-3^(1/2)*i)}

nerdamer.solve('x^2+y^2-1', 'x').text()
// {(1/2)*(4-4*y^2)^(1/2), (-1/2)*(4-4*y^2)^(1/2)}
```


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

Control-flow operations that produce no mathematical value use an internal null signal. That signal is distinct from legitimate values such as an empty vector and is not exposed as a normal parser entity.

## Function categories

Nerdamer provides named groups for recognizing families of mathematical functions:

```typescript
import { Expression } from 'nerdamer/core';
import { TRIG, INVERSE_TRIG } from 'nerdamer/constants';

Expression.create('sin(x)').isFunction(TRIG); // true
Expression.create('asin(x)').isFunction(INVERSE_TRIG); // true
```

Other groups cover hyperbolic, statistical, number-theoretic, and special functions.

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

Assumptions let Nerdamer reason about expressions when variables have known bounds or relationships. They support sign-sensitive simplification, exact comparisons, and some solving decisions. Multiple bounds for a variable are intersected, and contradictions are rejected.

```typescript
import nerdamer from 'nerdamer';
import { assume, clearAssumptions, getAssumptionFor } from 'nerdamer/assumptions';

assume('x >= 3');
assume('x < 10');
getAssumptionFor('x')?.toString(); // "[3, 10)"

nerdamer('x-3').gte(0); // true
nerdamer('sqrt((x-3)^2)').eq('x-3'); // true
clearAssumptions();
```

Relationships between variables can also establish new bounds:

```typescript
import { Parser } from 'nerdamer/parser';

Parser.parse('assume(x<y+1)');
Parser.parse('assume(y<=3)');
nerdamer('x').lt(4); // true
clearAssumptions();
```

Assumptions are shared across the Nerdamer instance; clear them when they should no longer influence later calculations.

## Connecting numerical functions

Nerdamer can connect numerical functions supplied by another JavaScript object or mathematics library. Nerdamer keeps ordinary expressions symbolic and uses the connected implementation during numerical evaluation or when compiling a scalar expression.

```javascript
nerdamer.connect(['squareplusone'], {
    squareplusone: x => x * x + 1
});

nerdamer('squareplusone(x)').text();
// squareplusone(x)

nerdamer('squareplusone(x)').evaluate({ x: 2 }).text();
// 5
```

The provider can be a plain object, as above, or an already-loaded library such as Math.js (`mathjs`):

```typescript
import nerdamer from 'nerdamer';
import * as math from 'mathjs';

nerdamer.connect(['combinations'], math);
nerdamer('combinations(5,2)').evaluate().text(); // 10
```

Math.js is used as an example. The connector also supports numerical functions from other compatible JavaScript libraries.

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

Recent numerical additions include rounding to a specified number of significant figures:

```javascript
nerdamer('significant(12345,3)').text();
// 12300
```

## Building from source

Install dependencies and run the normal checks:

```bash
npm install
npm test
npm run typecheck
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
- internal numeric, parser, solver, polynomial, assumptions, set, and scripting implementations have changed substantially;
- Nerdamer 2.0 uses native JavaScript `BigInt` for large-integer arithmetic, so it requires an environment with `BigInt` support; some older browsers and JavaScript runtimes don't support it.

See [Breaking changes in Nerdamer 2.0](https://github.com/jiggzson/nerdamer/blob/master/BREAKING_CHANGES.md) for important compatibility differences before upgrading an existing application. Applications that need the older behavior can continue using [Nerdamer-Prime](https://github.com/together-science/nerdamer-prime).

## Documentation

- Website: https://nerdamer.com/
- Documentation: https://nerdamer.com/documentation
- Source repository: https://github.com/jiggzson/nerdamer
- Issues: https://github.com/jiggzson/nerdamer/issues

## License

Nerdamer 2.0 is licensed under the Apache License 2.0.
