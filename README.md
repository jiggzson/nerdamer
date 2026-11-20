# Nerdamer

Nerdamer is a computer algebra system for JavaScript and TypeScript. It factors, simplifies, differentiates, integrates and solves symbolic expressions, and works with vectors, matrices and sets, in Node.js or in the browser.

```bash
npm install nerdamer
```

## Quick start

```javascript
const nerdamer = require('nerdamer');

nerdamer('x^2+2*(cos(x)+x*x)').text();
// 3*x^2+2*cos(x)
```

TypeScript:

```typescript
import nerdamer from 'nerdamer';

nerdamer('(x+1)^3').expand().text({ sort: true });
// x^3+3*x^2+3*x+1
```

Types are included. If your TypeScript project compiles to CommonJS, enable `esModuleInterop`.

In the browser:

```html
<script src="./node_modules/nerdamer/dist/bundle.js"></script>
<script>
	console.log(nerdamer('factor(x^2-1)').text()); // (1+x)*(-1+x)
</script>
```

The string you pass to `nerdamer` is Nerdamer Notation: mathematics, not JavaScript. Most functions are also methods on `nerdamer`, so `nerdamer.factor('x^2-1')` gives the same result as `nerdamer('factor(x^2-1)')`.

## A short tour

### Algebra

```javascript
nerdamer('(x+1)^4').expand().text();                  // 1+4*x+6*x^2+4*x^3+x^4
nerdamer.factor('x^4-1').text();                      // (1+x)*(-1+x)*(1+x^2)
nerdamer.simplify('sin(x)^2+cos(x)^2').text();        // 1
nerdamer.gcd('x^2-1', 'x^2-2*x+1').text();            // -1+x
nerdamer.partfrac('1/(x^2-1)', 'x').text();           // (-1/2)*(1+x)^-1+(1/2)*(-1+x)^-1
nerdamer.pfactor(100).text();                         // [2, 2, 5, 5]
```

### Calculus

```javascript
nerdamer.diff('x^3+sin(x)', 'x').text();              // 3*x^2+cos(x)
nerdamer.integrate('x^2', 'x').text();                // (1/3)*x^3
nerdamer.limit('sin(x)/x', 'x', '0').text();          // 1
nerdamer.laplace('t', 't', 's').text();               // s^-2
```

### Solving

```javascript
nerdamer.solve('x^3-1', 'x').text();
// {1, (1/2)*(-1+3^(1/2)*i), (1/2)*(-1-3^(1/2)*i)}

nerdamer.solve('x^2+y^2-1', 'x').text();
// {(1/2)*(4-4*y^2)^(1/2), (-1/2)*(4-4*y^2)^(1/2)}

nerdamer.solveSystem(['x+y=3', 'x-y=1'], ['x', 'y']).text();
// [{x => 2, y => 1}]
```

A periodic equation returns every solution, with `_n` standing for any integer. List the ones you need:

```javascript
nerdamer.solve('sin(x)', 'x').text();
// {_n*pi}

nerdamer.solve('sin(x)', 'x').generate({ interval: [-10, 10] }).text();
// {-3*pi, -2*pi, -pi, 0, pi, 2*pi, 3*pi}
```

### Vectors, matrices and sets

```javascript
nerdamer('determinant(matrix([1,2],[3,4]))').text();  // -2
nerdamer('cross([1,0,0],[0,1,0])').text();            // [0, 0, 1]
nerdamer('{1,2,x,2}').text();                         // {1, 2, x}
```

### Scripting

Define functions, assign values, and use conditions and loops inside the string:

```javascript
nerdamer(`
    f(x):=x^2+1;
    f(12)
`).text();
// 145
```

### Assumptions

Tell Nerdamer that a variable lies in a range, and comparisons and simplifications use it:

```javascript
nerdamer('assume(x>=3); sqrt((x-3)^2)').text();       // -3+x
nerdamer('forget(all)');
```

Assumptions apply to every later calculation until you remove them.

### Output and evaluation

```javascript
const expression = nerdamer('x^2+2*x+1');

expression.text();                  // 1+2*x+x^2
expression.text({ sort: true });    // x^2+2*x+1
expression.toTeX();                 // x^{2}+2 \cdot x+1

nerdamer('sqrt(2)').evaluate().text();               // 1.4142135623730950488
nerdamer('x^2+cos(x)', { x: 6 }).evaluate().text();  // 36.960170286650366021

const f = nerdamer('x^2+5').buildFunction();
f(9);                               // 86
```

`buildFunction()` creates a JavaScript function at run time. If your Content Security Policy forbids that, use `evaluate()` instead.

Results stay exact where possible: integers of any size, fractions, and roots. Decimals use as many digits as the `PRECISION` setting (20 by default).

### Using another library's functions

`connect` lets Nerdamer use numerical functions from a library such as Math.js, while keeping expressions exact:

```javascript
nerdamer.connect(['squareplusone'], { squareplusone: x => x * x + 1 });

nerdamer('squareplusone(x)').text();                       // squareplusone(x)
nerdamer('squareplusone(x)').evaluate({ x: 2 }).text();    // 5
```

## Importing parts of Nerdamer

`import nerdamer from 'nerdamer'` gives you everything. You can also import functions, classes and types by area:

```typescript
import { Expression, Rational, type TextOptions } from 'nerdamer/core';
import { Polynomial, gcd, lcm, partfrac } from 'nerdamer/algebra';
import { diff, integrate, limit } from 'nerdamer/calculus';
import { solve, PolynomialSolver } from 'nerdamer/solve';
import { Matrix, Vector, ValuesSet } from 'nerdamer/structures';
import { assume, clearAssumptions } from 'nerdamer/assumptions';
import { mean, median } from 'nerdamer/statistics';
import { erf, gamma } from 'nerdamer/special';
import { TRIG } from 'nerdamer/constants';
import { Parser } from 'nerdamer/parser';
```

`nerdamer/advanced` and `nerdamer/debug` complete the list.

`nerdamer/parser` is a smaller package: Notation and Scripting, assumptions, vectors, matrices and sets, polynomial and complex operations, and the general math functions, but not algebra, calculus or solving. In the browser it is `dist/parser.js`, which defines `nerdamerParser` instead of `nerdamer`.

## Coming from Nerdamer 1.x

Nerdamer 2 is a rewrite in TypeScript. Everyday code mostly works, but there are no add-ons to load, `nerdamer(...)` takes two arguments, results keep their type (a vector stays a vector), and system solving returns dictionaries instead of arrays. It needs Node.js 18 or newer, or a browser with `BigInt`.

See [Migrating from Nerdamer 1.x](BREAKING_CHANGES.md). If you need the old behavior for now, [Nerdamer-Prime](https://github.com/together-science/nerdamer-prime) is a maintained fork of 1.x.

## Documentation

- Documentation: https://nerdamer.com/docs/
- Playground: https://nerdamer.com/playground/
- Release notes: [RELEASE_NOTES.md](RELEASE_NOTES.md), also at https://nerdamer.com/docs/releases/
- Guides: [assumptions](https://nerdamer.com/docs/guides/assumptions/), [sets and solution sets](https://nerdamer.com/docs/guides/sets/), [warnings](https://nerdamer.com/docs/guides/warnings/), [connecting numerical functions](https://nerdamer.com/docs/guides/connecting-functions/), [reserved names](https://nerdamer.com/docs/guides/reserved-names/)
- Issues: https://github.com/jiggzson/nerdamer/issues

## Contributing

```bash
npm install
npm test
npm run typecheck
```

See the [contributing guidelines](https://github.com/jiggzson/nerdamer/tree/master/contributing) for build instructions, error-message languages, and style guides.

## License

Apache License 2.0.
